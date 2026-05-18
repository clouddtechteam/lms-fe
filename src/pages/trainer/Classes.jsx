import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { getTrainerLiveClasses } from '../../api/meet.js';
import { useNavigate } from 'react-router-dom';

const styles = `
  .classes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
  .class-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; transition: 0.3s; position: relative; overflow: hidden; }
  .class-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -10px rgba(0,0,0,0.1); }
  .class-card.live { border-color: #0ea5e9; background: #f0f9ff; }
  
  .status-badge { position: absolute; top: 16px; right: 16px; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
  .status-live { background: #0ea5e9; color: white; animation: pulse 2s infinite; }
  .status-scheduled { background: #f1f5f9; color: #64748b; }
  
  @keyframes pulse { 
    0% { opacity: 1; } 
    50% { opacity: 0.6; } 
    100% { opacity: 1; } 
  }

  .batch-name { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
  .batch-time { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 0.9rem; margin-bottom: 24px; }
  
  .join-btn { 
    width: 100%; padding: 12px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; 
    background: #1a73e8; color: white; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .join-btn:hover { background: #1557b0; }
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

const isClassPast = (meet) => {
  return getMeetStatusInfo(meet).isPast;
};

// Returns true if the session is currently joinable
// Rule: live OR (now >= start - 15m AND now <= end + 15m)
const canJoinSession = (meet) => {
  return getMeetStatusInfo(meet).canJoin;
};

const TrainerClasses = () => {
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    getTrainerLiveClasses()
      .then(setMeets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="My Classes (Trainer)">
      <style>{styles}</style>
      
      {loading ? (
        <p>Loading assigned classes...</p>
      ) : (
        <div className="classes-grid">
          {meets.map(meet => {
            const b = meet.batch || {};
            const isLive = meet.status === 'live';
            const past = isClassPast(meet);
            return (
              <div key={meet._id} className={`class-card ${isLive ? 'live' : ''}`}>
                <span className={`status-badge ${isLive ? 'status-live' : past ? '' : 'status-scheduled'}`}
                  style={past && !isLive ? { background: '#f1f5f9', color: '#94a3b8' } : {}}>
                  {isLive ? 'Live Now' : past ? 'Ended' : 'Scheduled'}
                </span>

                <div className="batch-name">{b.name}</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {b.weekdays && b.weekdays.map(d => (
                    <span key={d} className="lms-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', margin: 0 }}>
                      {DAYS[d]}
                    </span>
                  ))}
                </div>
                <div className="batch-time">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {b.startTime} - {b.endTime}
                </div>

                {canJoinSession(meet) ? (
                  <button
                    className="join-btn"
                    onClick={() => navigate(`/live/${b._id || meet.batch}`)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    {isLive ? 'Manage Live Meeting' : 'Start Scheduled Meeting'}
                  </button>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {past ? 'Session has ended' : 'Join window opens 15m before start'}
                  </div>
                )}
              </div>
            );
          })}
          {meets.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0' }}>
              <h3 style={{ color: '#64748b' }}>No classes assigned</h3>
              <p style={{ color: '#94a3b8' }}>You haven't been assigned as a trainer to any batches yet.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default TrainerClasses;
