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

// Helper to check if a meet is scheduled on a given day of the week
const isScheduledOn = (meet, dayOfWeek, batchOverride = null) => {
  const b = batchOverride || meet?.batch || {};
  return !b.weekdays || b.weekdays.length === 0 || b.weekdays.includes(dayOfWeek);
};

// Gets start and end times for a meet on a specific reference date
const getMeetTimes = (meet, referenceDate = new Date(), batchOverride = null) => {
  const b = batchOverride || meet?.batch || {};
  if (!b.startTime || !b.endTime) return null;

  const [sh, sm] = b.startTime.split(':').map(Number);
  const [eh, em] = b.endTime.split(':').map(Number);

  const start = new Date(referenceDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(referenceDate);
  end.setHours(eh, em, 0, 0);

  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
};

// Helper to determine the comprehensive status of a meet relative to now
const getMeetStatusInfo = (meet, now = new Date(), batchOverride = null) => {
  if (meet.status === 'live') {
    return { status: 'live', isPast: false, canJoin: true, relevance: 0, meet };
  }
  if (meet.status === 'ended') {
    return { status: 'ended', isPast: true, canJoin: false, relevance: 4, meet };
  }

  // Get potential active instances (yesterday, today, tomorrow)
  const instances = [];
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isScheduledOn(meet, yesterday.getDay(), batchOverride)) {
    const times = getMeetTimes(meet, yesterday, batchOverride);
    if (times) instances.push({ ...times, type: 'yesterday' });
  }

  if (isScheduledOn(meet, now.getDay(), batchOverride)) {
    const times = getMeetTimes(meet, now, batchOverride);
    if (times) instances.push({ ...times, type: 'today' });
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isScheduledOn(meet, tomorrow.getDay(), batchOverride)) {
    const times = getMeetTimes(meet, tomorrow, batchOverride);
    if (times) instances.push({ ...times, type: 'tomorrow' });
  }

  // 1. Is there an instance currently in progress?
  const inProgress = instances.find(inst => now >= inst.start && now <= inst.end);
  if (inProgress) {
    return { status: 'scheduled', isPast: false, canJoin: true, relevance: 1, startTime: inProgress.start, endTime: inProgress.end };
  }

  // 2. Is there an instance in the join window?
  const inJoinWindow = instances.find(inst => {
    const windowStart = new Date(inst.start.getTime() - 15 * 60000);
    const windowEnd = new Date(inst.end.getTime() + 15 * 60000);
    return now >= windowStart && now <= windowEnd;
  });
  if (inJoinWindow) {
    return { status: 'scheduled', isPast: false, canJoin: true, relevance: 2, startTime: inJoinWindow.start, endTime: inJoinWindow.end };
  }

  // 3. Is there an upcoming instance?
  let upcoming = null;
  let minUpcomingDelta = Infinity;
  for (const inst of instances) {
    const delta = inst.start - now;
    if (delta > 0 && delta < minUpcomingDelta) {
      minUpcomingDelta = delta;
      upcoming = inst;
    }
  }
  if (upcoming) {
    return { status: 'scheduled', isPast: false, canJoin: false, relevance: 3, startTime: upcoming.start, endTime: upcoming.end };
  }

  // 4. Fallback: most recently ended instance
  let past = null;
  let maxPastTime = -Infinity;
  for (const inst of instances) {
    if (inst.end < now) {
      if (inst.end.getTime() > maxPastTime) {
        maxPastTime = inst.end.getTime();
        past = inst;
      }
    }
  }
  if (past) {
    const bufferEnd = new Date(past.end.getTime() + 15 * 60000);
    return { status: 'scheduled', isPast: now > bufferEnd, canJoin: false, relevance: 4, startTime: past.start, endTime: past.end };
  }

  return { status: 'scheduled', isPast: true, canJoin: false, relevance: 5 };
};

// Find the single meet most relevant to current time
// Priority: live > currently in window (start <= now <= end) > next upcoming > most recent past
const findClosestMeet = (meets) => {
  if (!meets || !meets.length) return null;
  const now = new Date();
  
  let bestMeet = null;
  let bestInfo = null;

  for (const meet of meets) {
    const info = getMeetStatusInfo(meet, now);
    if (!bestInfo || info.relevance < bestInfo.relevance) {
      bestInfo = info;
      bestMeet = meet;
    } else if (info.relevance === bestInfo.relevance) {
      if (info.relevance === 3) {
        if (info.startTime < bestInfo.startTime) {
          bestInfo = info;
          bestMeet = meet;
        }
      } else if (info.relevance === 4) {
        if (info.endTime > bestInfo.endTime) {
          bestInfo = info;
          bestMeet = meet;
        }
      }
    }
  }
  return bestMeet;
};

// Returns true if the session is currently joinable
// Rule: live OR (now >= start - 15m AND now <= end + 15m)
const canJoinSession = (meet) => {
  return getMeetStatusInfo(meet).canJoin;
};

// Returns true if the class time has fully passed (including 15m buffer)
const isClassPast = (meet) => {
  return getMeetStatusInfo(meet).isPast;
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
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>Batch</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{closestMeet.batch?.name}</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '8px 0' }}>
                  {closestMeet.batch?.weekdays && closestMeet.batch.weekdays.map(d => (
                    <span key={d} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]}
                    </span>
                  ))}
                </div>
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
