import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

const NotFound = () => {
  usePageTitle('404 · Page Not Found');

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        className="clay"
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '56px 36px',
          position: 'relative',
        }}
      >
        {/* Large 120px 404 with .text-gradient and soft glow */}
        <div
          className="text-gradient"
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '120px',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginBottom: '12px',
            filter: 'drop-shadow(0 0 32px rgba(0, 229, 255, 0.45))',
          }}
        >
          404
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: '12px',
            letterSpacing: '-0.01em',
          }}
        >
          Packet Dropped / Route Not Found
        </h2>

        <p
          style={{
            fontSize: '14.5px',
            color: 'var(--text-dim)',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}
        >
          The requested telemetry endpoint or route does not exist in the NetSentinel router table.
        </p>

        <Link
          to="/dashboard"
          className="btn btn-primary"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            padding: '12px 28px',
            fontSize: '14px',
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
