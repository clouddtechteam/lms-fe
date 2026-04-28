import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const TrainerDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Trainer Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0 }}>Hello, {user?.name}!</h3>
          <p style={{ color: '#64748b' }}>Manage your students and batch schedules.</p>
          
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#15803d' }}>Live Batch</h4>
            <p style={{ margin: 0, fontWeight: 600 }}>Java Cloud Microservices</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Status: In Progress</p>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0 }}>Batch Statistics</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
            <span>Total Students</span>
            <span style={{ fontWeight: 600 }}>45</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span>Average Progress</span>
            <span style={{ fontWeight: 600, color: '#1a73e8' }}>78%</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TrainerDashboard;
