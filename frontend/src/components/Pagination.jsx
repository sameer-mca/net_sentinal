import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, page }) => {
  // Support both page and currentPage props
  const curr = currentPage || page || 1;
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span className="label-xs">
        Page {curr} of {totalPages}
      </span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(curr - 1)}
          disabled={curr <= 1}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <span
          style={{
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'var(--grad-cool)',
            color: '#070812',
            fontWeight: 700,
            fontSize: '12px',
            boxShadow: 'var(--glow-cyan)',
            userSelect: 'none',
          }}
        >
          {curr}
        </span>

        <button
          className="btn btn-secondary"
          onClick={() => onPageChange(curr + 1)}
          disabled={curr >= totalPages}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
