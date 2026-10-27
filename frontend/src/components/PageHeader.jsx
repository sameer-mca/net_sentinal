import React from 'react';

const PageHeader = ({ breadcrumb, title, description, actions }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      <div>
        {breadcrumb && (
          <div className="label-xs" style={{ color: 'var(--text-faint)', marginBottom: '4px' }}>
            {breadcrumb}
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: '48px',
            height: '3px',
            background: 'var(--grad-brand)',
            borderRadius: '999px',
            marginTop: '8px',
            marginBottom: '8px',
          }}
        />
        {description && (
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--text-dim)',
              margin: 0,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
