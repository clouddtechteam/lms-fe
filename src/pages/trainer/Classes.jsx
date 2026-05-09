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

const parseBatchTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const isClassPast = (meet) => {
  if (meet.status === 'live') return false;
  if (meet.status === 'ended') return true;
  const end = parseBatchTime(meet.batch?.endTime);
  if (!end) return true;
  const bufferEnd = new Date(end.getTime() + 15 * 60000);
  return new Date() > bufferEnd;
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

const TrainerClasses = () => {
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
