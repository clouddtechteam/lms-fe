import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getTrainers, createTrainer, importTrainers, deleteTrainer, updateTrainer } from '../../api/trainers.js';
import { getBatches } from '../../api/batches.js';
import ExcelImportModal from '../../components/ExcelImportModal.jsx';
import '../../admin-unified.css';

const Trainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [editData, setEditData] = useState(null);

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', batchIds: [] });

  useEffect(() => {
    fetchTrainers();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const data = await getBatches();
    setBatches(data);
  };

  const fetchTrainers = async () => {
    const data = await getTrainers();
    setTrainers(data);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTrainer(formData);
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', batchIds: [] });
      fetchTrainers();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleRowClick = (trainer) => {
    setSelectedTrainer(trainer);
    setEditData({
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      phone: trainer.phone,
      batchIds: trainer.batchIds?.map(b => b.batchId || b.name) || []
    });
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateTrainer(selectedTrainer._id, editData);
      fetchTrainers();
      setSelectedTrainer(null);
      alert('Updated!');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    await deleteTrainer(id);
    if (selectedTrainer?._id === id) setSelectedTrainer(null);
    fetchTrainers();
  };

  return (
    <DashboardLayout title="Trainers">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Trainers ({trainers.length})</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="lms-btn lms-btn-outline" onClick={() => document.getElementById('tr-excel').click()}>Import Excel</button>
          <input type="file" id="tr-excel" hidden accept=".xlsx, .xls" onChange={e => { if(e.target.files[0]) setImportFile(e.target.files[0]); e.target.value=null; }} />
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ New Trainer</button>
        </div>
      </div>

      <div className="lms-page-container">
        <div className="lms-table-section">
          <table className="lms-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Assigned Batches</th>
              </tr>
            </thead>
            <tbody>
              {trainers.map((t) => (
                <tr key={t._id} className={selectedTrainer?._id === t._id ? 'selected' : ''} onClick={() => handleRowClick(t)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.firstName} {t.lastName !== '.' ? t.lastName : ''}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email}</div>
                  </td>
                  <td>{t.phone}</td>
                  <td>
                    {t.batchIds?.map(b => (
                      <div key={b._id} style={{ marginBottom: '4px' }}>
                        <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.8rem' }}>{b.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{b.startTime} - {b.endTime}</div>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`lms-details-panel ${selectedTrainer ? 'open' : ''}`}>
          {selectedTrainer && editData && (
            <>
              <div className="panel-title">
                {editData.firstName}
                <button className="lms-btn" onClick={() => setSelectedTrainer(null)}>&times;</button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <span className="panel-label">Profile</span>
                <input className="lms-input" value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} placeholder="First Name" />
                <input className="lms-input" value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} placeholder="Last Name" />
                <input className="lms-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <span className="panel-label">Assigned Batches</span>
                <div className="lms-chip-container">
                  {batches.map(b => {
                    const id = b.batchId || b.name;
                    const active = editData.batchIds.includes(id);
                    return ( <div key={b._id} className={`lms-chip ${active ? 'active' : ''}`} onClick={() => { const n = active ? editData.batchIds.filter(x => x !== id) : [...editData.batchIds, id]; setEditData({...editData, batchIds: n}); }}>{b.name} ({b.startTime})</div> );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="lms-btn lms-btn-primary" style={{ flex: 1 }} onClick={handleUpdate} disabled={loading}>Save</button>
                <button className="lms-btn lms-btn-danger" onClick={() => handleDelete(selectedTrainer._id)}>Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="lms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lms-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Register Trainer</h3>
            <form onSubmit={handleManualAdd}>
              <input className="lms-input" placeholder="Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input className="lms-input" placeholder="Email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input className="lms-input" placeholder="Phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <label className="panel-label">Batches</label>
              <div className="lms-chip-container" style={{ marginBottom: '20px' }}>
                {batches.map(b => {
                  const id = b.batchId || b.name;
                  const active = formData.batchIds.includes(id);
                  return ( <div key={b._id} className={`lms-chip ${active ? 'active' : ''}`} onClick={() => { const n = active ? formData.batchIds.filter(x => x !== id) : [...formData.batchIds, id]; setFormData({...formData, batchIds: n}); }}>{b.name} ({b.startTime})</div> );
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

      {importFile && <ExcelImportModal file={importFile} onConfirm={async d => { setLoading(true); await importTrainers(d); setLoading(false); setImportFile(null); fetchTrainers(); }} onCancel={() => setImportFile(null)} />}
    </DashboardLayout>
  );
};

export default Trainers;
