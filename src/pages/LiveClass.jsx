import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { getMeetByBatch } from '../api/meet.js';
import { useAuth } from '../context/AuthContext.jsx';
import ZoomMeet from '../components/ZoomMeet.jsx';

const styles = `
  .classroom-wrapper {
    position: relative;
    width: 100%;
    height: calc(100vh - 120px);
    min-height: 600px;
    background: #000;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
                0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .classroom-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    z-index: 10;
  }

  .classroom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background: #ffffff;
    border-radius: 12px;
    margin-bottom: 16px;
    border: 1px solid #e2e8f0;
  }

  .batch-tag {
    background: #f1f5f9;
    color: #475569;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .join-now-btn {
    padding: 14px 40px;
    background: #1a73e8;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
    box-shadow: 0 4px 6px -1px rgba(26,115,232,0.3);
  }

  .join-now-btn:hover {
    background: #1557b0;
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(26,115,232,0.4);
  }

  .join-app-btn {
    padding: 14px 40px;
    background: #2d8cff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
    box-shadow: 0 4px 6px -1px rgba(45,140,255,0.3);
  }

  .join-app-btn:hover {
    background: #1a73e8;
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(45,140,255,0.4);
  }
`;

const LiveClass = () => {
  const { batchId } = useParams();
  const { user } = useAuth();

  const [meet, setMeet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showZoom, setShowZoom] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMeet = async () => {
      try {
        const data = await getMeetByBatch(batchId);
        const activeMeet = Array.isArray(data) ? data[0] : data;
        setMeet(activeMeet);
      } catch (err) {
        console.error('Error fetching meeting:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeet();
  }, [batchId]);

  const handleStartClass = () => {
    setShowZoom(true);
  };

  const isTrainer = user?.role === 'trainer' || user?.role === 'admin';

  const handleOpenInApp = () => {
    if (!meet) return;
    const meetingNumber = meet.meetingNumber.replace(/\s/g, '');
    const password = meet.password;

    // Zoom's official join-meeting web-to-app gateway
    const zoomUrl = `https://zoom.us/j/${meetingNumber}?pwd=${password}`;

    // Open in a new window/tab to reliably launch the native Zoom application
    window.open(zoomUrl, '_blank');
  };

  /* FULLSCREEN ZOOM MODE */
  if (showZoom && meet) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          background: "#000",
          zIndex: 999999,
        }}
      >
        <ZoomMeet
          meet={meet}
          role={user?.role}
          userName={user?.name}
          onError={() => setShowZoom(false)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="Entering Classroom...">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Loading session data...
        </div>
      </DashboardLayout>
    );
  }

  if (!meet) {
    return (
      <DashboardLayout title="Live Classroom">
        <div
          style={{
            textAlign: 'center',
            padding: '100px 20px',
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📵</div>

          <h2 style={{ color: '#1e293b' }}>
            Classroom Offline
          </h2>

          <p style={{ color: '#64748b', marginBottom: '32px' }}>
            This batch doesn't have an active live session.
          </p>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Classroom: ${meet.batch?.name || 'Live'}`}>
      <style>{styles}</style>

      <div className="classroom-header">
        <div>
          <span className="batch-tag">Batch Enrolled</span>

          <h3 style={{ margin: '4px 0 0 0', color: '#1e293b' }}>
            {meet.batch?.name || 'Live Class Session'}
          </h3>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Instructor
          </div>

          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            Academy Trainer
          </div>
        </div>
      </div>

      <div className="classroom-wrapper">
        <div className="classroom-overlay">

          <img
            src="https://upload.wikimedia.org/wikipedia/commons/9/9b/Zoom_Video_Communications_logo.svg"
            alt="Zoom"
            style={{
              height: '40px',
              marginBottom: '32px',
              filter: 'brightness(0) invert(1)'
            }}
          />

          <h2 style={{ marginBottom: '12px' }}>
            Your Class is Ready
          </h2>

          <p
            style={{
              opacity: 0.7,
              marginBottom: '32px',
              maxWidth: '400px',
              textAlign: 'center'
            }}
          >
            Click below to join the live classroom.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="join-now-btn"
                onClick={handleStartClass}
              >
                Enter Live Classroom
              </button>

              {isTrainer && (
                <button
                  className="join-app-btn"
                  onClick={handleOpenInApp}
                >
                  Open in Zoom App
                </button>
              )}
            </div>


          </div>

        </div>
      </div>

      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          color: '#64748b',
          fontSize: '0.85rem'
        }}
      >
        <span>
          Meeting ID: <strong>{meet.meetingNumber}</strong>
        </span>

        <span>
          Please keep this page open during the session.
        </span>
      </div>

    </DashboardLayout>
  );
};

export default LiveClass;