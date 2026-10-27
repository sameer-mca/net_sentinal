import React from 'react';

const EmptyState = ({
  title = 'No Data Found',
  message = 'There is currently no data matching your criteria.',
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        margin: '12px 0',
      }}
    >
      {/* Inline SVG Radar */}
      <div
        style={{
          width: '90px',
          height: '90px',
          position: 'relative',
          marginBottom: '20px',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          {/* Concentric Circles */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(120, 140, 255, 0.15)" strokeWidth="1" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(120, 140, 255, 0.15)" strokeWidth="1" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="rgba(120, 140, 255, 0.2)" strokeWidth="1" />
          <circle cx="50" cy="50" r="4" fill="var(--cyan)" opacity="0.8" />

          {/* Crosshairs */}
          <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(120, 140, 255, 0.1)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(120, 140, 255, 0.1)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Radar Sweep Line */}
          <g style={{ transformOrigin: '50px 50px', animation: 'radarSweep 4s linear infinite' }}>
            <line x1="50" y1="50" x2="50" y2="4" stroke="var(--cyan)" strokeWidth="1.5" opacity="0.8" />
            <path
              d="M 50 50 L 50 4 A 46 46 0 0 1 85 20 Z"
              fill="url(#radarGradient)"
              opacity="0.3"
            />
          </g>

          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-head)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--text-dim)', maxWidth: '400px', margin: 0, lineHeight: 1.5 }}>
        {message}
      </p>
      {action && <div style={{ marginTop: '20px' }}>{action}</div>}

      <style>{`
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmptyState;
