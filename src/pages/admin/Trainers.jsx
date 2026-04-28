import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getTrainers, createTrainer, importTrainers } from '../../api/trainers.js';
import { getBatches } from '../../api/batches.js';

const styles = `
  .lms-table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .lms-btn { padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.88rem; }
  .lms-btn-primary { background: #1a73e8; color: white; }
  .lms-btn-outline { background: white; border: 1px solid #e2e8f0; color: #64748b; margin-right: 12px; }
  .lms-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th { background: #f8fafc; padding: 14px; font-weight: 600; font-size: 0.8rem; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
  td { padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .lms-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .lms-modal { background: white; border-radius: 12px; width: 450px; padding: 28px; }
  .lms-form-group { margin-bottom: 16px; }
  .lms-form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 500; color: #64748b; }
  .lms-form-group input, .lms-form-group select { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; box-sizing: border-box; }
`;

const Trainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', batchId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const tData = await getTrainers();
    const bData = await getBatches();
    if (Array.isArray(tData)) setTrainers(tData);
    if (Array.isArray(bData)) setBatches(bData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await createTrainer(formData);
    setLoading(false);
    if (res.user) {
      setShowModal(false);
      fetchData();
    } else alert(res.message);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const res = await importTrainers(file);
    setLoading(false);
    alert(res.message);
    fetchData();
  };

  return (
    <DashboardLayout title="Trainer Management">
      <style>{styles}</style>

      <div className="lms-table-header">
        <h3 style={{ margin: 0 }}>Trainers ({trainers.length})</h3>
        <div>
          <label className="lms-btn lms-btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
            Import Excel
            <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
          </label>
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ New Trainer</button>
        </div>
      </div>

      <div className="lms-card">
        <table>
          <thead>
            <tr>
              <th>Trainer Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((t) => (
              <tr key={t._id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>{t.email}</td>
                <td>{t.phone || 'N/A'}</td>
                <td>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>● Active</span>
                </td>
                <td>
                  <button style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <h3>Add New Trainer</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="lms-form-group">
                  <label>First Name *</label>
                  <input type="text" required onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="First Name" />
                </div>
                <div className="lms-form-group">
                  <label>Last Name *</label>
                  <input type="text" required onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Last Name" />
                </div>
              </div>
              <div className="lms-form-group">
                <label>Email *</label>
                <input type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="lms-form-group">
                <label>Password *</label>
                <input type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="lms-form-group">
                <label>Phone</label>
                <input type="text" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="lms-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="lms-btn lms-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="lms-btn lms-btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Trainer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Trainers;
