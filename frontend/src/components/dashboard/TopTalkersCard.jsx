import React from 'react';
import Card from '../Card';
import { formatBytes } from '../../utils/format';

const TopTalkersCard = ({ topTalkers = [] }) => {
  const maxBytes = topTalkers.length > 0 ? (topTalkers[0].total_bytes || topTalkers[0].bytes || 1) : 1;

  return (
    <Card
      title="Top Bandwidth Consumers"
      subtitle="Highest throughput network endpoints"
      className="col-span-2"
      style={{ minHeight: '300px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {topTalkers.length === 0 ? (
          <div
            style={{
              padding: '36px 0',
              textAlign: 'center',
              color: 'var(--text-faint)',
              fontSize: '13px',
            }}
          >
            No traffic recorded for subnet hosts yet.
          </div>
        ) : (
          topTalkers.slice(0, 5).map((host, idx) => {
            const bytes = host.total_bytes ?? host.bytes ?? 0;
            const pct = Math.min(100, Math.max(4, Math.round((bytes / maxBytes) * 100)));
            const ip = host.ip_address || host.ip || 'Unknown';

            return (
              <div
                key={idx}
                className="clay-inset"
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: 'rgba(7, 8, 18, 0.65)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        background: 'rgba(0, 229, 255, 0.1)',
                        border: '1px solid rgba(0, 229, 255, 0.25)',
                        color: 'var(--cyan)',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <span className="font-mono" style={{ color: 'var(--text)', fontWeight: 500 }}>
                      {ip}
                    </span>
                  </div>

                  <span className="font-mono text-cyan" style={{ fontSize: '12px' }}>
                    {formatBytes(bytes)}
                  </span>
                </div>

                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: 'var(--grad-cool)',
                      boxShadow: '0 0 10px rgba(0, 229, 255, 0.4)',
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

export default TopTalkersCard;
