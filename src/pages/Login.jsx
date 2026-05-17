import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { loginUser } from '../api/auth.js';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lms-login-root {
    min-height: 100vh;
    display: flex;
    font-family: 'Inter', sans-serif;
  }

  /* ── Left hero panel ── */
  .lms-hero {
    flex: 1;
    background: linear-gradient(135deg, #facc15 0%, #f59e0b 40%, #d97706 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 56px;
    position: relative;
    overflow: hidden;
  }

  .lms-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 15% 30%, rgba(0,0,0,0.06) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(0,0,0,0.04) 0%, transparent 45%);
  }

  /* Decorative wave lines */
  .lms-hero-waves {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 220px;
    opacity: 0.12;
  }

  /* Floating cloud doodles */
  .lms-doodle {
    position: absolute;
    opacity: 0.13;
    color: #fff;
    font-size: 2rem;
    animation: floatDoodle 6s ease-in-out infinite;
  }
  .lms-doodle:nth-child(2) { top: 12%; left: 8%; animation-delay: 0s; }
  .lms-doodle:nth-child(3) { top: 28%; left: 72%; animation-delay: 1.5s; font-size: 1.4rem; }
  .lms-doodle:nth-child(4) { top: 55%; left: 20%; animation-delay: 3s; font-size: 1.1rem; }
  .lms-doodle:nth-child(5) { top: 70%; left: 60%; animation-delay: 0.8s; font-size: 1.8rem; }
  .lms-doodle:nth-child(6) { top: 85%; left: 10%; animation-delay: 2.2s; font-size: 1.2rem; }

  @keyframes floatDoodle {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-14px) rotate(5deg); }
  }

  .lms-hero-content { position: relative; z-index: 2; }

  .lms-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(0,0,0,0.12);
    border: 1px solid rgba(0,0,0,0.18);
    border-radius: 50px;
    padding: 6px 16px;
    color: #000000;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-bottom: 28px;
    backdrop-filter: blur(8px);
  }
  .lms-hero-badge span { width: 7px; height: 7px; background: #000000; border-radius: 50%; display: block; }

  .lms-hero h1 {
    font-size: clamp(2rem, 3.5vw, 3rem);
    font-weight: 800;
    color: #000000;
    line-height: 1.2;
    margin-bottom: 20px;
    letter-spacing: -0.02em;
  }

  .lms-hero p {
    font-size: 1.05rem;
    color: rgba(0,0,0,0.65);
    line-height: 1.7;
    max-width: 400px;
    font-weight: 400;
  }

  .lms-hero-stats {
    display: flex;
    gap: 40px;
    margin-top: 48px;
  }
  .lms-stat-item { display: flex; flex-direction: column; gap: 2px; }
  .lms-stat-num {
    font-size: 1.8rem;
    font-weight: 700;
    color: #000000;
  }
  .lms-stat-label {
    font-size: 0.78rem;
    color: rgba(0,0,0,0.55);
    font-weight: 500;
  }

  /* ── Right panel ── */
  .lms-right {
    width: 480px;
    min-width: 380px;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 48px;
    box-shadow: -8px 0 40px rgba(0,0,0,0.25);
  }

  /* Mobile-only elements — hidden on desktop */
  .lms-mobile-hero { display: none; }
  .lms-mobile-card-wrap {
    display: contents; /* transparent passthrough on desktop */
  }

  .lms-card {
    width: 100%;
    max-width: 360px;
  }

  .lms-card-header { margin-bottom: 32px; }

  .lms-card-header h2 {
    font-size: 1.6rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 6px;
  }

  .lms-card-header p {
    font-size: 0.88rem;
    color: rgba(255,255,255,0.55);
    font-weight: 400;
  }

  /* Form elements */
  .lms-form { display: flex; flex-direction: column; gap: 18px; }

  .lms-field { display: flex; flex-direction: column; gap: 6px; }

  .lms-field label {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.02em;
  }

  .lms-field input,
  .lms-field select {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    font-size: 0.92rem;
    font-family: 'Inter', sans-serif;
    color: #ffffff;
    background: rgba(255,255,255,0.07);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }

  .lms-field input:focus,
  .lms-field select:focus {
    border-color: #facc15;
    background: rgba(250,204,21,0.07);
    box-shadow: 0 0 0 3px rgba(250,204,21,0.18);
  }

  .lms-field input::placeholder { color: rgba(255,255,255,0.35); }

  /* Password wrapper */
  .lms-pw-wrap { position: relative; }
  .lms-pw-wrap input { padding-right: 44px; }
  .lms-pw-toggle {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
    transition: color 0.2s;
  }
  .lms-pw-toggle:hover { color: #facc15; }

  /* Error */
  .lms-error {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.84rem;
    color: #dc2626;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Submit button */
  .lms-btn-primary {
    width: 100%;
    padding: 13px;
    background: #facc15;
    color: #000000;
    border: none;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 14px rgba(250,204,21,0.35);
    letter-spacing: 0.01em;
  }
  .lms-btn-primary:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(250,204,21,0.5);
  }
  .lms-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .lms-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Spinner */
  .lms-spinner {
    display: inline-block;
    width: 16px; height: 16px;
    border: 2px solid rgba(0,0,0,0.25);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Role pills */
  .lms-role-pills {
    display: flex;
    gap: 8px;
  }
  .lms-role-pill {
    flex: 1;
    padding: 8px 4px;
    border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255,255,255,0.55);
    cursor: pointer;
    text-align: center;
    transition: all 0.18s;
    font-family: 'Inter', sans-serif;
  }
  .lms-role-pill:hover { border-color: #facc15; color: #facc15; }
  .lms-role-pill.active {
    border-color: #facc15;
    background: rgba(250,204,21,0.12);
    color: #facc15;
    font-weight: 600;
  }

  /* Footer link */
  .lms-footer-link {
    text-align: center;
    font-size: 0.82rem;
    color: rgba(255,255,255,0.45);
    margin-top: 4px;
  }
  .lms-footer-link a {
    color: #facc15;
    font-weight: 600;
    text-decoration: none;
  }
  .lms-footer-link a:hover { text-decoration: underline; }

  /* ── Responsive: Mobile ── */
  @media (max-width: 768px) {
    .lms-login-root {
      flex-direction: column;
      min-height: 100dvh;
      background: #000000;
    }

    /* Hide the big desktop hero */
    .lms-hero { display: none; }

    /* Compact branded top bar */
    .lms-right {
      width: 100%;
      min-width: 0;
      min-height: 100dvh;
      padding: 0;
      box-shadow: none;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
    }

    /* Inject a mini hero at the top via pseudo if needed — 
       we handle it in the JSX with lms-mobile-hero */
    .lms-mobile-hero {
      background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
      padding: 36px 24px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      position: relative;
      overflow: hidden;
    }

    .lms-mobile-hero::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0; right: 0;
      height: 36px;
      background: #000000;
      border-radius: 32px 32px 0 0;
    }

    .lms-mobile-hero img {
      height: 52px;
      width: auto;
      object-fit: contain;
      filter: brightness(0); /* make logo black on yellow */
    }

    .lms-mobile-hero-title {
      color: #000000;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      text-align: center;
      margin-top: 4px;
    }

    .lms-mobile-hero-sub {
      color: rgba(0,0,0,0.6);
      font-size: 0.8rem;
      text-align: center;
      font-weight: 500;
    }

    /* Card panel */
    .lms-mobile-card-wrap {
      flex: 1;
      padding: 8px 20px 32px;
      display: flex;
      flex-direction: column;
    }

    .lms-card {
      background: transparent;
      border-radius: 20px;
      box-shadow: none;
      padding: 28px 24px;
      max-width: 100%;
      width: 100%;
    }

    .lms-card-header { margin-bottom: 24px; }
    .lms-card-header h2 { font-size: 1.35rem; }

    /* Bigger touch targets */
    .lms-field input,
    .lms-field select {
      padding: 14px 16px;
      font-size: 1rem;
      border-radius: 12px;
    }

    .lms-btn-primary {
      padding: 15px;
      font-size: 1rem;
      border-radius: 12px;
    }

    .lms-role-pill { padding: 10px 4px; font-size: 0.85rem; }

    .lms-footer-link { font-size: 0.88rem; }
  }
`;

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await loginUser(form.email, form.password);
      login(data); // AuthContext will redirect via router
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lms-login-root">
        {/* ── Left hero ── */}
        <div className="lms-hero">
          {/* Floating doodles */}
          

          {/* Wave SVG */}
          <svg className="lms-hero-waves" viewBox="0 0 1440 220" preserveAspectRatio="none" fill="none">
            <path d="M0 160 C360 80 720 240 1440 120 L1440 220 L0 220Z" fill="white" />
            <path d="M0 180 C480 100 960 260 1440 140 L1440 220 L0 220Z" fill="white" opacity="0.5" />
          </svg>

          <div className="lms-hero-content">
            <div className="lms-hero-badge">
              <span></span>
              Learning Management System
            </div>
            <h1>Welcome to the<br />Cloud LMS</h1>
           
          </div>
        </div>

        {/* ── Right login card ── */}
        <div className="lms-right">
          {/* Mobile-only branded top bar */}
          <div className="lms-mobile-hero">
            <img src="/logo.png" alt="LMS Cloud" />
            <p className="lms-mobile-hero-title">Cloud LMS</p>
            <p className="lms-mobile-hero-sub">Sign in to continue learning</p>
          </div>

          {/* Card wrapper (provides padding on mobile) */}
          <div className="lms-mobile-card-wrap">
            <div className="lms-card">
              <div className="lms-card-header">
                <h2>Sign in to your account</h2>
                <p>Enter your credentials to access the platform</p>
              </div>

              <form className="lms-form" onSubmit={handleSubmit} noValidate>
                {error && (
                  <div className="lms-error">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <div className="lms-field">
                  <label htmlFor="lms-email">Email Address</label>
                  <input
                    id="lms-email"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>

                <div className="lms-field">
                  <label htmlFor="lms-password">Password</label>
                  <div className="lms-pw-wrap">
                    <input
                      id="lms-password"
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="lms-pw-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="lms-btn-primary" disabled={loading}>
                  {loading && <span className="lms-spinner" />}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
