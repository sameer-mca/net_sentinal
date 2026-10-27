import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Drawer = ({ isOpen, onClose, title, children, footer, width = '440px' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(4, 5, 12, 0.7)',
        backdropFilter: 'blur(6px)',
        animation: 'drawerFadeIn 200ms ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="clay"
        style={{
          width: '100%',
          maxWidth: width,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
          boxShadow: '-10px 0 45px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 229, 255, 0.1)',
          borderLeft: '1px solid var(--border)',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          animation: 'drawerSlideIn 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '3px',
                height: '16px',
                borderRadius: '2px',
                background: 'var(--grad-cool)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
            }}
            title="Close drawer"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div
            style={{
              paddingTop: '18px',
              borderTop: '1px solid var(--border)',
              marginTop: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes drawerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 600px) {
          .clay {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Drawer;
