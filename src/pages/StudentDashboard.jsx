import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyLiveClasses } from '../api/meet.js';
import { Link, useNavigate } from 'react-router-dom';

const styles = `
  .lms-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
  .lms-stat-card { background: white; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 24px; transition: 0.3s; cursor: pointer; }
  .lms-stat-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0,0,0,0.1); }
  .lms-stat-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
  .lms-stat-value { font-size: 1.8rem; font-weight: 800; color: #1e293b; display: block; }
  .lms-stat-label { font-size: 1rem; color: #64748b; font-weight: 600; }

  .lms-grid-main { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
  .lms-panel { background: white; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
  .lms-panel-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; color: #1e293b; }

  .live-card { 
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 20px;
    display: flex; justify-content: space-between; align-items: center; transition: 0.2s;
  }
  .live-card:hover { border-color: #1a73e8; background: #f8fafc; }

  .join-now-btn {
    padding: 12px 32px; background: #1a73e8; color: white; border: none; border-radius: 10px;
    font-weight: 700; cursor: pointer; text-decoration: none; font-size: 0.95rem;
  }

  @media (max-width: 1100px) { .lms-grid-main { grid-template-columns: 1fr; } }
`;

// Parse "HH:MM" batch time string into today's Date object
const parseBatchTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

// Find the single meet most relevant to current time
// Priority: live > currently in window (start <= now <= end) > next upcoming > most recent past
const findClosestMeet = (meets) => {
  if (!meets.length) return null;
  const now = new Date();

  // 1. Explicitly marked live
  const liveClass = meets.find(m => m.status === 'live');
  if (liveClass) return liveClass;

  // 2. Currently within the time window (even if status is still 'scheduled')
  const inWindow = meets.find(m => {
    if (m.status === 'ended') return false;
    const start = parseBatchTime(m.batch?.startTime);
    const end = parseBatchTime(m.batch?.endTime);
    return start && end && now >= start && now <= end;
  });
  if (inWindow) return inWindow;

  // 3. Next upcoming (smallest positive delta from startTime)
  let nextUpcoming = null;
  let smallestFutureDelta = Infinity;
  for (const meet of meets) {
    if (meet.status === 'ended') continue;
    const start = parseBatchTime(meet.batch?.startTime);
    if (!start) continue;
    const delta = start - now;
    if (delta > 0 && delta < smallestFutureDelta) {
      smallestFutureDelta = delta;
      nextUpcoming = meet;
    }
  }
  if (nextUpcoming) return nextUpcoming;

  // 4. Fallback: most recently ended class
  let latestPast = null;
  let latestTime = -Infinity;
  for (const meet of meets) {
    const end = parseBatchTime(meet.batch?.endTime);
    if (end && end.getTime() > latestTime) { latestTime = end.getTime(); latestPast = meet; }
  }
  return latestPast;
};

// Returns true if the session is currently joinable
// Rule: live OR (now >= start - 15m AND now <= end + 15m)
const canJoinSession = (meet) => {
  if (meet.status === 'live') return true;
  if (meet.status === 'ended') return false;
  
  const now = new Date();
  const start = parseBatchTime(meet.batch?.startTime);
  const end = parseBatchTime(meet.batch?.endTime);
  
  if (!start || !end) return false;

  const joinWindowStart = new Date(start.getTime() - 15 * 60000);
  const joinWindowEnd = new Date(end.getTime() + 15 * 60000);

  return now >= joinWindowStart && now <= joinWindowEnd;
};

// Returns true if the class time has fully passed (including 15m buffer)
const isClassPast = (meet) => {
  if (meet.status === 'live') return false;
  if (meet.status === 'ended') return true;
  const end = parseBatchTime(meet.batch?.endTime);
  if (!end) return true;
  const bufferEnd = new Date(end.getTime() + 15 * 60000);
  return new Date() > bufferEnd;
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [allMeets, setAllMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAllMeets = async () => {
    try {
      const results = await getMyLiveClasses();
      setAllMeets(results);
    } catch (err) {
      console.error('Error fetching meets:', err);
    } finally {
      setLoading(false);
    }
  };

  const closestMeet = findClosestMeet(allMeets);

  useEffect(() => {
    fetchAllMeets();
    const interval = setInterval(fetchAllMeets, 30000);
    return () => clearInterval(interval);
  }, []);

  const past = closestMeet ? isClassPast(closestMeet) : false;
  const activeMeets = allMeets; // keep for stat card count

  return (
    <DashboardLayout title="Student Overview">
      <style>{styles}</style>

      {/* Stats Summary - Like Admin Dashboard */}
      <div className="lms-stats-grid">
        <div className="lms-stat-card" onClick={() => navigate('/student/classes')}>
          <div className="lms-stat-icon" style={{ background: '#eff6ff', color: '#1a73e8' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <div>
            <span className="lms-stat-value">{user?.batchIds?.length || 0}</span>
            <span className="lms-stat-label">My Batches</span>
          </div>
        </div>
        <div className="lms-stat-card" onClick={() => navigate('/student/profile')}>
          <div className="lms-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div>
            <span className="lms-stat-value">Active</span>
            <span className="lms-stat-label">Account Status</span>
          </div>
        </div>
        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <div>
            <span className="lms-stat-value">{activeMeets.length}</span>
            <span className="lms-stat-label">Live Today</span>
          </div>
        </div>
      </div>

      <div className="lms-grid-main">
        {/* Main Content Panel */}
        <div className="lms-panel">
          <div className="lms-panel-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1a73e8' }}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              My Next Class
            </span>
            <Link to="/student/classes" style={{ fontSize: '0.8rem', color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading...</div>
          ) : closestMeet ? (
            <div className="live-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
              {/* Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase',
                  ...(closestMeet.status === 'live'
                    ? { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }
                    : past
                    ? { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }
                    : { background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' })
                }}>
                  {closestMeet.status === 'live' ? '● LIVE NOW' : past ? 'ENDED' : 'UPCOMING'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {closestMeet.meetingNumber}</span>
              </div>

              {/* Batch Info */}
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Batch</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{closestMeet.batch?.name}</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginTop: '6px' }}>
                  🕐 {closestMeet.batch?.startTime} – {closestMeet.batch?.endTime}
                </div>
              </div>

              {/* Join Button – visible only in the 15m window */}
              {canJoinSession(closestMeet) && (
                <Link
                  to={`/live/${closestMeet.batch?._id || closestMeet.batch}`}
                  className="join-now-btn"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  {closestMeet.status === 'live' ? '▶ Join Live Session' : 'Join Session'}
                </Link>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', background: '#f8fafc', borderRadius: '16px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <p style={{ color: '#64748b', fontSize: '1rem' }}>No classes scheduled yet.</p>
              <Link to="/student/classes" style={{ color: '#1a73e8', fontWeight: 600 }}>View all classes →</Link>
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <div className="lms-panel" style={{ height: 'fit-content' }}>
          <div className="lms-panel-title">My Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#facc15', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '2rem', fontWeight: 800, border: '4px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {(user?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{user?.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{user?.enrollmentNo || 'N/A'}</div>
            </div>
            
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#64748b' }}>Phone</span>
                <span style={{ fontWeight: 600 }}>{user?.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Email</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
