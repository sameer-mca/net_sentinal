import React from 'react';
import Card from '../Card';
import SeverityBadge from '../SeverityBadge';
import { HardDrive } from 'lucide-react';

const RISK_BAR_COLORS = {
  critical: 'linear-gradient(90deg, #ff3b6b, #ff2bd6)',
  high: 'linear-gradient(90deg, #ff7a45, #ff3b6b)',
  medium: 'linear-gradient(90deg, #ffb020, #ff7a45)',
  low: 'linear-gradient(90deg, #2dffa0, #00e5ff)',
};

const TopRiskDevicesCard = ({ topRiskDevices = [] }) => {
  return (
    <Card
      title="High-Risk Endpoints"
      subtitle="Prioritized subnet hosts by threat severity"
      className="col-span-2"
      style={{ minHeight: '300px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {topRiskDevices.length === 0 ? (
          <div
            style={{
              padding: '36px 0',
              textAlign: 'center',
              color: 'var(--text-faint)',
              fontSize: '13px',
            }}
          >
            No high-risk endpoints identified in active inventory.
          </div>
        ) : (
          topRiskDevices.slice(0, 5).map((device) => {
            const riskLevel = (device.risk_level || 'low').toLowerCase();
            const score = Number(device.risk_score || 0);
            const scorePct = Math.min(100, Math.max(8, (score / 40) * 100));
            const barGrad = RISK_BAR_COLORS[riskLevel] || RISK_BAR_COLORS.low;

            return (
              <div
                key={device.id || device.ip_address}
                className="clay-inset"
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'rgba(7, 8, 18, 0.65)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(124, 92, 255, 0.1)',
                        border: '1px solid rgba(124, 92, 255, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <HardDrive size={16} color="var(--violet)" />
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                      <div
                        className="font-mono text-cyan"
                        style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        {device.ip_address}
                      </div>
                      {device.hostname && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-faint)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {device.hostname}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="label-xs" style={{ fontSize: '9px', lineHeight: 1 }}>Score</div>
                      <span className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        {device.risk_score}
                      </span>
                    </div>
                    <SeverityBadge severity={device.risk_level} />
                  </div>
                </div>

                {/* Thin risk bar */}
                <div className="progress-bar-bg" style={{ height: '4px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${scorePct}%`,
                      background: barGrad,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default TopRiskDevicesCard;
