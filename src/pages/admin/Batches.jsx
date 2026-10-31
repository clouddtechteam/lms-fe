import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getBatches, createBatch, deleteBatch, importBatches, getBatchDetails } from '../../api/batches.js';
import { getMeetByBatch, createOrUpdateMeet, getCronConfig, updateCronConfig, triggerCronNow } from '../../api/meet.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';
import * as xlsx from 'xlsx';
import '../../admin-unified.css';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCronModal, setShowCronModal] = useState(false);
  const [cronConfig, setCronConfig] = useState({
    enabled: false,
    scheduleType: 'daily',
    refreshIntervalDays: 1,
    runTime: '02:00',
    runDays: [1, 2, 3, 4, 5],
    scope: 'all',
    linkMode: 'single_shared',
    batchIds: [],
    lastRunResults: []
  });
  const [cronLoading, setCronLoading] = useState(false);
  const [cronSyncing, setCronSyncing] = useState(false);
  const [formData, setFormData] = useState({ name: '', startTime: '09:00', endTime: '18:00', weekdays: [] });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [meetData, setMeetData] = useState({ meetingNumber: '', password: '', joinUrl: '', status: 'scheduled' });
  const [batchDetails, setBatchDetails] = useState({ students: [], trainers: [] });

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const displayTime = (t) => {
    if (!t) return '';
    if (typeof t === 'string' && t.includes('GMT')) {
      const m = t.match(/\b\d{2}:\d{2}\b/);
      if (m) return m[0];
    }
    return t;
  };

  useEffect(() => {
    const init = async () => {
      try {
        setFetchLoading(true);
        await fetchBatches();
      } catch (err) {
        console.error(err);
      } finally {
        setFetchLoading(false);
      }
    };
    init();
  }, []);

  const fetchBatches = async () => {
    const data = await getBatches();
    if (Array.isArray(data)) setBatches(data);
  };

  const handleOpenCronModal = async () => {
    setShowCronModal(true);
    setCronLoading(true);
    try {
      const cfg = await getCronConfig();
      if (cfg) {
        setCronConfig({
          enabled: !!cfg.enabled,
          scheduleType: cfg.scheduleType || 'daily',
          refreshIntervalDays: cfg.refreshIntervalDays || 1,
          runTime: cfg.runTime || '02:00',
          runDays: Array.isArray(cfg.runDays) ? cfg.runDays : [1, 2, 3, 4, 5],
          scope: cfg.scope || 'all',
          linkMode: cfg.linkMode || 'single_shared',
          batchIds: Array.isArray(cfg.batchIds) ? cfg.batchIds : [],
          lastRunAt: cfg.lastRunAt,
          lastRunStatus: cfg.lastRunStatus,
          lastRunSummary: cfg.lastRunSummary,
          lastRunResults: Array.isArray(cfg.lastRunResults) ? cfg.lastRunResults : []
        });
      }
    } catch (err) {
      console.error('Error fetching cron config:', err);
    } finally {
      setCronLoading(false);
    }
  };

  const handleSaveCronConfig = async () => {
    setCronLoading(true);
    try {
      const cleanBatchIds = (cronConfig.batchIds || []).map(b => b._id || b);
      await updateCronConfig({ ...cronConfig, batchIds: cleanBatchIds });
      setToastMsg('Zoom automation settings saved!');
      setTimeout(() => setToastMsg(''), 3000);
      setShowCronModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save cron configuration');
    } finally {
      setCronLoading(false);
    }
  };

  const handleTriggerCronNow = async () => {
    const cleanBatchIds = (cronConfig.batchIds || []).map(b => b._id || b);
    if (cronConfig.scope === 'selective' && cleanBatchIds.length === 0) {
      alert('Please select at least one batch under "Selective Batches" before generating.');
      return;
    }

    if (!window.confirm(`Generate fresh Zoom meeting links for ${cronConfig.scope === 'selective' ? `${cleanBatchIds.length} selected` : 'all'} batches right now?`)) return;

    setCronSyncing(true);
    try {
      // 1. Auto save config state first
      await updateCronConfig({ ...cronConfig, batchIds: cleanBatchIds });

      // 2. Trigger instant generation for target batches (bypasses day of week)
      const targetIds = cronConfig.scope === 'selective' ? cleanBatchIds : null;
      const res = await triggerCronNow(targetIds);

      setToastMsg(res.results?.summary || 'Meeting generation completed!');
      setTimeout(() => setToastMsg(''), 4000);

      // 3. Update modal with fresh generated links
      const freshResults = res.results?.details || [];
      setCronConfig(prev => ({
        ...prev,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: res.results?.failed === 0 ? 'success' : (res.results?.successful > 0 ? 'partial' : 'failed'),
        lastRunSummary: res.results?.summary || '',
        lastRunResults: freshResults
      }));

      // 4. Refresh background batches list
      fetchBatches();
    } catch (err) {
      alert(err.message || 'Sync failed');
    } finally {
      setCronSyncing(false);
    }
  };

  const copyMeetingInvite = (batch, meet) => {
    const meetingNumber = meet?.meetingNumber || 'N/A';
    const password = meet?.password || 'N/A';
    const joinUrl = meet?.joinUrl || `https://us02web.zoom.us/j/${String(meetingNumber).replace(/\s/g, '')}?pwd=${password}`;
    
    const text = `📚 Batch: ${batch?.name || 'Class'}
🕐 Time: ${batch?.startTime || ''} - ${batch?.endTime || ''}
🔗 Direct Zoom Link: ${joinUrl}
🆔 Meeting ID: ${meetingNumber}
🔑 Passcode: ${password}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setToastMsg('Meeting details copied to clipboard!');
      setTimeout(() => setToastMsg(''), 3000);
    } else {
      alert(text);
    }
  };

  const handleBatchClick = async (batch) => {
    setSelectedBatch(batch);
    setDetailsLoading(true);
    try {
      // 1. Fetch Meet Details
      const meetRes = await getMeetByBatch(batch._id);
      const meet = Array.isArray(meetRes) ? meetRes[0] : meetRes;
      
      if (meet) {
        setMeetData({
          meetingNumber: meet.meetingNumber || '',
          password: meet.password || '',
          joinUrl: meet.joinUrl || '',
          status: meet.status || 'scheduled'
        });
      } else {
        setMeetData({ meetingNumber: '', password: '', joinUrl: '', status: 'scheduled' });
      }

      // 2. Fetch Batch Details (Students/Trainers)
      const details = await getBatchDetails(batch._id);
      if (details) {
        setBatchDetails({ 
          students: details.students || [], 
          trainers: details.trainers || [] 
        });
      }
    } catch (err) {
      console.error('Error fetching details:', err);
      setMeetData({ meetingNumber: '', password: '', joinUrl: '', status: 'scheduled' });
      setBatchDetails({ students: [], trainers: [] });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveMeet = async () => {
    setLoading(true);
    try {
      await createOrUpdateMeet({
        batchId: selectedBatch._id,
        meetingNumber: meetData.meetingNumber,
        password: meetData.password,
        joinUrl: meetData.joinUrl,
        status: meetData.status
      });
      setToastMsg('Meeting credentials updated!');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await createBatch(formData);
    setLoading(false);
    if (!res.message || !res.error) {
      setShowModal(false);
      setFormData({ name: '', startTime: '09:00', endTime: '18:00', weekdays: [] });
      fetchBatches();
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete batch?')) {
      await deleteBatch(id);
      if (selectedBatch?._id === id) setSelectedBatch(null);
      fetchBatches();
    }
  };

  const handleDownloadTemplate = () => {
    const data = [
      {
        "batchId": "B-001",
        "name": "Full Stack Dev - Mornings",
        "startTime": "09:00",
        "endTime": "17:00",
        "weekdays": "1,2,3,4,5"
      }
    ];
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Batches Template");
    xlsx.writeFile(workbook, "batch_import_template.xlsx");
  };

  return (
    <DashboardLayout title="Batches">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>Batches ({batches.length})</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="lms-btn lms-btn-outline" onClick={handleOpenCronModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Automate Zoom
          </button>
          <button className="lms-btn lms-btn-outline" onClick={handleDownloadTemplate}>Download Template</button>
          <button className="lms-btn lms-btn-outline" onClick={() => document.getElementById('bt-excel').click()}>Import Excel</button>
          <input type="file" id="bt-excel" hidden accept=".xlsx,.xls" onChange={e => { if(e.target.files[0]) setImportFile(e.target.files[0]); e.target.value=null; }} />
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ Add Batch</button>
        </div>
      </div>

      <div className="lms-page-container">
        {fetchLoading ? (
          <div className="lms-loading-container">
            <div className="lms-spinner-large" />
            <div style={{ marginTop: '12px' }}>Loading batches...</div>
          </div>
        ) : (
          <>
            <div className="lms-table-section">
              <table className="lms-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Batch Name</th>
                    <th>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, idx) => (
                    <tr key={b._id} onClick={() => handleBatchClick(b)} className={selectedBatch?._id === b._id ? 'selected' : ''}>
                      <td style={{ color: '#94a3b8' }}>#{b.batchId || (idx + 1)}</td>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span className="lms-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                            {displayTime(b.startTime)} - {displayTime(b.endTime)}
                          </span>
                          {b.weekdays && b.weekdays.map(d => (
                            <span key={d} className="lms-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>
                              {DAYS[d]}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`lms-details-panel ${selectedBatch ? 'open' : ''}`}>
              {detailsLoading ? (
                <div className="lms-loading-container" style={{ padding: '80px 20px' }}>
                  <div className="lms-spinner-large" />
                  <div style={{ fontWeight: 600, color: '#64748b' }}>Loading batch & meet details...</div>
                </div>
              ) : selectedBatch && (
                <>
                  <div className="panel-title">
                    {selectedBatch.name}
                    <button className="lms-btn" onClick={() => setSelectedBatch(null)}>&times;</button>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '10px' }}>
                      Timing: <strong>{displayTime(selectedBatch.startTime)} - {displayTime(selectedBatch.endTime)}</strong>
                    </div>
                    {selectedBatch.weekdays && selectedBatch.weekdays.length > 0 && (
                      <div style={{ marginBottom: '20px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {selectedBatch.weekdays.map(d => (
                          <span key={d} className="lms-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                            {DAYS[d]}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="panel-label">Meeting Credentials</span>
                    <div className="lms-form-group">
                      <label>Zoom Meeting ID</label>
                      <input className="lms-input" value={meetData.meetingNumber} onChange={e => setMeetData({...meetData, meetingNumber: e.target.value})} />
                    </div>
                    <div className="lms-form-group">
                      <label>Password</label>
                      <input className="lms-input" value={meetData.password} onChange={e => setMeetData({...meetData, password: e.target.value})} />
                    </div>
                    <div className="lms-form-group">
                      <label>Direct Join Link (Optional)</label>
                      <input className="lms-input" placeholder="https://zoom.us/j/..." value={meetData.joinUrl} onChange={e => setMeetData({...meetData, joinUrl: e.target.value})} />
                    </div>
                    <div className="lms-form-group">
                      <label>Status</label>
                      <select className="lms-input" value={meetData.status} onChange={e => setMeetData({...meetData, status: e.target.value})}>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button className="lms-btn lms-btn-primary" style={{ flex: 1 }} onClick={handleSaveMeet} disabled={loading}>
                        Save Details
                      </button>
                      {meetData.meetingNumber && (
                        <button 
                          type="button" 
                          className="lms-copy-btn" 
                          onClick={() => copyMeetingInvite(selectedBatch, meetData)}
                          title="Copy shareable invite"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          Copy
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <span className="panel-label">Assigned Trainers ({batchDetails.trainers.length})</span>
                    {batchDetails.trainers.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        {batchDetails.trainers.map(t => (
                          <div key={t._id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                            <div style={{ color: '#64748b' }}>{t.email}</div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="panel-empty" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No trainers assigned</div>}
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <span className="panel-label">Enrolled Students ({batchDetails.students.length})</span>
                    {batchDetails.students.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        {batchDetails.students.map(s => (
                          <div key={s._id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ color: '#64748b' }}>{s.enrollmentNo || 'No ID'} | {s.phone || 'No Phone'}</div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="panel-empty" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No students enrolled</div>}
                  </div>

                  <button className="lms-btn lms-btn-danger" style={{ width: '100%', marginTop: 'auto' }} onClick={() => handleDelete(selectedBatch._id)}>Delete Batch</button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Automate Zoom (Cron) Modal ── */}
      {showCronModal && (
        <div className="lms-modal-overlay" onClick={() => setShowCronModal(false)}>
          <div className="lms-modal" style={{ width: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Automated Zoom Meeting Scheduler
              </h3>
              <button className="lms-btn" onClick={() => setShowCronModal(false)}>&times;</button>
            </div>

            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Automatically generate fresh Zoom links and update meeting IDs/passwords without logging into Zoom.
            </p>

            {cronLoading ? (
              <div className="lms-loading-container" style={{ padding: '40px 0' }}>
                <div className="lms-spinner-large" />
                <div>Loading automation settings...</div>
              </div>
            ) : (
              <div>
                {/* Enable Switch */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>Cron Auto-Generation</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Create fresh links on the scheduled days and times</div>
                  </div>
                  <label className="lms-switch">
                    <input 
                      type="checkbox" 
                      checked={cronConfig.enabled} 
                      onChange={e => setCronConfig({...cronConfig, enabled: e.target.checked})} 
                    />
                    <span className="lms-slider"></span>
                  </label>
                </div>

                {/* Refresh Recurrence / Frequency */}
                <div className="lms-form-group">
                  <label>Refresh Frequency (Interval)</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#475569' }}>Refresh every</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="30" 
                        className="lms-input" 
                        style={{ width: '70px', padding: '6px 10px', marginBottom: 0 }}
                        value={cronConfig.refreshIntervalDays || 1} 
                        onChange={e => setCronConfig({...cronConfig, refreshIntervalDays: Math.max(1, parseInt(e.target.value) || 1), scheduleType: 'interval'})} 
                      />
                      <span style={{ fontSize: '0.85rem', color: '#475569' }}>day(s)</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 7].map(days => (
                        <button
                          key={days}
                          type="button"
                          className={`lms-btn ${(cronConfig.refreshIntervalDays || 1) === days ? 'lms-btn-primary' : 'lms-btn-outline'}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => setCronConfig({...cronConfig, refreshIntervalDays: days, scheduleType: 'interval'})}
                        >
                          {days === 1 ? 'Daily (1 Day)' : days === 7 ? 'Weekly (7 Days)' : `Every ${days} Days`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daily Execution Time */}
                <div className="lms-form-group">
                  <label>Run Time (IST - Asia/Kolkata)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="time" 
                      className="lms-input" 
                      style={{ marginBottom: 0, width: '140px' }}
                      value={cronConfig.runTime || '02:00'} 
                      onChange={e => setCronConfig({...cronConfig, runTime: e.target.value})} 
                    />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Indian Standard Time. Scheduled at <strong>02:00 AM IST</strong> (runs automatically on Render).
                    </span>
                  </div>
                </div>

                {/* Days of Week */}
                <div className="lms-form-group">
                  <label>Active Days</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {DAYS.map((d, idx) => {
                      const isActive = cronConfig.runDays.includes(idx);
                      return (
                        <label 
                          key={d} 
                          style={{ 
                            padding: '6px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid', 
                            cursor: 'pointer', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            background: isActive ? '#eff6ff' : '#f8fafc', 
                            borderColor: isActive ? '#2563eb' : '#e2e8f0', 
                            color: isActive ? '#1d4ed8' : '#64748b' 
                          }}
                        >
                          <input 
                            type="checkbox" 
                            hidden 
                            checked={isActive} 
                            onChange={e => {
                              const newDays = e.target.checked 
                                ? [...cronConfig.runDays, idx].sort() 
                                : cronConfig.runDays.filter(x => x !== idx);
                              setCronConfig({...cronConfig, runDays: newDays});
                            }} 
                          />
                          {d}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Batch Scope */}
                <div className="lms-form-group">
                  <label>Target Batches</label>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input 
                        type="radio" 
                        name="cronScope" 
                        checked={cronConfig.scope === 'all'} 
                        onChange={() => setCronConfig({...cronConfig, scope: 'all'})} 
                      />
                      All Active Batches
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input 
                        type="radio" 
                        name="cronScope" 
                        checked={cronConfig.scope === 'selective'} 
                        onChange={() => setCronConfig({...cronConfig, scope: 'selective'})} 
                      />
                      Selective Batches ({cronConfig.batchIds?.length || 0})
                    </label>
                  </div>

                  {cronConfig.scope === 'selective' && (
                    <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {batches.map(b => {
                        const currentIds = (cronConfig.batchIds || []).map(id => id._id || id);
                        const isChecked = currentIds.includes(b._id);
                        return (
                          <label key={b._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={e => {
                                const nextIds = e.target.checked 
                                  ? [...currentIds, b._id] 
                                  : currentIds.filter(id => id !== b._id);
                                setCronConfig({...cronConfig, batchIds: nextIds});
                              }} 
                            />
                            <span style={{ fontWeight: 600 }}>{b.name}</span>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({b.startTime} - {b.endTime})</span>
                          </label>
                        );
                      })}
                      {batches.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No batches available</div>}
                    </div>
                  )}
                </div>

                {/* Meeting Link Mode */}
                <div className="lms-form-group">
                  <label>Meeting Link Mode</label>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input 
                        type="radio" 
                        name="cronLinkMode" 
                        checked={cronConfig.linkMode !== 'per_batch'} 
                        onChange={() => setCronConfig({...cronConfig, linkMode: 'single_shared'})} 
                      />
                      <span><strong>Same Link for All Batches</strong> (1 Shared Link)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input 
                        type="radio" 
                        name="cronLinkMode" 
                        checked={cronConfig.linkMode === 'per_batch'} 
                        onChange={() => setCronConfig({...cronConfig, linkMode: 'per_batch'})} 
                      />
                      <span>Separate Link per Batch</span>
                    </label>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {cronConfig.linkMode !== 'per_batch' 
                      ? 'Creates 1 central Zoom meeting and assigns the same Meeting ID & password to all targeted batches.'
                      : 'Creates a unique Zoom meeting with different links for each individual batch.'}
                  </div>
                </div>

                {/* Last Run Info */}
                {cronConfig.lastRunAt && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
                    <div><strong>Last Run:</strong> {new Date(cronConfig.lastRunAt).toLocaleString()} ({cronConfig.lastRunStatus})</div>
                    {cronConfig.lastRunSummary && <div style={{ marginTop: '4px', fontWeight: 500 }}>{cronConfig.lastRunSummary}</div>}
                  </div>
                )}

                {/* Generated Zoom Links Display */}
                {cronConfig.lastRunResults && cronConfig.lastRunResults.length > 0 && (() => {
                  const successfulResults = cronConfig.lastRunResults.filter(r => r.status === 'success');
                  const isAllSameLink = successfulResults.length > 0 && successfulResults.every(r => r.meetingNumber === successfulResults[0].meetingNumber);

                  return (
                    <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                          Generated Zoom Links ({successfulResults.length} active)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {isAllSameLink ? 'Single Shared Link' : 'Separate Links'}
                        </span>
                      </div>

                      {/* Prominent Shared Link Box if all batches use the same link */}
                      {isAllSameLink && (
                        <div style={{ background: '#ffffff', border: '1.5px solid #2563eb', borderRadius: '8px', padding: '12px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(37,99,235,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem' }}>
                              🔗 Active Shared Meeting Link
                            </span>
                            <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              Shared by {successfulResults.length} batches
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '20px', fontSize: '0.82rem', color: '#334155', marginBottom: '8px' }}>
                            <div>ID: <strong style={{ color: '#0f172a' }}>{successfulResults[0].meetingNumber}</strong></div>
                            <div>Password: <strong style={{ color: '#0f172a' }}>{successfulResults[0].password || 'None'}</strong></div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <input 
                              readOnly 
                              value={successfulResults[0].joinUrl} 
                              style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', background: '#f8fafc', color: '#2563eb', fontWeight: 500 }}
                            />
                            <button 
                              type="button" 
                              className="lms-copy-btn" 
                              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                              onClick={() => {
                                navigator.clipboard.writeText(successfulResults[0].joinUrl);
                                setToastMsg('Copied shared Zoom link to clipboard!');
                                setTimeout(() => setToastMsg(''), 3000);
                              }}
                            >
                              Copy
                            </button>
                            <a 
                              href={successfulResults[0].joinUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="lms-btn lms-btn-outline" 
                              style={{ padding: '6px 14px', fontSize: '0.78rem', textDecoration: 'none' }}
                            >
                              Open
                            </a>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            <strong>Assigned to:</strong> {successfulResults.map(r => r.batchName).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Detailed list if individual mode or failures exist */}
                      {(!isAllSameLink || cronConfig.lastRunResults.some(r => r.status !== 'success')) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {cronConfig.lastRunResults.map((item, idx) => (
                            <div key={idx} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>{item.batchName}</div>
                                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: item.status === 'success' ? '#f0fdf4' : '#fef2f2', color: item.status === 'success' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                  {item.status === 'success' ? 'Active' : 'Failed'}
                                </span>
                              </div>
                              {item.status === 'success' ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
                                  <span>ID: <strong>{item.meetingNumber}</strong> | Pass: <strong>{item.password || '••••••'}</strong></span>
                                  <button 
                                    type="button" 
                                    className="lms-copy-btn" 
                                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.joinUrl);
                                      setToastMsg(`Copied link for ${item.batchName}!`);
                                      setTimeout(() => setToastMsg(''), 3000);
                                    }}
                                  >
                                    Copy
                                  </button>
                                </div>
                              ) : (
                                <div style={{ color: '#dc2626', fontSize: '0.75rem' }}>Error: {item.error}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="lms-btn lms-btn-outline" 
                    onClick={handleTriggerCronNow}
                    disabled={cronSyncing}
                    style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a', fontWeight: 700 }}
                  >
                    {cronSyncing ? '⚡ Syncing Zoom...' : '⚡ Generate & Sync Now'}
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="lms-btn lms-btn-outline" onClick={() => setShowCronModal(false)}>
                      Cancel
                    </button>
                    <button type="button" className="lms-btn lms-btn-primary" onClick={handleSaveCronConfig}>
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Batch Modal ── */}
      {showModal && (
        <div className="lms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lms-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create Batch</h3>
            <form onSubmit={handleSubmit}>
              <div className="lms-form-group">
                <label>Name</label>
                <input className="lms-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="lms-form-group">
                  <label>Start</label>
                  <input className="lms-input" type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div className="lms-form-group">
                  <label>End</label>
                  <input className="lms-input" type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
              <div className="lms-form-group">
                <label>Weekdays</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                  {DAYS.map((day, idx) => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer', background: formData.weekdays.includes(idx) ? '#eff6ff' : '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid', borderColor: formData.weekdays.includes(idx) ? '#2563eb' : '#e2e8f0' }}>
                      <input 
                        type="checkbox" 
                        hidden
                        checked={formData.weekdays.includes(idx)} 
                        onChange={e => {
                          const newDays = e.target.checked 
                            ? [...formData.weekdays, idx].sort()
                            : formData.weekdays.filter(d => d !== idx);
                          setFormData({...formData, weekdays: newDays});
                        }} 
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="lms-btn lms-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="lms-btn lms-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importFile && <ExcelImportModal file={importFile} onConfirm={async d => { setLoading(true); await importBatches(d); setLoading(false); setImportFile(null); fetchBatches(); }} onCancel={() => setImportFile(null)} />}

      {loading && (
        <div className="lms-overlay-loader">
          <div className="lms-spinner-large" />
          <div>Processing action... Please wait</div>
        </div>
      )}

      {toastMsg && (
        <div className="lms-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {toastMsg}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Batches;

