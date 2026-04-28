import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getBatches, createBatch, deleteBatch, importBatches } from '../../api/batches.js';

const styles = `
  .lms-table-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
  }
  .lms-btn {
    padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; border: none; font-size: 0.9rem;
  }
  .lms-btn-primary { background: #1a73e8; color: white; }
  .lms-btn-primary:hover { background: #1557b0; }
  .lms-btn-outline { background: white; border: 1px solid #e2e8f0; color: #64748b; margin-right: 12px; }
  .lms-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }

  .lms-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th { background: #f8fafc; padding: 16px; font-weight: 600; font-size: 0.85rem; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
  td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; }
  tr:hover { background: #fbfcfe; }

  .lms-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .lms-modal { background: white; border-radius: 12px; width: 450px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
  .lms-modal h3 { margin-bottom: 24px; color: #1e293b; font-size: 1.25rem; }
  .lms-form-group { margin-bottom: 20px; }
  .lms-form-group label { display: block; margin-bottom: 8px; font-size: 0.88rem; font-weight: 500; color: #64748b; }
  .lms-form-group input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; outline: none; transition: 0.2s; box-sizing: border-box; }
  .lms-form-group input:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1); }
  .lms-modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }

  .lms-btn-danger { color: #ef4444; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
  .lms-btn-danger:hover { background: #fef2f2; }
`;

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', startTime: '', endTime: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const data = await getBatches();
    if (Array.isArray(data)) setBatches(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await createBatch(formData);
    setLoading(false);
    if (!res.message || !res.error) {
      setShowModal(false);
      setFormData({ name: '', startTime: '', endTime: '', startDate: '', endDate: '' });
      fetchBatches();
    } else {
      alert(res.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const res = await importBatches(file);
    setLoading(false);
    alert(res.message);
    fetchBatches();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this batch?')) {
      await deleteBatch(id);
      fetchBatches();
    }
  };

  return (
    <DashboardLayout title="Batch Management">
      <style>{styles}</style>
      
      <div className="lms-table-header">
        <h3 style={{ margin: 0 }}>Active Batches ({batches.length})</h3>
        <div>
          <label className="lms-btn lms-btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
            Import Excel
            <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
          </label>
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ Add Batch</button>
        </div>
      </div>

      <div className="lms-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Batch Name</th>
              <th>Timing</th>
              <th>Dates</th>
              <th>Created By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b, idx) => (
              <tr key={b._id}>
                <td style={{ color: '#64748b' }}>#{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{b.name}</td>
                <td>{b.startTime} - {b.endTime}</td>
                <td>
                  {b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'} - 
                  {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A'}
                </td>
                <td>{b.createdBy?.name || 'Admin'}</td>
                <td>
                  <button className="lms-btn-danger" onClick={() => handleDelete(b._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No batches found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <h3>Create New Batch</h3>
            <form onSubmit={handleSubmit}>
              <div className="lms-form-group">
                <label>Batch Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="e.g. FullStack Java Apr 2024" />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="lms-form-group" style={{ flex: 1 }}>
                  <label>Start Time *</label>
                  <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required />
                </div>
                <div className="lms-form-group" style={{ flex: 1 }}>
                  <label>End Time *</label>
                  <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="lms-form-group" style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="lms-form-group" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="lms-modal-footer">
                <button type="button" className="lms-btn lms-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="lms-btn lms-btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Batches;
