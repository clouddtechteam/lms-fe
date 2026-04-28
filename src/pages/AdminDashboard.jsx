import { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { getBatches } from '../api/batches.js';
import { getStudents } from '../api/students.js';
import { getTrainers } from '../api/trainers.js';

const styles = `
  .lms-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
  .lms-stat-card { background: white; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 20px; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
  .lms-stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
  .lms-stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
  .lms-stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; display: block; }
  .lms-stat-label { font-size: 0.88rem; color: #64748b; font-weight: 500; }

  .lms-grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
  .lms-panel { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; }
  .lms-panel-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }

  @media (max-width: 1024px) { .lms-grid-2 { grid-template-columns: 1fr; } }
`;

const AdminDashboard = () => {
  const [stats, setStats] = useState({ batches: 0, students: 0, trainers: 0, revenue: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const b = await getBatches();
      const s = await getStudents();
      const t = await getTrainers();
      
      const revenue = (s || []).reduce((acc, curr) => acc + (curr.subscription?.paidAmount || 0), 0);
      
      setStats({
        batches: b?.length || 0,
        students: s?.length || 0,
        trainers: t?.length || 0,
        revenue
      });
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin Overview">
      <style>{styles}</style>
      
      <div className="lms-stats-grid">
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#eff6ff', color: '#1a73e8' }}>📚</div>
          <div>
            <span className="lms-stat-value">{stats.batches}</span>
            <span className="lms-stat-label">Total Batches</span>
          </div>
        </div>
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>🎓</div>
          <div>
            <span className="lms-stat-value">{stats.students}</span>
            <span className="lms-stat-label">Total Students</span>
          </div>
        </div>
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>👨‍🏫</div>
          <div>
            <span className="lms-stat-value">{stats.trainers}</span>
            <span className="lms-stat-label">Active Trainers</span>
          </div>
        </div>
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>💰</div>
          <div>
            <span className="lms-stat-value">₹{stats.revenue.toLocaleString()}</span>
            <span className="lms-stat-label">Total Revenue</span>
          </div>
        </div>
      </div>

      <div className="lms-grid-2">
        <div className="lms-panel">
          <div className="lms-panel-title">Recent Admissions</div>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Charts and activity logs will appear here.</p>
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
            Activity Feed Preview
          </div>
        </div>
        <div className="lms-panel">
          <div className="lms-panel-title">System Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Server</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● Online</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Database</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● Connected</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Last Backup</span>
              <span style={{ color: '#64748b' }}>2 mins ago</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
