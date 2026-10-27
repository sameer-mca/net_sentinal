import React from 'react';

const BackgroundFX = () => {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* Animated Glowing Blobs */}
      <div className="bg-fx-blobs">
        {/* Cyan Blob - Top Left */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-100px',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'var(--cyan)',
            opacity: 0.22,
            filter: 'blur(110px)',
            animation: 'blobDrift1 26s ease-in-out infinite alternate',
          }}
        />

        {/* Violet Blob - Center Right */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '-120px',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'var(--violet)',
            opacity: 0.22,
            filter: 'blur(110px)',
            animation: 'blobDrift2 32s ease-in-out infinite alternate',
          }}
        />

        {/* Magenta Blob - Bottom Left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            left: '10%',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'var(--magenta)',
            opacity: 0.14,
            filter: 'blur(110px)',
            animation: 'blobDrift3 38s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Grid Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(120, 140, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 140, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 85%)',
          maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 85%)',
        }}
      />

      <style>{`
        @keyframes blobDrift1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(80px, 60px) scale(1.08); }
          100% { transform: translate(-40px, 80px) scale(0.95); }
        }
        @keyframes blobDrift2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-80px, -60px) scale(0.92); }
          100% { transform: translate(40px, -70px) scale(1.06); }
        }
        @keyframes blobDrift3 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -50px) scale(1.05); }
          100% { transform: translate(-50px, -60px) scale(0.96); }
        }
      `}</style>
    </div>
  );
};

export default BackgroundFX;
