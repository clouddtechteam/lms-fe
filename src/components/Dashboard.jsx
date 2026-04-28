import { useAuth } from '../context/AuthContext.jsx';

const cardStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .dash-root {
    min-height: 100vh;
    background: linear-gradient(135deg, #0d3a78 0%, #1557b0 50%, #1a73e8 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif;
    padding: 24px;
  }
  .dash-card {
    background: #fff;
    border-radius: 20px;
    padding: 48px 40px;
    max-width: 500px;
    width: 100%;
    text-align: center;
    box-shadow: 0 24px 60px rgba(0,0,0,0.18);
  }
  .dash-avatar {
    width: 80px; height: 80px;
    background: linear-gradient(135deg, #1a73e8, #0d3a78);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2.2rem;
    margin: 0 auto 24px;
    box-shadow: 0 8px 20px rgba(26,115,232,0.3);
  }
  .dash-role-badge {
    display: inline-block;
    background: #eff6ff;
    color: #1a73e8;
    border: 1px solid #bfdbfe;
    border-radius: 50px;
    padding: 4px 16px;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .dash-card h1 { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
  .dash-card p { font-size: 0.92rem; color: #6b7280; margin-bottom: 32px; line-height: 1.6; }
  .dash-logout {
    padding: 12px 28px;
    background: linear-gradient(135deg, #1a73e8, #1557b0);
    color: #fff; border: none; border-radius: 10px;
    font-size: 0.9rem; font-weight: 600;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 14px rgba(26,115,232,0.35);
    transition: opacity 0.2s, transform 0.15s;
  }
  .dash-logout:hover { opacity: 0.9; transform: translateY(-1px); }
`;

const Dashboard = ({ emoji, role, title, description }) => {
  const { user, logout } = useAuth();
  return (
    <>
      <style>{cardStyle}</style>
      <div className="dash-root">
        <div className="dash-card">
          <div className="dash-avatar">{emoji}</div>
          <div className="dash-role-badge">{role}</div>
          <h1>Welcome, {user?.name || title}!</h1>
          <p>{description}</p>
          <button className="dash-logout" onClick={logout}>Sign Out</button>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
