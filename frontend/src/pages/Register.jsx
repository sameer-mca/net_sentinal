import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield, User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import Spinner from '../components/Spinner';
import NetworkVisual from '../components/NetworkVisual';
import { usePageTitle } from '../hooks/usePageTitle';

const Register = () => {
  usePageTitle('Create Account');
  const { register, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Compute presentation-only password strength (0 to 4)
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(password);

  const getStrengthColor = (score) => {
    if (score <= 1) return 'var(--red)';
    if (score <= 3) return 'var(--amber)';
    return 'var(--green)';
  };

  const validate = () => {
    if (!name.trim() || name.trim().length < 2) {
      return 'Full name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) {
      return 'Password must contain at least one letter and one number.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      addToast('Registration successful! Please sign in with your credentials.', 'success');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
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
              Create Operator Account
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', maxWidth: '380px', margin: 0, lineHeight: 1.5 }}>
              Register as a security analyst to monitor network packets, analyze attack signatures, and generate reports.
            </p>
          </div>

          {/* 3 Bullet Points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={16} color="var(--cyan)" style={{ flexShrink: 0 }} />
              <span>Dedicated analyst workspace with live traffic stream</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={16} color="var(--violet)" style={{ flexShrink: 0 }} />
              <span>Full visibility into active network devices and risk scores</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: 'var(--text-dim)' }}>
              <CheckCircle2 size={16} color="var(--green)" style={{ flexShrink: 0 }} />
              <span>Secure cryptographic session tokens with role-based isolation</span>
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
            padding: '32px 28px',
          }}
        >
          {/* Form Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
                marginBottom: '14px',
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
              Register Analyst
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: 0 }}>
              Join the monitoring team with a standard user account
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
                marginBottom: '18px',
                animation: 'fadeUp 200ms ease-out',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div style={{ lineHeight: 1.4 }}>{error}</div>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label className="label-xs">Full Name</label>
              <div
                className="clay-inset"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  gap: '10px',
                }}
              >
                <User size={18} color="var(--text-faint)" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alice Smith"
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

            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                  placeholder="alice@netsentinel.local"
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                  placeholder="Min 8 chars, 1 letter, 1 number"
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

              {/* Password Strength Meter (4 Segments) */}
              {password && (
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        style={{
                          height: '3px',
                          borderRadius: '2px',
                          backgroundColor:
                            seg <= strengthScore
                              ? getStrengthColor(strengthScore)
                              : 'rgba(255, 255, 255, 0.1)',
                          transition: 'background-color 200ms ease',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '10px', color: getStrengthColor(strengthScore), textAlign: 'right' }}>
                    {strengthScore <= 1 && 'Weak password'}
                    {strengthScore === 2 && 'Fair password'}
                    {strengthScore === 3 && 'Good password'}
                    {strengthScore === 4 && 'Strong password'}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label className="label-xs">Confirm Password</label>
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              fontSize: '13px',
              color: 'var(--text-dim)',
            }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--cyan)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Sign in
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

export default Register;
