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

const parseBatchTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

// Returns true if the session is currently joinable
// Rule: live OR (now >= start - 15m AND now <= end + 15m)
const canJoinSession = (meet, batch) => {
  if (meet.status === 'live') return true;
  if (meet.status === 'ended') return false;
  
  const now = new Date();
  
  // 1. Weekday Check: Only allow if today matches OR if no weekdays are set
  const today = now.getDay();
  if (batch.weekdays && batch.weekdays.length > 0 && !batch.weekdays.includes(today)) {
    return false;
  }

  // 2. Time Window Check
  const start = parseBatchTime(batch.startTime);
  const end = parseBatchTime(batch.endTime);
  
  if (!start || !end) return false;

  const joinWindowStart = new Date(start.getTime() - 15 * 60000);
  const joinWindowEnd = new Date(end.getTime() + 15 * 60000);

  return now >= joinWindowStart && now <= joinWindowEnd;
};

// Returns true if the session time has fully passed (including 15m buffer)
const isSessionPast = (meet, batch) => {
  if (meet.status === 'live') return false;
  if (meet.status === 'ended') return true;
  const end = parseBatchTime(batch.endTime);
  if (!end) return true;
  const bufferEnd = new Date(end.getTime() + 15 * 60000);
  return new Date() > bufferEnd;
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
