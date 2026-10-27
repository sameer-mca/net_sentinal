import React from 'react';

const Spinner = ({ size = 32, label }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          padding: '3px',
          background: 'conic-gradient(from 0deg, var(--cyan), var(--violet), transparent 75%)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)',
          animation: 'conicSpin 800ms linear infinite',
          boxShadow: 'var(--glow-cyan)',
        }}
      />
      {label && (
        <span className="label-xs" style={{ color: 'var(--text-dim)' }}>
          {label}
        </span>
      )}
      <style>{`
        @keyframes conicSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Spinner;
