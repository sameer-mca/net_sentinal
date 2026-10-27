import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import Card from '../Card';
import { formatNumber } from '../../utils/format';

ChartJS.register(ArcElement, Tooltip, Legend);

const PROTOCOL_CONFIG = {
  TCP: { label: 'TCP', color: '#00e5ff' },
  UDP: { label: 'UDP', color: '#7c5cff' },
  ICMP: { label: 'ICMP', color: '#ff2bd6' },
  DNS: { label: 'DNS', color: '#2dffa0' },
  OTHER: { label: 'OTHER', color: '#ffb020' },
};

const ProtocolDonut = ({ protocolCounts = { TCP: 0, UDP: 0, ICMP: 0, DNS: 0, OTHER: 0 } }) => {
  const protocols = ['TCP', 'UDP', 'ICMP', 'DNS', 'OTHER'];
  const dataValues = protocols.map((p) => protocolCounts[p] || 0);
  const bgColors = protocols.map((p) => PROTOCOL_CONFIG[p].color);

  const total = dataValues.reduce((a, b) => a + b, 0);

  const chartData = {
    labels: protocols,
    datasets: [
      {
        data: total === 0 ? [1, 0, 0, 0, 0] : dataValues,
        backgroundColor:
          total === 0
            ? ['rgba(255,255,255,0.06)', 'transparent', 'transparent', 'transparent', 'transparent']
            : bgColors,
        borderWidth: 0,
        spacing: 3,
        borderRadius: 8,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 12, 30, 0.94)',
        titleColor: '#eef1ff',
        bodyColor: '#00e5ff',
        borderColor: 'rgba(0, 229, 255, 0.35)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const count = dataValues[context.dataIndex] || 0;
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatNumber(count)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <Card
      title="Protocol Breakdown"
      subtitle="Total volume breakdown"
      className="col-span-1"
      style={{ minHeight: '310px', display: 'flex', flexDirection: 'column' }}
    >
      {/* Donut Chart with HTML Center Overlay */}
      <div style={{ position: 'relative', height: '150px', marginBottom: '14px', flexShrink: 0 }}>
        <Doughnut data={chartData} options={chartOptions} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span className="label-xs" style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-faint)' }}>
            TOTAL
          </span>
          <span
            className="neon-number"
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.15,
            }}
          >
            {formatNumber(total)}
          </span>
        </div>
      </div>

      {/* Custom HTML Legend below */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px 12px',
          marginTop: 'auto',
          fontSize: '11.5px',
        }}
      >
        {protocols.map((p) => {
          const count = protocolCounts[p] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          const protoColor = PROTOCOL_CONFIG[p].color;

          return (
            <div
              key={p}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: protoColor,
                    boxShadow: `0 0 8px ${protoColor}`,
                  }}
                />
                <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: '11px' }}>{p}</span>
              </div>
              <span className="font-mono" style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ProtocolDonut;
