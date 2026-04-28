import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getStudents, createStudent, importStudents } from '../../api/students.js';
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
  .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .badge-paid { background: #dcfce7; color: #15803d; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-partial { background: #e0f2fe; color: #0369a1; }

  .lms-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
  .lms-modal { background: white; border-radius: 12px; width: 500px; padding: 28px; max-height: 90vh; overflow-y: auto; }
  .lms-form-group { margin-bottom: 16px; }
  .lms-form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 500; color: #64748b; }
  .lms-form-group input, .lms-form-group select { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; box-sizing: border-box; }
`;

const Students = () => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showNotice, setShowNotice] = useState(null); // For showing password once
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', dob: '', batchId: '', totalAmount: 0, paidAmount: 0, startDate: '', endDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const sData = await getStudents();
    const bData = await getBatches();
    if (Array.isArray(sData)) setStudents(sData);
    if (Array.isArray(bData)) setBatches(bData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await createStudent(formData);
    setLoading(false);
    if (res.user) {
      setShowNotice({ name: res.user.name, password: res.password, enrollmentNo: res.subscription.enrollmentNo });
      setShowModal(false);
      fetchData();
    } else alert(res.message);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const res = await importStudents(file);
    setLoading(false);
    alert(res.message);
    fetchData();
  };

  return (
    <DashboardLayout title="Student Management">
      <style>{styles}</style>

      <div className="lms-table-header">
        <h3 style={{ margin: 0 }}>Enrollments ({students.length})</h3>
        <div>
          <label className="lms-btn lms-btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
            Import Excel
            <input type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
          </label>
          <button className="lms-btn lms-btn-primary" onClick={() => setShowModal(true)}>+ New Admission</button>
        </div>
      </div>

      <div className="lms-card">
        <table>
          <thead>
            <tr>
              <th>Enrollment No</th>
              <th>Student Name</th>
              <th>Batch</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id}>
                <td style={{ fontWeight: 600, color: '#1a73e8' }}>{s.subscription?.enrollmentNo || 'PENDING'}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{s.email}</div>
                </td>
                <td>{s.subscription?.batchId?.name || 'Unassigned'}</td>
                <td>{s.phone}</td>
                <td>
                   <span className={`badge badge-${s.subscription?.status === 'active' ? 'paid' : 'partial'}`}>
                    {s.subscription?.status || 'Inactive'}
                   </span>
                </td>
                <td>
                  <span className={`badge badge-${s.subscription?.paymentStatus || 'pending'}`}>
                    {s.subscription?.paymentStatus || 'Pending'}
                  </span>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Due: ₹{(s.subscription?.totalAmount || 0) - (s.subscription?.paidAmount || 0)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <h3>New Student Admission</h3>
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
                <div className="lms-form-group">
                  <label>Email *</label>
                  <input type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="lms-form-group">
                  <label>Phone</label>
                  <input type="text" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="lms-form-group">
                  <label>Date of Birth *</label>
                  <input type="date" required onChange={(e) => setFormData({...formData, dob: e.target.value})} />
                </div>
              </div>

              <hr style={{ margin: '12px 0', borderColor: '#f1f5f9' }} />
              <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>Subscription & Batch</h4>
              
              <div className="lms-form-group">
                <label>Select Batch *</label>
                <select required onChange={(e) => setFormData({...formData, batchId: e.target.value})}>
                  <option value="">-- Choose Batch --</option>
                  {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="lms-form-group">
                  <label>Total Fees (₹)</label>
                  <input type="number" onChange={(e) => setFormData({...formData, totalAmount: e.target.value})} />
                </div>
                <div className="lms-form-group">
                  <label>Paid Amount (₹)</label>
                  <input type="number" onChange={(e) => setFormData({...formData, paidAmount: e.target.value})} />
                </div>
                <div className="lms-form-group">
                  <label>Start Date</label>
                  <input type="date" onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="lms-form-group">
                  <label>End Date</label>
                  <input type="date" onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="lms-btn lms-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="lms-btn lms-btn-primary" disabled={loading}>{loading ? 'Processing...' : 'Enroll Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNotice && (
        <div className="lms-modal-overlay">
          <div className="lms-modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <h3>Student Enrolled!</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Admission successful for <b>{showNotice.name}</b></p>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', margin: '20px 0', textAlign: 'left' }}>
              <div style={{ marginBottom: '8px' }}><strong>Enrollment No:</strong> {showNotice.enrollmentNo}</div>
              <div style={{ color: '#1a73e8' }}><strong>Generated Password:</strong> <code>{showNotice.password}</code></div>
              <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '12px', margin: 0 }}>⚠️ Please share this password with the student. It will not be shown again.</p>
            </div>
            <button className="lms-btn lms-btn-primary" style={{ width: '100%' }} onClick={() => setShowNotice(null)}>Got it</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Students;
