import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getBatches } from '../../api/batches.js';
import { getMeetByBatch, getMyLiveClasses } from '../../api/meet.js';
import { useNavigate } from 'react-router-dom';

const styles = `
  .classes-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); 
    gap: 32px; 
  }
  .class-card { 
    background: white; 
    border-radius: 20px; 
    border: 1px solid #e2e8f0; 
    padding: 32px; 
    transition: 0.3s; 
    position: relative; 
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
  }
  .class-card:hover { transform: translateY(-6px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.08); }
  
  .batch-badge { background: #eff6ff; color: #2563eb; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; margin-bottom: 16px; display: inline-block; }
  .batch-name { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
  .batch-time { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 1rem; margin-bottom: 24px; font-weight: 500; }
  
  .meet-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-top: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .meet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .meet-status { padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-live { background: #ef4444; color: white; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
  .status-scheduled { background: #0ea5e9; color: white; }
  
  .join-btn { 
    width: 100%; padding: 14px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: 0.2s; 
    background: #1a73e8; color: white; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem;
    box-shadow: 0 4px 6px rgba(26, 115, 232, 0.2);
  }
  .join-btn:hover { background: #1557b0; transform: scale(1.02); }

  @media (max-width: 640px) {
    .classes-grid {
      gap: 16px;
    }
    .class-card {
      padding: 20px;
      border-radius: 16px;
    }
    .meet-item {
      padding: 16px;
      border-radius: 12px;
    }
  }
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

// Returns true if the session is currently joinable
// Rule: live OR (now >= start - 15m AND now <= end + 15m)
const canJoinSession = (meet, batchOverride = null) => {
  return getMeetStatusInfo(meet, new Date(), batchOverride).canJoin;
};

// Returns true if the session time has fully passed (including 15m buffer)
const isSessionPast = (meet, batchOverride = null) => {
  return getMeetStatusInfo(meet, new Date(), batchOverride).isPast;
};

const StudentClasses = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    const fetchMyClasses = async () => {
      try {
        // Fetch only classes for today via the updated backend API
        const liveMeets = await getMyLiveClasses();
        
        // Map meets back to a structure the UI expects
        const batchesWithMeets = liveMeets.map(m => ({
          ...m.batch,
          meets: [m]
        }));
        
        setBatches(batchesWithMeets);
      } catch (err) {
        console.error('Error fetching student classes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyClasses();
  }, [user]);

  return (
    <DashboardLayout title="My Enrolled Classes">
      <style>{styles}</style>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading your curriculum...</div>
      ) : (
        <div className="classes-grid">
          {batches.map(b => (
            <div key={b._id} className="class-card">
              <span className="batch-badge">Enrolled</span>
              <div className="batch-name">{b.name}</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {b.weekdays && b.weekdays.map(d => (
                  <span key={d} className="lms-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', margin: 0 }}>
                    {DAYS[d]}
                  </span>
                ))}
              </div>
              <div className="batch-time">
                🕒 {b.startTime} - {b.endTime}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                  Available Sessions
                </div>
                
                {b.meets && b.meets.length > 0 ? (
                  b.meets.map(meet => {
                    const past = isSessionPast(meet, b);
                    return (
                      <div key={meet._id} className="meet-item">
                        <div className="meet-header">
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{meet.provider?.toUpperCase() || 'ZOOM'} SESSION</div>
                          <span className={`meet-status ${meet.status === 'live' ? 'status-live' : 'status-scheduled'}`}
                            style={past && meet.status !== 'live' ? { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' } : {}}>
                            {meet.status === 'live' ? 'LIVE' : past ? 'ENDED' : meet.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>
                          ID: {meet.meetingNumber}
                        </div>
                        {canJoinSession(meet, b) && (
                          <button
                            className="join-btn"
                            onClick={() => navigate(`/live/${b._id}`)}
                          >
                            {meet.status === 'live' ? '▶ Join Live' : 'Join Now'}
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No meetings scheduled
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {batches.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', background: '#f8fafc', borderRadius: '24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📚</div>
              <h3 style={{ color: '#64748b' }}>No classes found</h3>
              <p style={{ color: '#94a3b8' }}>You haven't been assigned to any batches yet. Please contact admin.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentClasses;
