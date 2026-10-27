import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../Card';
import { formatBytes } from '../../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom Chart.js plugin to render neon glow underneath the waveform stroke
const lineGlowPlugin = {
  id: 'waveformGlow',
  beforeDatasetDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore();
  },
};

const TrafficWaveform = ({ historyPoints = [] }) => {
  const [metric, setMetric] = useState('packets'); // 'packets' or 'bytes'

  const labels = historyPoints.map((pt) => pt.label || '');
  const dataValues = historyPoints.map((pt) => (metric === 'packets' ? pt.packets : pt.bytes));

  const chartData = {
    labels,
    datasets: [
      {
        fill: true,
        label: metric === 'packets' ? 'Packets/sec' : 'Bytes/sec',
        data: dataValues,
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#00e5ff',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        borderColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return '#00e5ff';
          const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
          gradient.addColorStop(0, '#00e5ff');
          gradient.addColorStop(1, '#7c5cff');
          return gradient;
        },
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
          gradient.addColorStop(1, 'rgba(0, 229, 255, 0.00)');
          return gradient;
        },
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: 'var(--text-faint)',
          font: { family: 'JetBrains Mono', size: 10 },
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(120, 140, 255, 0.08)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--text-dim)',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (value) => (metric === 'packets' ? value : formatBytes(value, 0)),
        },
      },
    },
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
        displayColors: false,
        titleFont: { family: 'Space Grotesk', size: 12, weight: '600' },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            return metric === 'packets' ? `${val} pkt/s` : `${formatBytes(val)}/s`;
          },
        },
      },
    },
  };

  const plugins = useMemo(() => [lineGlowPlugin], []);

  const toggleControls = (
    <div
      className="clay-inset"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px',
        borderRadius: '999px',
        background: 'rgba(7, 8, 18, 0.8)',
      }}
    >
      <button
        type="button"
        onClick={() => setMetric('packets')}
        style={{
          background: metric === 'packets' ? 'var(--grad-cool)' : 'transparent',
          color: metric === 'packets' ? '#04101a' : 'var(--text-faint)',
          boxShadow: metric === 'packets' ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none',
          border: 'none',
          borderRadius: '999px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 180ms ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: metric === 'packets' ? '#04101a' : 'var(--cyan)',
          }}
        />
        Packets/s
      </button>
      <button
        type="button"
        onClick={() => setMetric('bytes')}
        style={{
          background: metric === 'bytes' ? 'var(--grad-cool)' : 'transparent',
          color: metric === 'bytes' ? '#04101a' : 'var(--text-faint)',
          boxShadow: metric === 'bytes' ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none',
          border: 'none',
          borderRadius: '999px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 180ms ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: metric === 'bytes' ? '#04101a' : 'var(--violet)',
          }}
        />
        Bytes/s
      </button>
    </div>
  );

  return (
    <Card
      title="Live Traffic Waveform"
      subtitle="Rolling 60-second throughput stream"
      action={toggleControls}
      className="col-span-3"
      style={{ minHeight: '310px', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, minHeight: '220px', position: 'relative' }}>
        <Line data={chartData} options={chartOptions} plugins={plugins} />
      </div>
    </Card>
  );
};

export default TrafficWaveform;
