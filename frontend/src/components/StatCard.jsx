import React, { useState, useEffect, useRef } from 'react';

const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'var(--cyan)',
  sparklineData,
  pulse = false,
  className = '',
  style = {},
}) => {
  // Numeric count-up animation (500ms)
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // If value is a string with suffix (e.g. "12.4 Kbps") or commas ("1,234") or plain number
    const isReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    if (typeof value === 'number') {
      const start = typeof prevValueRef.current === 'number' ? prevValueRef.current : 0;
      const end = value;
      if (start === end) {
        setDisplayValue(value);
        return;
      }

      const duration = 500;
      let startTime = null;
      let animId = null;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * easeOut);
        setDisplayValue(current);

        if (progress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(end);
          prevValueRef.current = end;
        }
      };

      animId = requestAnimationFrame(animate);
      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
    } else {
      // Non-plain number (formatted string like "12.4 Kbps" or "1,234")
      setDisplayValue(value);
      prevValueRef.current = value;
    }
  }, [value]);

  // Mini decorative SVG sparkline
  const renderSparkline = () => {
    const rawData =
      sparklineData && sparklineData.length >= 4
        ? sparklineData
        : [3, 5, 4, 7, 6, 8, 7, 9, 11, 10, 13, 12, 15];
    const data = rawData.slice(-20);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 84;
    const h = 24;
    const step = w / Math.max(1, data.length - 1);

    const pts = data.map((d, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - 3 - ((d - min) / range) * (h - 6)).toFixed(1);
      return `${x},${y}`;
    });

    const dLine = `M ${pts.join(' L ')}`;
    const dArea = `${dLine} L ${w},${h} L 0,${h} Z`;
    const gradId = `spark-grad-${label.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ overflow: 'visible', flexShrink: 0 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={dArea} fill={`url(#${gradId})`} />
        <path
          d={dLine}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className={`clay clay-hover ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '136px',
        padding: '22px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Top row: Label + 44px Icon Tile */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span className="label-xs" style={{ color: 'var(--text-faint)' }}>{label}</span>
        {Icon && (
          <div
            className={pulse ? 'stat-pulse-magenta' : ''}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))`,
              border: `1px solid ${pulse ? 'rgba(255, 43, 214, 0.6)' : 'rgba(120, 140, 255, 0.2)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: pulse ? '0 0 16px rgba(255, 43, 214, 0.4)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            <Icon size={20} color={color} />
          </div>
        )}
      </div>

      {/* Middle & Bottom: 36px Neon Number + Sparkline + Subtext */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <div
            className="neon-number"
            style={{
              fontSize: '36px',
              lineHeight: 1.1,
              color: color || 'var(--text)',
              textShadow: `0 0 20px ${color}55`,
            }}
          >
            {displayValue ?? 0}
          </div>
          {renderSparkline()}
        </div>

        {subtext && (
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
