import { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { getBatches } from '../api/batches.js';
import { getTrainers } from '../api/trainers.js';
import { getStudents } from '../api/students.js';



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
  const [stats, setStats] = useState({ batches: 0, trainers: 0, students: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const b = await getBatches();
      const t = await getTrainers();
      const s = await getStudents();
      setStats({
        batches: b?.length || 0,
        trainers: t?.length || 0,
        students: s?.length || 0,
      });
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin Overview">
      <style>{styles}</style>
      
      <div className="lms-stats-grid">
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div>
            <span className="lms-stat-value">{stats.students}</span>
            <span className="lms-stat-label">Total Students</span>
          </div>
        </div>
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#eff6ff', color: '#1a73e8' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <div>
            <span className="lms-stat-value">{stats.batches}</span>
            <span className="lms-stat-label">Total Batches</span>
          </div>
        </div>
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 22 11"></polyline></svg>
          </div>
          <div>
            <span className="lms-stat-value">{stats.trainers}</span>
            <span className="lms-stat-label">Active Trainers</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
