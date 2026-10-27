import React from 'react';

const Card = ({ title, subtitle, action, children, className = '', style = {} }) => {
  return (
    <div className={`clay ${className}`} style={{ ...style }}>
      {(title || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '18px',
          }}
        >
          <div>
            {title && (
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
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
              </div>
            )}
            {subtitle && (
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px', marginLeft: title ? '11px' : 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
