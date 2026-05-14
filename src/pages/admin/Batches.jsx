import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getBatches, createBatch, deleteBatch, importBatches, getBatchDetails } from '../../api/batches.js';
import { getMeetByBatch, createOrUpdateMeet } from '../../api/meet.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';
import '../../admin-unified.css';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', startTime: '09:00', endTime: '18:00', weekdays: [] });
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [meetData, setMeetData] = useState({ meetingNumber: '', password: '', status: 'scheduled' });
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
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const data = await getBatches();
    if (Array.isArray(data)) setBatches(data);
  };

  const handleBatchClick = async (batch) => {
    setSelectedBatch(batch);
    setLoading(true);
    try {
      // 1. Fetch Meet Details
      const meetRes = await getMeetByBatch(batch._id);
      // Backend returns an array from Meet.find()
      const meet = Array.isArray(meetRes) ? meetRes[0] : meetRes;
      
      if (meet) {
        setMeetData({ meetingNumber: meet.meetingNumber, password: meet.password, status: meet.status || 'scheduled' });
      } else {
        setMeetData({ meetingNumber: '', password: '', status: 'scheduled' });
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
      setMeetData({ meetingNumber: '', password: '', status: 'scheduled' });
      setBatchDetails({ students: [], trainers: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeet = async () => {
    setLoading(true);
    try {
      await createOrUpdateMeet({
        batchId: selectedBatch._id,
        meetingNumber: meetData.meetingNumber,
        password: meetData.password,
        status: meetData.status
      });
      alert('Updated!');
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

  return (
    <DashboardLayout title="Batches">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Batches ({batches.length})</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="lms-btn lms-btn-outline" onClick={() => document.getElementById('bt-excel').click()}>Import Excel</button>
          <input type="file" id="bt-excel" hidden accept=".xlsx,.xls" onChange={e => { if(e.target.files[0]) setImportFile(e.target.files[0]); e.target.value=null; }} />
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ Add Batch</button>
        </div>
      </div>

      <div className="lms-page-container">
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
          {selectedBatch && (
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
                  <label>Status</label>
                  <select className="lms-input" value={meetData.status} onChange={e => setMeetData({...meetData, status: e.target.value})}>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
                <button className="lms-btn lms-btn-primary" style={{ width: '100%' }} onClick={handleSaveMeet} disabled={loading}>Save Meet Details</button>
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
                ) : <div className="panel-empty">No trainers assigned</div>}
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
                ) : <div className="panel-empty">No students enrolled</div>}
              </div>

              <button className="lms-btn lms-btn-danger" style={{ width: '100%', marginTop: 'auto' }} onClick={() => handleDelete(selectedBatch._id)}>Delete Batch</button>
            </>
          )}
        </div>
      </div>

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
    </DashboardLayout>
  );
};

export default Batches;
