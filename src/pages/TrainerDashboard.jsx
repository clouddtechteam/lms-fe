import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getTrainerLiveClasses } from '../api/meet.js';

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
  if (!meets || !meets.length) return null;
  const now = new Date();
  const today = now.getDay();

  // 1. Filter for classes that match today's weekday (or have no weekdays set)
  const todaysMeets = meets.filter(m => {
    const b = m.batch || {};
    return !b.weekdays || b.weekdays.length === 0 || b.weekdays.includes(today);
  });

  if (todaysMeets.length === 0) return null;

  // 2. Explicitly marked live
  const liveClass = todaysMeets.find(m => m.status === 'live');
  if (liveClass) return liveClass;

  // 3. Currently within the time window
  const inWindow = todaysMeets.find(m => {
    if (m.status === 'ended') return false;
    const start = parseBatchTime(m.batch?.startTime);
    const end = parseBatchTime(m.batch?.endTime);
    return start && end && now >= start && now <= end;
  });
  if (inWindow) return inWindow;

  // 4. Next upcoming for today
  let nextUpcoming = null;
  let smallestFutureDelta = Infinity;
  for (const meet of todaysMeets) {
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

  // 5. Fallback: most recently ended class today
  let latestPast = null;
  let latestTime = -Infinity;
  for (const meet of todaysMeets) {
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
  const b = meet.batch || {};

  // 1. Weekday Check
  const today = now.getDay();
  if (b.weekdays && b.weekdays.length > 0 && !b.weekdays.includes(today)) {
    return false;
  }

  // 2. Time Window Check
  const start = parseBatchTime(b.startTime);
  const end = parseBatchTime(b.endTime);
  
  if (!start || !end) return false;

  const joinWindowStart = new Date(start.getTime() - 15 * 60000);
  const joinWindowEnd = new Date(end.getTime() + 15 * 60000);

  return now >= joinWindowStart && now <= joinWindowEnd;
};

const isClassPast = (meet) => {
  if (meet.status === 'live') return false;
  if (meet.status === 'ended') return true;
  const end = parseBatchTime(meet.batch?.endTime);
  if (!end) return true;
  const bufferEnd = new Date(end.getTime() + 15 * 60000);
  return new Date() > bufferEnd;
};

const styles = `
  .lms-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }

  .lms-stat-card {
    background: white;
    padding: 24px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  .lms-stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .lms-stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .lms-stat-value {
    display: block;
    font-size: 1.75rem;
    font-weight: 800;
    color: #1e293b;
    line-height: 1.2;
  }

  .lms-stat-label {
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .main-content-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
  }

  .sessions-panel {
    background: white;
    border-radius: 24px;
    border: 1px solid #e2e8f0;
    padding: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .live-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }

  .meet-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: 0.2s;
  }

  .meet-card:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }

  .meet-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status-live { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
  .status-scheduled { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }

  .join-now-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background: #1a73e8;
    color: white;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: 0.2s;
  }

  .join-now-btn:hover {
    background: #1557b0;
  }

  .profile-sidebar {
    background: white;
    border-radius: 24px;
    border: 1px solid #e2e8f0;
    padding: 24px;
    height: fit-content;
  }

  @media (max-width: 1024px) {
    .main-content-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .live-grid {
      grid-template-columns: 1fr;
    }
  }
`;

const TrainerDashboard = () => {
  const { user } = useAuth();
  const [allMeets, setAllMeets] = useState([]);
  const [batchCount, setBatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAllMeets = async () => {
    try {
      const results = await getTrainerLiveClasses();
      setAllMeets(results);
      setBatchCount(results.length);
    } catch (err) {
      console.error('Error fetching meets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMeets();
    const interval = setInterval(fetchAllMeets, 30000);
    return () => clearInterval(interval);
  }, []);

  const closestMeet = findClosestMeet(allMeets);
  const past = closestMeet ? isClassPast(closestMeet) : false;

  return (
    <DashboardLayout title="Trainer Overview">
      <style>{styles}</style>

      {/* Stats Summary */}
      <div className="lms-stats-grid">
        <div className="lms-stat-card" onClick={() => navigate('/trainer/classes')}>
          <div className="lms-stat-icon" style={{ background: '#eff6ff', color: '#1a73e8' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          </div>
          <div>
            <span className="lms-stat-value">{batchCount}</span>
            <span className="lms-stat-label">Assigned Batches</span>
          </div>
        </div>

        <div className="lms-stat-card">
          <div className="lms-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div>
            <span className="lms-stat-value">Trainer</span>
            <span className="lms-stat-label">Account Role</span>
          </div>
        </div>
      </div>

      <div className="main-content-grid">
        {/* Scheduled Classes */}
        <div className="sessions-panel">
          <div className="section-header">
            <h3 style={{ margin: 0, color: '#1e293b' }}>My Next Class</h3>
            <Link to="/trainer/classes" style={{ color: '#1a73e8', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading classes...</div>
          ) : closestMeet ? (
            <div className="meet-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={`meet-status ${
                  closestMeet.status === 'live' ? 'status-live' : past ? '' : 'status-scheduled'
                }`} style={past && closestMeet.status !== 'live' ? { background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' } : {}}>
                  {closestMeet.status === 'live' ? '● LIVE NOW' : past ? 'ENDED' : 'SCHEDULED'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {closestMeet.meetingNumber}</span>
              </div>

              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>{closestMeet.batch?.name}</h4>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Batch: {closestMeet.batch?.batchId || 'N/A'}</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '8px 0' }}>
                  {closestMeet.batch?.weekdays && closestMeet.batch.weekdays.map(d => (
                    <span key={d} style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                  🕐 {closestMeet.batch?.startTime} – {closestMeet.batch?.endTime}
                </div>
              </div>

              {/* Action button – visible only in the 15m window */}
              {canJoinSession(closestMeet) && (
                <Link to={`/live/${closestMeet.batch?._id || closestMeet.batch}`} className="join-now-btn">
                  {closestMeet.status === 'live' ? 'Manage Session' : 'Start Session'}
                </Link>
              )}
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No batches assigned</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>You don't have any active or assigned batches yet.</p>
            </div>
          )}
        </div>

        {/* Profile Sidebar */}
        <div className="profile-sidebar">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: '#1a73e8' }}>
              {user?.profilePicture ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : 
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              }
            </div>
            <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>{user?.name}</h4>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{user?.email}</span>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Profile Details</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Phone</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{user?.phone || 'N/A'}</span>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TrainerDashboard;
