import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getStudents, createStudent, importStudents, deleteStudent, updateStudent, addSubscription } from '../../api/students.js';
import { getBatches } from '../../api/batches.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';
import '../../admin-unified.css';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editData, setEditData] = useState(null);
  const [newBatchId, setNewBatchId] = useState('');

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', enrollmentNo: '', dob: '', 
    batchId: [], status: 'active', startDate: '', endDate: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const data = await getBatches();
    setBatches(data);
  };

  const fetchStudents = async () => {
    const data = await getStudents();
    setStudents(data);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createStudent(formData);
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', enrollmentNo: '', dob: '', batchId: [], status: 'active', startDate: '', endDate: '' });
      fetchStudents();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setEditData({
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
      subscriptions: student.subscriptions.map(sub => ({
        ...sub,
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
        endDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : ''
      }))
    });
    setNewBatchId('');
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateStudent(selectedStudent._id, editData);
      fetchStudents();
      alert('Updated!');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleAddSub = async () => {
    if (!newBatchId) return;
    setLoading(true);
    try {
      await addSubscription(selectedStudent._id, newBatchId);
      setNewBatchId('');
      fetchStudents();
      // Refetch current student details to show the new sub
      const data = await getStudents();
      const updated = data.find(s => s._id === selectedStudent._id);
      handleRowClick(updated);
      alert('Batch added to subscription!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    await deleteStudent(id);
    if (selectedStudent?._id === id) setSelectedStudent(null);
    fetchStudents();
  };

  return (
    <DashboardLayout title="Students">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Students ({students.length})</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="lms-btn lms-btn-outline" onClick={() => document.getElementById('st-excel').click()}>Import Excel</button>
          <input type="file" id="st-excel" hidden accept=".xlsx, .xls" onChange={e => { if(e.target.files[0]) setImportFile(e.target.files[0]); e.target.value=null; }} />
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ New Student</button>
        </div>
      </div>

      <div className="lms-page-container">
        <div className="lms-table-section">
          <table className="lms-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Batches</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className={selectedStudent?._id === s._id ? 'selected' : ''} onClick={() => handleRowClick(s)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.firstName} {s.lastName !== '.' ? s.lastName : ''}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email}</div>
                  </td>
                  <td>
                    <div>{s.subscriptions?.[0]?.enrollmentNo || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.phone}</div>
                  </td>
                  <td>
                    {s.subscriptions?.map(sub => (
                      <div key={sub._id} style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                        <div style={{ color: '#2563eb', fontWeight: 700 }}>{sub.batchId?.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{sub.batchId?.startTime} - {sub.batchId?.endTime}</div>
                      </div>
                    ))}
                  </td>
                  <td>
                    <span className="lms-badge" style={{ background: s.isActive ? '#f0fdf4' : '#fef2f2', color: s.isActive ? '#16a34a' : '#dc2626' }}>
                      {s.isActive ? 'Active' : 'Expired'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`lms-details-panel ${selectedStudent ? 'open' : ''}`}>
          {selectedStudent && editData && (
            <>
              <div className="panel-title">
                {editData.firstName}
                <button className="lms-btn" onClick={() => setSelectedStudent(null)}>&times;</button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <span className="panel-label">Profile</span>
                <input className="lms-input" value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} placeholder="First Name" />
                <input className="lms-input" value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} placeholder="Last Name" />
                <input className="lms-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="panel-label" style={{ marginBottom: 0 }}>Subscriptions</span>
                </div>
                {editData.subscriptions.map((sub, idx) => (
                  <div key={sub._id} style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '8px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '2px' }}>{sub.batchId?.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '8px' }}>{sub.batchId?.startTime} - {sub.batchId?.endTime}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input className="lms-input" style={{marginBottom: 0, fontSize: '0.8rem'}} type="date" value={sub.startDate} onChange={e => { const n = [...editData.subscriptions]; n[idx].startDate = e.target.value; setEditData({...editData, subscriptions: n}); }} />
                      <input className="lms-input" style={{marginBottom: 0, fontSize: '0.8rem'}} type="date" value={sub.endDate} onChange={e => { const n = [...editData.subscriptions]; n[idx].endDate = e.target.value; setEditData({...editData, subscriptions: n}); }} />
                    </div>
                  </div>
                ))}

                {/* Add New Subscription Dropdown */}
                <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span className="panel-label">Add New Batch</span>
                  <select className="lms-input" style={{ marginBottom: '10px' }} value={newBatchId} onChange={e => setNewBatchId(e.target.value)}>
                    <option value="">Select Batch...</option>
                    {batches
                      .filter(b => !editData.subscriptions.find(s => s.batchId?._id === b._id))
                      .map(b => (
                        <option key={b._id} value={b._id}>{b.name} ({b.startTime} - {b.endTime})</option>
                      ))}
                  </select>
                  <button className="lms-btn lms-btn-primary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={handleAddSub} disabled={loading || !newBatchId}>
                    + Assign Batch
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="lms-btn lms-btn-primary" style={{ flex: 1 }} onClick={handleUpdate} disabled={loading}>Save All</button>
                <button className="lms-btn lms-btn-danger" onClick={() => handleDelete(selectedStudent._id)}>Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="lms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lms-modal" style={{ width: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Register Student</h3>
            <form onSubmit={handleManualAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>First Name</label>
                  <input className="lms-input" placeholder="e.g. John" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Last Name</label>
                  <input className="lms-input" placeholder="e.g. Doe" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address</label>
                  <input className="lms-input" placeholder="email@example.com" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Phone Number</label>
                  <input className="lms-input" placeholder="+1234567890" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Enrollment No (Optional)</label>
                  <input className="lms-input" placeholder="STU-001" value={formData.enrollmentNo} onChange={e => setFormData({...formData, enrollmentNo: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Date of Birth</label>
                  <input className="lms-input" type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Start Date</label>
                  <input className="lms-input" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ marginBottom: 0 }}>
                  <label>Expiry Date</label>
                  <input className="lms-input" type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <label className="panel-label">Assign to Batches</label>
              <div className="lms-chip-container" style={{ marginBottom: '20px' }}>
                {batches.map(b => {
                  const id = b.batchId || b.name;
                  const active = formData.batchId.includes(id);
                  return ( <div key={b._id} className={`lms-chip ${active ? 'active' : ''}`} onClick={() => { const n = active ? formData.batchId.filter(x => x !== id) : [...formData.batchId, id]; setFormData({...formData, batchId: n}); }}>{b.name} ({b.startTime})</div> );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="lms-btn lms-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="lms-btn lms-btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importFile && <ExcelImportModal file={importFile} onConfirm={async d => { setLoading(true); await importStudents(d); setLoading(false); setImportFile(null); fetchStudents(); }} onCancel={() => setImportFile(null)} />}
    </DashboardLayout>
  );
};

export default Students;
