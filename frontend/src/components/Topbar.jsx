import React from 'react';
import { Menu } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const Topbar = ({ title, onMenuClick }) => {
  const { connected } = useSocket();

  return (
    <header
      className="clay"
      style={{
        borderRadius: 'var(--radius-md)',
        padding: '14px 24px',
        margin: '16px 16px 0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onMenuClick}
          className="topbar-menu-btn"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: '4px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Toggle navigation"
        >
          <Menu size={22} />
        </button>

        <h1
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {title || 'NetSentinel'}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Live Socket Status Pill */}
        <div
          className="clay-inset"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            width: 'fit-content',
          }}
        >
          {connected ? (
            <span className="dot-live" />
          ) : (
            <span className="dot-offline" />
          )}
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: connected ? 'var(--green)' : 'var(--red)',
            }}
          >
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .topbar-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Topbar;
