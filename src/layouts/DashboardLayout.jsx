import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .lms-dash-wrapper {
    display: flex;
    height: 100vh;
    height: 100dvh;
    font-family: 'Inter', sans-serif;
    background: #ffffff;
    color: #000000;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .lms-sidebar {
    background: #ffffff;
    border-right: 1px solid #e5e7eb;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    z-index: 100;
    height: 100vh;
    position: sticky;
    top: 0;
  }

  .lms-sidebar.open { width: 300px; } /* Increased from 260px */
  .lms-sidebar.collapsed { width: 80px; }

  .lms-sidebar-header {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: hidden;
    background: #000000;
    transition: all 0.3s;
  }

  .lms-logo-img {
    max-height: 100px;
    width: 100%;
    object-fit: contain;
    padding: 10px;
  }

  .lms-nav {
    flex: 1;
    padding: 24px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }

  .lms-nav-item {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    border-radius: 8px;
    color: #374151;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.94rem;
    transition: all 0.2s;
    white-space: nowrap;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .lms-nav-item:hover { background: #fefce8; color: #000; }
  .lms-nav-item.active { background: #facc15; color: #000; font-weight: 600; }

  .lms-nav-icon {
    min-width: 24px;
    font-size: 1.25rem;
    display: flex; align-items: center; justify-content: center;
    margin-right: 14px;
  }
  .collapsed .lms-nav-icon { margin-right: 0; }

  .lms-sidebar-footer {
    padding: 20px 12px;
    border-top: 1px solid #f1f5f9;
  }

  /* ── Main Content ── */
  .lms-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .lms-header {
    height: 85px; /* Increased from 70px */
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 90;
  }

  .lms-header-left { display: flex; align-items: center; gap: 16px; }
  .lms-toggle-btn {
    background: none; border: none; cursor: pointer; color: #64748b; font-size: 1.4rem;
    display: flex; align-items: center; justify-content: center;
    padding: 6px; border-radius: 6px; transition: background 0.2s;
  }
  .lms-toggle-btn:hover { background: #f1f5f9; }

  .lms-page-title { font-weight: 800; font-size: 1.35rem; color: #1e293b; }

  .lms-header-right { display: flex; align-items: center; gap: 20px; }

  .lms-user-info { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .lms-avatar {
    width: 38px; height: 38px;
    border-radius: 50%; background: #000000;
    color: #facc15; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 1rem;
    border: 2px solid #000;
  }
  .lms-user-text { display: flex; flex-direction: column; }
  .lms-user-name { font-size: 0.95rem; font-weight: 700; color: #000000; }
  .lms-user-role { 
    font-size: 0.65rem; 
    color: #000000; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
    background: #facc15;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
  }

  .lms-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    overflow-x: hidden;
    background: #f8fafc;
    min-height: 0;
  }

  /* ── Mobile Overrides ── */
  @media (max-width: 768px) {
    .lms-sidebar {
      position: fixed;
      left: 0; top: 0; bottom: 0;
      transform: translateX(-100%);
      width: 280px !important;
      height: 100dvh;
      overflow-y: auto;
      z-index: 200;
    }
    .lms-sidebar.mobile-open { transform: translateX(0); }
    .lms-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; backdrop-filter: blur(2px);
    }
    .lms-toggle-btn { display: flex; }
    .lms-sidebar.collapsed { transform: translateX(-100%); }

    /* Header: prevent overflow on mobile */
    .lms-header {
      height: auto;
      min-height: 60px;
      padding: 10px 14px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .lms-header-left {
      gap: 10px;
    }
    .lms-page-title {
      font-size: 1rem;
    }
    /* Hide Change Password button text on mobile to prevent overflow */
    .lms-header-right .lms-btn-outline {
      display: none;
    }
    .lms-user-text {
      display: none;
    }
    .lms-content { padding: 16px 12px; }
  }

  @media (min-width: 769px) {
    .lms-overlay { display: none; }
  }

  /* ── Global Utility Styles ── */
  .lms-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-size: 0.9rem;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .lms-btn-primary { background: #1a73e8; color: white; }
  .lms-btn-primary:hover { background: #1557b0; }
  .lms-btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; }
  .lms-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
  
  .lms-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.95rem;
    transition: all 0.2s;
    outline: none;
  }
  .lms-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.1); }

  .lms-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
    padding: 20px;
  }
  .lms-modal {
    background: white; border-radius: 20px; width: 100%; max-width: 500px;
    padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
    position: relative;
    animation: lms-modal-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes lms-modal-in {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;


const DashboardLayout = ({ children, title }) => {
  const { user, role, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isCPModalOpen, setIsCPModalOpen] = useState(false);


  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const navItems = {
    admin: [
      { path: '/admin', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
      { path: '/admin/students', label: 'Students', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
      { path: '/admin/batches', label: 'Batches', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> },
      { path: '/admin/trainers', label: 'Trainers', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },


      { path: '/admin/settings', label: 'Settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> },
    ],
    trainer: [
      { path: '/trainer', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
      { path: '/trainer/classes', label: 'Classes', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l5 5-5 5"></path><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg> },
    ],
    student: [
      { path: '/student', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
      { path: '/student/classes', label: 'Classes', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l5 5-5 5"></path><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg> },
    ],
  };

  const currentNav = navItems[role] || [];

  return (
    <>
      <style>{styles}</style>
      <div className="lms-dash-wrapper">
        {isMobileOpen && <div className="lms-overlay" onClick={() => setIsMobileOpen(false)} />}

        <aside className={`lms-sidebar ${isCollapsed ? 'collapsed' : 'open'} ${isMobileOpen ? 'mobile-open' : ''}`}>
          <div className="lms-sidebar-header">
            <img src="/logo.png" alt="LMS Cloud" className="lms-logo-img" />
          </div>

          <nav className="lms-nav">
            {currentNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`lms-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="lms-nav-icon">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="lms-sidebar-footer">
            <button
              className="lms-nav-item"
              onClick={() => setIsCPModalOpen(true)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span className="lms-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>
              {!isCollapsed && <span>Change Password</span>}
            </button>
            <button
              className="lms-nav-item"
              onClick={logout}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            >
              <span className="lms-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <main className="lms-main">
          <header className="lms-header">
            <div className="lms-header-left">
              <button className="lms-toggle-btn" onClick={() => {
                if (window.innerWidth <= 768) setIsMobileOpen(true);
                else setIsCollapsed(!isCollapsed);
              }}>
                ☰
              </button>
              <h2 className="lms-page-title">{title || 'Dashboard'}</h2>
            </div>

            <div className="lms-header-right">
              <button 
                className="lms-btn lms-btn-outline" 
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => setIsCPModalOpen(true)}
              >
                Change Password
              </button>
              <div className="lms-user-info" onClick={() => navigate(`/${role}/profile`)}>

                <div className="lms-user-text" style={{ textAlign: 'right' }}>
                  <span className="lms-user-name">{user?.name}</span>
                  <span className="lms-user-role">{role}</span>
                </div>
                <div className="lms-avatar" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>{(user?.name || role || 'U').charAt(0).toUpperCase()}</div>
              </div>
            </div>
          </header>

          <div className="lms-content">
            {children}
          </div>
        </main>
      </div>

      <ChangePasswordModal isOpen={isCPModalOpen} onClose={() => setIsCPModalOpen(false)} />
    </>

  );
};

export default DashboardLayout;
