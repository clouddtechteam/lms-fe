import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="My Learning Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0 }}>Welcome back, {user?.name}! 👋</h3>
          <p style={{ color: '#64748b' }}>Check your batch schedule and upcoming assignments here.</p>
          
          <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1a73e8' }}>Next Session</h4>
            <p style={{ margin: 0, fontWeight: 600 }}>Fullstack Web Development</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Today at 10:00 AM</p>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0 }}>Enrollment Status</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span>Current Batch</span>
            <span style={{ fontWeight: 600 }}>Batch A (Apr-24)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span>Attendance</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>92%</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
