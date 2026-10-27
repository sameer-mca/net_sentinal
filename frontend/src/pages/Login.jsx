import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import Spinner from '../components/Spinner';
import NetworkVisual from '../components/NetworkVisual';
import { usePageTitle } from '../hooks/usePageTitle';

const Login = () => {
  usePageTitle('Operator Login');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard or previous location
  useEffect(() => {
    if (user) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'stretch',
      }}
      className="auth-split-layout"
    >
      {/* Left Brand Panel (hidden under 900px) */}
      <div
        className="auth-brand-panel"
        style={{
          background: 'linear-gradient(135deg, rgba(22, 26, 54, 0.8), rgba(7, 8, 18, 0.95))',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--grad-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <Shield size={22} color="#070812" strokeWidth={2.5} />
          </div>
          <div>
            <span
              className="text-gradient"
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                display: 'block',
              }}
            >
              NetSentinel
            </span>
            <span className="label-xs" style={{ fontSize: '10px' }}>
              Network IDS
            </span>
          </div>
        </Link>

        {/* Central Graphic & Welcome Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
          <NetworkVisual maxWidth="320px" />
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                margin: '0 0 8px 0',
              }}
            >
              Welcome to NetSentinel
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', maxWidth: '380px', margin: 0, lineHeight: 1.5 }}>
              Sign in to access your live traffic telemetry, security alert triage queue, and network device inventory.
            </p>
          </div>

          {/* 3 Bullet Points with Check Icons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={16} color="var(--cyan)" style={{ flexShrink: 0 }} />
              <span>Real-time packet inspection & throughput telemetry</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={16} color="var(--violet)" style={{ flexShrink: 0 }} />
              <span>6 multi-rule sliding-window threat detectors</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={16} color="var(--green)" style={{ flexShrink: 0 }} />
              <span>Exportable compliance PDF and CSV audit logs</span>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div style={{ fontSize: '11px', color: 'var(--text-faint)', textAlign: 'center' }}>
          Defensive Network Intelligence Platform
        </div>
      </div>

      {/* Right Form Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
        }}
      >
        <div
          className="clay"
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '36px 28px',
          }}
        >
          {/* Form Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--grad-brand)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--glow-cyan)',
                marginBottom: '16px',
              }}
            >
              <Shield size={24} color="#070812" strokeWidth={2.5} />
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--text)',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Sign In to Console
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: 0 }}>
              Enter your credentials to access NetSentinel
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 59, 107, 0.12)',
                border: '1px solid rgba(255, 59, 107, 0.35)',
                color: 'var(--red)',
                fontSize: '13px',
                marginBottom: '20px',
                animation: 'fadeUp 200ms ease-out',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div style={{ lineHeight: 1.4 }}>{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">Email Address</label>
              <div
                className="clay-inset"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  gap: '10px',
                }}
              >
                <Mail size={18} color="var(--text-faint)" style={{ flexShrink: 0 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@netsentinel.local"
                  required
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-ui)',
                    width: '100%',
                    padding: '8px 0',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">Password</label>
              <div
                className="clay-inset"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  gap: '10px',
                }}
              >
                <Lock size={18} color="var(--text-faint)" style={{ flexShrink: 0 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-ui)',
                    width: '100%',
                    padding: '8px 0',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-faint)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14.5px',
                marginTop: '6px',
              }}
            >
              {submitting ? (
                <Spinner size={18} />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
              fontSize: '13.5px',
              color: 'var(--text-dim)',
            }}
          >
            Don't have an operator account?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--cyan)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Register here
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .auth-split-layout {
            grid-template-columns: 1fr !important;
          }
          .auth-brand-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
