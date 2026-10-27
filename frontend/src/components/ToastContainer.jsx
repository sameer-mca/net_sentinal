import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '380px',
        width: 'calc(100% - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        let barColor = 'var(--cyan)';
        let Icon = Info;
        let iconColor = 'var(--cyan)';

        if (toast.type === 'success') {
          barColor = 'var(--green)';
          Icon = CheckCircle2;
          iconColor = 'var(--green)';
        } else if (toast.type === 'error') {
          barColor = 'var(--red)';
          Icon = AlertCircle;
          iconColor = 'var(--red)';
        }

        return (
          <div
            key={toast.id}
            className="clay"
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              borderLeft: `4px solid ${barColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--surface-solid)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75)',
              pointerEvents: 'auto',
              animation: 'toastSlideIn 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '13.5px', color: 'var(--text)', wordBreak: 'break-word', lineHeight: 1.4 }}>
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn-ghost"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '6px',
              }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
