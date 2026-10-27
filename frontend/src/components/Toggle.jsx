import React from 'react';

const Toggle = ({ checked, onChange, disabled = false, label, id }) => {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !disabled && onChange) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        onClick={() => !disabled && onChange && onChange(!checked)}
        className="clay-inset"
        style={{
          width: '46px',
          height: '24px',
          borderRadius: '999px',
          padding: '2px',
          position: 'relative',
          transition: 'all 200ms ease',
          background: checked
            ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.35), rgba(124, 92, 255, 0.35))'
            : 'rgba(7, 8, 18, 0.8)',
          border: checked ? '1px solid rgba(0, 229, 255, 0.55)' : '1px solid var(--border)',
          boxShadow: checked ? '0 0 16px rgba(0, 229, 255, 0.3)' : 'inset 0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: checked ? 'var(--grad-cool)' : 'var(--text-faint)',
            boxShadow: checked ? '0 0 12px rgba(0, 229, 255, 0.85)' : 'none',
            transform: checked ? 'translateX(22px)' : 'translateX(0)',
            transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), background 200ms ease',
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>
          {label}
        </span>
      )}
    </label>
  );
};

export default Toggle;
