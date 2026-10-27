import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../Card';
import SeverityBadge from '../SeverityBadge';
import EmptyState from '../EmptyState';
import { timeAgo, prettyAlertType } from '../../utils/format';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';

const SEVERITY_META = {
  critical: {
    color: 'var(--sev-critical)',
    bg: 'rgba(255, 59, 107, 0.15)',
    border: 'rgba(255, 59, 107, 0.4)',
    icon: ShieldAlert,
    label: 'CRITICAL',
  },
  high: {
    color: 'var(--sev-high)',
    bg: 'rgba(255, 122, 69, 0.15)',
    border: 'rgba(255, 122, 69, 0.4)',
    icon: AlertTriangle,
    label: 'HIGH',
  },
  medium: {
    color: 'var(--sev-medium)',
    bg: 'rgba(255, 176, 32, 0.15)',
    border: 'rgba(255, 176, 32, 0.4)',
    icon: AlertCircle,
    label: 'MEDIUM',
  },
  low: {
    color: 'var(--sev-low)',
    bg: 'rgba(45, 255, 160, 0.15)',
    border: 'rgba(45, 255, 160, 0.4)',
    icon: Info,
    label: 'LOW',
  },
};

const LiveAlertsFeed = ({ alerts = [], newlyAddedId = null, severitySummary = null }) => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  // Update relative timestamps every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute 2x2 severity counts
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  if (severitySummary && Array.isArray(severitySummary)) {
    severitySummary.forEach((item) => {
      const sev = (item.severity || '').toLowerCase();
      if (severityCounts[sev] !== undefined) {
        severityCounts[sev] = Number(item.count || 0);
      }
    });
  } else {
    alerts.forEach((a) => {
      const sev = (a.severity || '').toLowerCase();
      if (severityCounts[sev] !== undefined) {
        severityCounts[sev]++;
      }
    });
  }

  const viewAllAction = (
    <button
      onClick={() => navigate('/alerts')}
      className="btn btn-ghost"
      style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--cyan)' }}
    >
      <span>View All</span>
      <ArrowRight size={13} />
    </button>
  );

  return (
    <Card
      title="Live Threat Feed"
      subtitle="Correlated intrusion alerts"
      action={viewAllAction}
      className="col-span-1"
      style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}
    >
      {/* 2x2 Grid Severity Summary Chips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '14px',
          flexShrink: 0,
        }}
      >
        {['critical', 'high', 'medium', 'low'].map((sev) => {
          const meta = SEVERITY_META[sev];
          const count = severityCounts[sev];
          return (
            <div
              key={sev}
              className="clay-inset"
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(7, 8, 18, 0.7)',
                border: `1px solid ${count > 0 ? meta.border : 'var(--border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: meta.color,
                    boxShadow: count > 0 ? `0 0 8px ${meta.color}` : 'none',
                  }}
                />
                <span className="label-xs" style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                  {meta.label}
                </span>
              </div>
              <span
                className="neon-number"
                style={{
                  fontSize: '15px',
                  lineHeight: 1,
                  color: count > 0 ? meta.color : 'var(--text-dim)',
                  textShadow: count > 0 ? `0 0 10px ${meta.color}66` : 'none',
                }}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alerts Feed List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          overflowY: 'auto',
          maxHeight: '320px',
          flex: 1,
        }}
      >
        {alerts.length === 0 ? (
          <EmptyState
            title="No Threats Detected"
            message="Rule engine active. All network segments are quiet."
          />
        ) : (
          alerts.slice(0, 10).map((alert) => {
            const isNew = alert.id === newlyAddedId;
            const meta = SEVERITY_META[alert.severity?.toLowerCase()] || SEVERITY_META.medium;
            const Icon = meta.icon;
            const isCritical = alert.severity?.toLowerCase() === 'critical';

            return (
              <div
                key={alert.id || alert.timestamp + alert.source_ip}
                onClick={() => navigate('/alerts')}
                className={`clay-inset ${isNew ? 'alert-item-new' : ''} ${isCritical ? 'alert-critical-pulse' : ''}`}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderLeft: `4px solid ${meta.color}`,
                  background: 'rgba(7, 8, 18, 0.65)',
                  transition: 'all 180ms ease',
                  boxShadow: isNew ? `0 0 20px ${meta.color}44` : 'none',
                }}
              >
                {/* 32px Circular Icon Tile */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: meta.bg,
                    border: `1px solid ${meta.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={meta.color} />
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-head)',
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.25,
                      marginBottom: '3px',
                    }}
                  >
                    {prettyAlertType(alert.alert_type)}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                    }}
                  >
                    <span className="font-mono text-cyan" style={{ fontSize: '11px' }}>
                      {alert.source_ip}
                    </span>
                    <span style={{ color: 'var(--text-faint)' }}>•</span>
                    <span style={{ color: 'var(--text-faint)' }}>
                      {timeAgo(alert.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Severity Badge */}
                <div style={{ flexShrink: 0 }}>
                  <SeverityBadge severity={alert.severity} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default LiveAlertsFeed;
