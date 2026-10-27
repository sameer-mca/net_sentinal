import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NetworkVisual from '../components/NetworkVisual';
import useCountUp from '../hooks/useCountUp';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  Shield,
  Activity,
  Radio,
  BarChart3,
  Cpu,
  AlertTriangle,
  HardDrive,
  FileCheck2,
  ArrowRight,
  Menu,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

// Stat item with count-up animation
const AnimatedStatCard = ({ endVal, label, isStatic = false, staticText = '' }) => {
  const { count, elementRef } = useCountUp(endVal, 1000);

  return (
    <div
      ref={elementRef}
      className="clay clay-hover"
      style={{
        padding: '24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      <div
        className="neon-number"
        style={{
          fontSize: '44px',
          lineHeight: 1,
        }}
      >
        {isStatic ? staticText : count}
      </div>
      <div className="label-xs" style={{ color: 'var(--text-dim)', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
};

const Home = () => {
  usePageTitle('Network Traffic Analyzer & IDS');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Scroll listener for sticky glass nav
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: 'Real-Time Packet Capture',
      desc: 'Live promiscuous capture on local network adapters via Npcap alongside synthetic simulation bursts.',
      icon: Radio,
      gradient: 'linear-gradient(135deg, #00e5ff, #7c5cff)',
      color: 'var(--cyan)',
    },
    {
      title: 'Protocol & Bandwidth',
      desc: 'Instant classification of TCP, UDP, ICMP, and DNS traffic with volume metrics and transfer rates.',
      icon: BarChart3,
      gradient: 'linear-gradient(135deg, #7c5cff, #ff2bd6)',
      color: 'var(--violet)',
    },
    {
      title: 'Rule-Based Intrusion Detection',
      desc: 'Sliding time windows detecting SYN floods, ICMP storms, port scans, and payload exploit signatures.',
      icon: Cpu,
      gradient: 'linear-gradient(135deg, #ff2bd6, #ffb020)',
      color: 'var(--magenta)',
    },
    {
      title: 'Security Alert Management',
      desc: 'Categorized alerts with severity scores, source IP attribution, and operator resolution workflows.',
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #ffb020, #ff3b6b)',
      color: 'var(--amber)',
    },
    {
      title: 'Device Discovery & Inventory',
      desc: 'Automatic host recognition by MAC and IP address, tracking activity periods and risk scores.',
      icon: HardDrive,
      gradient: 'linear-gradient(135deg, #2dffa0, #00e5ff)',
      color: 'var(--green)',
    },
    {
      title: 'Reports & History',
      desc: 'Downloadable PDF audit summaries and CSV packet logs tailored for forensic post-incident analysis.',
      icon: FileCheck2,
      gradient: 'linear-gradient(135deg, #7c5cff, #00e5ff)',
      color: 'var(--violet)',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Capture',
      desc: 'Continuous promiscuous packet sniffing and header feature extraction directly at wire speed.',
    },
    {
      num: '02',
      title: 'Analyze',
      desc: 'Statistical sliding windows analyze packet throughput, connection bursts, and payload signatures.',
    },
    {
      num: '03',
      title: 'Detect',
      desc: 'Configurable threshold breaches trigger multi-rule evaluation with cooldown suppression.',
    },
    {
      num: '04',
      title: 'Visualize',
      desc: 'Live telemetry streamed over WebSockets into a real-time reactive cyber defense dashboard.',
    },
  ];

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Sticky Top Navigation */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: isScrolled ? 'rgba(22, 26, 54, 0.72)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(14px)' : 'none',
          borderBottom: isScrolled ? '1px solid var(--border)' : '1px solid transparent',
          padding: '16px 24px',
          transition: 'all 240ms ease',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'var(--grad-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--glow-cyan)',
              }}
            >
              <Shield size={20} color="#070812" strokeWidth={2.5} />
            </div>
            <span
              className="text-gradient"
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              NetSentinel
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            className="home-nav-desktop"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
            }}
          >
            <button
              onClick={() => scrollTo('features')}
              className="btn-ghost"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('how')}
              className="btn-ghost"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              How it works
            </button>

            {user ? (
              <Link to="/dashboard" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                Open Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link to="/login" className="btn btn-ghost" style={{ padding: '8px 18px' }}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                  Get Started <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="home-mobile-toggle"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '6px',
              display: 'none',
            }}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            className="clay"
            style={{
              marginTop: '12px',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <button
              onClick={() => scrollTo('features')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                textAlign: 'left',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('how')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                textAlign: 'left',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              How it works
            </button>
            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Open Dashboard
              </Link>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
        {/* HERO SECTION */}
        <section
          className="hero-grid"
          style={{
            minHeight: '88vh',
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            alignItems: 'center',
            gap: '48px',
            padding: '40px 0 60px 0',
          }}
        >
          {/* Hero Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Pill Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                background: 'rgba(22, 26, 54, 0.72)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(10px)',
                width: 'fit-content',
              }}
            >
              <span className="dot-live" />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: 'var(--cyan)',
                  textTransform: 'uppercase',
                }}
              >
                Real-time Network Intrusion Detection
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(38px, 5.5vw, 68px)',
                lineHeight: 1.06,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              See every packet.{' '}
              <span className="text-gradient">Catch every threat.</span>
            </h1>

            {/* Sub-paragraph */}
            <p
              style={{
                fontSize: '17px',
                color: 'var(--text-dim)',
                lineHeight: 1.6,
                maxWidth: '560px',
                margin: 0,
              }}
            >
              High-throughput packet analyzer and signature intrusion detection engine. Inspect live wire
              traffic, uncover anomalies, and safeguard your infrastructure in real-time.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingTop: '8px' }}>
              <Link
                to={user ? '/dashboard' : '/register'}
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '15px' }}
              >
                <span>{user ? 'Enter Dashboard' : 'Get Started'}</span>
                <ArrowRight size={18} />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="btn btn-secondary"
                  style={{ padding: '12px 26px', fontSize: '15px' }}
                >
                  Operator Login
                </Link>
              )}
            </div>

            {/* Mini Stats Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--cyan)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  6 detection rules
                </span>
              </div>
              <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--green)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Real-time streaming
                </span>
              </div>
              <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--violet)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  PDF & CSV reports
                </span>
              </div>
            </div>
          </div>

          {/* Hero Right Visual */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <NetworkVisual />
          </div>
        </section>

        {/* STATS STRIP */}
        <section style={{ padding: '40px 0 80px 0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            <AnimatedStatCard endVal={6} label="Detection Rules Active" />
            <AnimatedStatCard endVal={5} label="Protocols Analyzed" />
            <AnimatedStatCard endVal={0} isStatic={true} staticText="24/7" label="Live Wire Monitoring" />
            <AnimatedStatCard endVal={2} label="Forensic Report Formats" />
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" style={{ padding: '40px 0 80px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="label-xs" style={{ color: 'var(--cyan)' }}>
              Engine Capabilities
            </span>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 700,
                marginTop: '10px',
                letterSpacing: '-0.02em',
              }}
            >
              Everything you need to watch your network
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-dim)',
                maxWidth: '580px',
                margin: '12px auto 0 auto',
                lineHeight: 1.5,
              }}
            >
              Industrial-grade packet capture, sliding window anomaly analysis, and automated threat mitigation.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="clay clay-hover fade-up"
                  style={{
                    '--i': idx,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '28px',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: feat.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                    }}
                  >
                    <Icon size={22} color="#070812" strokeWidth={2.3} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-head)',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--text)',
                        marginBottom: '8px',
                      }}
                    >
                      {feat.title}
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: 1.55, margin: 0 }}>
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how" style={{ padding: '40px 0 80px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span className="label-xs" style={{ color: 'var(--violet)' }}>
              Architecture Workflow
            </span>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 700,
                marginTop: '10px',
                letterSpacing: '-0.02em',
              }}
            >
              How NetSentinel works
            </h2>
          </div>

          <div className="how-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', position: 'relative' }}>
            {steps.map((st, i) => (
              <div
                key={st.num}
                className="clay"
                style={{
                  padding: '28px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--surface-solid)',
                    border: '2px solid var(--cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '16px',
                    color: 'var(--cyan)',
                    boxShadow: 'var(--glow-cyan)',
                  }}
                >
                  {st.num}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {st.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.55, margin: 0 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* DASHBOARD PREVIEW MOCKUP */}
        <section style={{ padding: '40px 0 80px 0' }} aria-hidden="true">
          <div
            className="clay"
            style={{
              padding: '32px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 229, 255, 0.1)',
            }}
          >
            {/* Mock Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="dot-live" />
                <span className="label-xs" style={{ color: 'var(--cyan)' }}>
                  Live Operations Center Preview
                </span>
              </div>
              <span className="badge badge-info">SIMULATOR ACTIVE</span>
            </div>

            {/* Mock Stat Tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div className="clay-inset" style={{ padding: '16px' }}>
                <div className="label-xs">Throughput</div>
                <div className="neon-number" style={{ fontSize: '26px', marginTop: '4px' }}>
                  2.4 MB/s
                </div>
              </div>
              <div className="clay-inset" style={{ padding: '16px' }}>
                <div className="label-xs">Packets / Sec</div>
                <div className="neon-number" style={{ fontSize: '26px', marginTop: '4px', color: 'var(--violet)' }}>
                  1,840
                </div>
              </div>
              <div className="clay-inset" style={{ padding: '16px' }}>
                <div className="label-xs">Active Hosts</div>
                <div className="neon-number" style={{ fontSize: '26px', marginTop: '4px', color: 'var(--green)' }}>
                  115
                </div>
              </div>
            </div>

            {/* Mock Line Chart SVG */}
            <div
              className="clay-inset"
              style={{
                height: '160px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-faint)' }}>
                <span>REAL-TIME PACKET FLOW</span>
                <span>LAST 60 SECONDS</span>
              </div>
              <svg viewBox="0 0 500 80" style={{ width: '100%', height: '90px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 50 Q 50 15, 100 45 T 200 30 T 300 55 T 400 20 T 500 35 L 500 80 L 0 80 Z"
                  fill="url(#chartGrad)"
                />
                <path
                  d="M 0 50 Q 50 15, 100 45 T 200 30 T 300 55 T 400 20 T 500 35"
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="2.5"
                  strokeDasharray="600"
                  strokeDashoffset="600"
                  style={{ animation: 'drawLine 3s ease-out forwards' }}
                />
              </svg>
            </div>

            {/* Mock Alert Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                className="clay-inset"
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px',
                  borderLeft: '3px solid var(--red)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-critical">CRITICAL</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>SYN Flood Detected</span>
                  <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>10.10.10.66 → 192.168.1.20</span>
                </div>
                <span style={{ color: 'var(--text-faint)' }}>12s ago</span>
              </div>

              <div
                className="clay-inset"
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12.5px',
                  borderLeft: '3px solid var(--amber)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-medium">MEDIUM</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>Port Scan Probe</span>
                  <span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>10.10.10.101 (15 ports)</span>
                </div>
                <span style={{ color: 'var(--text-faint)' }}>38s ago</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section style={{ padding: '20px 0 80px 0' }}>
          <div
            className="clay"
            style={{
              padding: '48px 32px',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              background: 'linear-gradient(135deg, rgba(22, 26, 54, 0.9), rgba(12, 14, 30, 0.95))',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(26px, 3.5vw, 38px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Ready to monitor your network?
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-dim)', maxWidth: '520px', margin: 0, lineHeight: 1.5 }}>
              Deploy the rule-based intrusion detection engine in seconds with built-in simulator mode or live wire capture.
            </p>
            <Link
              to={user ? '/dashboard' : '/register'}
              className="btn btn-primary"
              style={{ padding: '12px 32px', fontSize: '15px', marginTop: '6px' }}
            >
              <span>{user ? 'Open Console' : 'Launch NetSentinel'}</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '28px 24px',
          background: 'rgba(7, 8, 18, 0.9)',
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--cyan)" />
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px' }}>
              NetSentinel
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
            &copy; {new Date().getFullYear()} NetSentinel — Network Traffic Analyzer & Intrusion Detection System.
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-faint)', maxWidth: '500px' }}>
            Note: Use only on networks you own or have permission to monitor.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }

        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding: 24px 0 40px 0 !important;
            text-align: center;
          }
          .hero-grid > div:first-child {
            align-items: center;
          }
          .hero-grid > div:first-child p {
            margin: 0 auto;
          }
          .home-nav-desktop {
            display: none !important;
          }
          .home-mobile-toggle {
            display: block !important;
          }
          .how-steps-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
