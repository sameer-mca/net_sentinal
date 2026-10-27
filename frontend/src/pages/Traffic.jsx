import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';
import Card from '../components/Card';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatBytes, formatTime, formatNumber } from '../utils/format';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Chart } from 'react-chartjs-2';
import { Filter, RotateCcw, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PROTO_COLORS = {
  TCP: 'var(--cyan)',
  UDP: 'var(--violet)',
  ICMP: 'var(--magenta)',
  DNS: 'var(--green)',
  OTHER: 'var(--amber)',
};

const getIsoLocalString = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

// Custom Chart.js glow plugin for alerts line
const chartGlowPlugin = {
  id: 'trafficChartGlow',
  beforeDatasetDraw(chart, args) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(args.index);
    if (meta.type === 'line') {
      ctx.save();
      ctx.shadowColor = meta.dataset?.options?.borderColor || 'rgba(0, 229, 255, 0.5)';
      ctx.shadowBlur = 10;
    }
  },
  afterDatasetDraw(chart, args) {
    const meta = chart.getDatasetMeta(args.index);
    if (meta.type === 'line') {
      chart.ctx.restore();
    }
  },
};

const Traffic = () => {
  usePageTitle('Traffic Explorer');

  // Protocol list
  const [protocols, setProtocols] = useState(['TCP', 'UDP', 'ICMP', 'DNS']);

  // Filters State
  const defaultStart = getIsoLocalString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const defaultEnd = getIsoLocalString(new Date());

  const [filters, setFilters] = useState({
    protocol: '',
    src_ip: '',
    dst_ip: '',
    port: '',
    status: '',
    start_time: defaultStart,
    end_time: defaultEnd,
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Table Data State
  const [trafficData, setTrafficData] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);

  // Historical Stats State
  const [historyMinutes, setHistoryMinutes] = useState(60); // 60, 360, 1440
  const [statsTimeline, setStatsTimeline] = useState([]);
  const [topPorts, setTopPorts] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // 7-Day History State
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  // Load Protocols
  useEffect(() => {
    api
      .get('/traffic/protocols')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setProtocols(res.data);
        }
      })
      .catch((err) => console.warn('Could not load protocols:', err.message));
  }, []);

  // Fetch Table Data
  const fetchTraffic = useCallback(async () => {
    setTableLoading(true);
    setTableError(null);
    try {
      const params = {
        page,
        limit,
      };
      if (appliedFilters.protocol) params.protocol = appliedFilters.protocol;
      if (appliedFilters.src_ip.trim()) params.src_ip = appliedFilters.src_ip.trim();
      if (appliedFilters.dst_ip.trim()) params.dst_ip = appliedFilters.dst_ip.trim();
      if (appliedFilters.port.trim()) params.port = appliedFilters.port.trim();
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.start_time) params.start_time = new Date(appliedFilters.start_time).toISOString();
      if (appliedFilters.end_time) params.end_time = new Date(appliedFilters.end_time).toISOString();

      const res = await api.get('/traffic', { params });
      setTrafficData(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalRecords(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch traffic table:', err);
      setTableError(err.response?.data?.message || err.message || 'Failed to fetch traffic');
    } finally {
      setTableLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  // Fetch Timeline Stats
  useEffect(() => {
    setStatsLoading(true);
    api
      .get(`/traffic/stats?minutes=${historyMinutes}`)
      .then((res) => {
        setStatsTimeline(res.data.timeline || []);
        setTopPorts(res.data.top_ports || []);
      })
      .catch((err) => console.warn('Failed to fetch traffic stats timeline:', err.message))
      .finally(() => setStatsLoading(false));
  }, [historyMinutes]);

  // Fetch 7-Day History Summary
  useEffect(() => {
    setWeeklyLoading(true);
    api
      .get('/reports/history-summary?days=7')
      .then((res) => {
        setWeeklyHistory(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.warn('Failed to fetch weekly history:', err.message))
      .finally(() => setWeeklyLoading(false));
  }, []);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const reset = {
      protocol: '',
      src_ip: '',
      dst_ip: '',
      port: '',
      status: '',
      start_time: defaultStart,
      end_time: defaultEnd,
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  };

  // Timeline Chart Config (Dual Axis styled like Dashboard waveform)
  const timelineChartData = {
    labels: statsTimeline.map((item) => {
      const d = new Date(item.time);
      return isNaN(d) ? item.time : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        type: 'line',
        label: 'Packets/min',
        data: statsTimeline.map((item) => item.packets),
        borderColor: '#00e5ff',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
          gradient.addColorStop(1, 'rgba(0, 229, 255, 0.00)');
          return gradient;
        },
        fill: true,
        borderWidth: 2,
        tension: 0.35,
        yAxisID: 'yPackets',
        pointRadius: statsTimeline.length > 30 ? 0 : 3,
        pointBackgroundColor: '#00e5ff',
      },
      {
        type: 'line',
        label: 'Bytes/min',
        data: statsTimeline.map((item) => item.bytes),
        borderColor: '#7c5cff',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        yAxisID: 'yBytes',
        pointRadius: statsTimeline.length > 30 ? 0 : 3,
        pointBackgroundColor: '#7c5cff',
      },
    ],
  };

  const timelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: 'var(--text-faint)', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 8 },
      },
      yPackets: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(120, 140, 255, 0.08)', drawBorder: false },
        ticks: { color: 'var(--cyan)', font: { family: 'JetBrains Mono', size: 10 } },
        title: { display: true, text: 'Packets', color: 'var(--cyan)', font: { size: 10, family: 'Space Grotesk' } },
      },
      yBytes: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: 'var(--violet)',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (v) => formatBytes(v, 0),
        },
        title: { display: true, text: 'Volume', color: 'var(--violet)', font: { size: 10, family: 'Space Grotesk' } },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text)',
          font: { family: 'Space Grotesk', size: 11 },
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 12, 30, 0.94)',
        titleColor: '#eef1ff',
        borderColor: 'rgba(0, 229, 255, 0.35)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8,
        titleFont: { family: 'Space Grotesk', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === 'yBytes') return `Bytes: ${formatBytes(ctx.raw)}`;
            return `Packets: ${formatNumber(ctx.raw)}`;
          },
        },
      },
    },
  };

  // 7-Day History Mixed Chart Config
  const weeklyChartData = {
    labels: weeklyHistory.map((item) => item.date),
    datasets: [
      {
        type: 'bar',
        label: 'Packets',
        data: weeklyHistory.map((item) => item.packets),
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(0, 229, 255, 0.4)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, '#00e5ff');
          gradient.addColorStop(1, '#7c5cff');
          return gradient;
        },
        borderRadius: 8,
        maxBarThickness: 36,
        yAxisID: 'yWeeklyPackets',
      },
      {
        type: 'line',
        label: 'Threat Alerts',
        data: weeklyHistory.map((item) => item.alerts),
        borderColor: '#ff2bd6',
        backgroundColor: '#ff2bd6',
        borderWidth: 2.5,
        tension: 0.3,
        yAxisID: 'yWeeklyAlerts',
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ff2bd6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
      },
    ],
  };

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: 'var(--text-faint)', font: { family: 'JetBrains Mono', size: 10 } },
      },
      yWeeklyPackets: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(120, 140, 255, 0.08)', drawBorder: false },
        ticks: { color: 'var(--cyan)', font: { family: 'JetBrains Mono', size: 10 } },
      },
      yWeeklyAlerts: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: 'var(--magenta)', stepSize: 1, font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'var(--text)',
          font: { family: 'Space Grotesk', size: 11 },
          boxWidth: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 12, 30, 0.94)',
        titleColor: '#eef1ff',
        borderColor: 'rgba(255, 43, 214, 0.35)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Space Grotesk', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
      },
    },
  };

  const chartPlugins = useMemo(() => [chartGlowPlugin], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <PageHeader
        breadcrumb="NETSENTINEL / TRAFFIC"
        title="Traffic Explorer"
        description="Inspect and filter real-time and historical wire packets across all subnet interfaces."
      />

      {/* 1. Filter Bar: Glass Card with 12-Column Responsive Grid */}
      <Card title="Traffic Explorer Filters" subtitle="Query wire traffic by endpoints, protocols, and time intervals">
        <form onSubmit={handleApplyFilters} className="traffic-filter-grid">
          {/* Protocol - 2 cols */}
          <div className="filter-col-2">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Protocol
            </label>
            <select
              className="clay-inset"
              value={filters.protocol}
              onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="">All Protocols</option>
              {protocols.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Source IP - 2 cols */}
          <div className="filter-col-2">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Source IP
            </label>
            <input
              type="text"
              className="clay-inset font-mono"
              placeholder="e.g. 192.168.1.10"
              value={filters.src_ip}
              onChange={(e) => setFilters({ ...filters, src_ip: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          {/* Destination IP - 2 cols */}
          <div className="filter-col-2">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Destination IP
            </label>
            <input
              type="text"
              className="clay-inset font-mono"
              placeholder="e.g. 142.250.1.1"
              value={filters.dst_ip}
              onChange={(e) => setFilters({ ...filters, dst_ip: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          {/* Port - 1 col */}
          <div className="filter-col-1">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Port
            </label>
            <input
              type="text"
              className="clay-inset font-mono"
              placeholder="80, 443..."
              value={filters.port}
              onChange={(e) => setFilters({ ...filters, port: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }}
            />
          </div>

          {/* Status - 1 col */}
          <div className="filter-col-1">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Status
            </label>
            <select
              className="clay-inset"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }}
            >
              <option value="">All</option>
              <option value="normal">Normal</option>
              <option value="suspicious">Suspicious</option>
            </select>
          </div>

          {/* Start Time - 2 cols */}
          <div className="filter-col-2">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Start Time
            </label>
            <input
              type="datetime-local"
              className="clay-inset"
              value={filters.start_time}
              onChange={(e) => setFilters({ ...filters, start_time: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px' }}
            />
          </div>

          {/* End Time - 2 cols */}
          <div className="filter-col-2">
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              End Time
            </label>
            <input
              type="datetime-local"
              className="clay-inset"
              value={filters.end_time}
              onChange={(e) => setFilters({ ...filters, end_time: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px' }}
            />
          </div>

          {/* Actions - Span remaining width / inline */}
          <div className="filter-actions" style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Filter size={14} /> Apply
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: '13px' }}
              title="Reset Filters"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </form>

        <style>{`
          .traffic-filter-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 12px;
            align-items: end;
          }
          .filter-col-2 { grid-column: span 2; }
          .filter-col-1 { grid-column: span 1; }
          .filter-actions { grid-column: span 12; justify-content: flex-end; margin-top: 4px; }

          @media (max-width: 1200px) {
            .filter-col-2 { grid-column: span 4; }
            .filter-col-1 { grid-column: span 2; }
          }
          @media (max-width: 768px) {
            .traffic-filter-grid {
              grid-template-columns: 1fr !important;
            }
            .filter-col-2, .filter-col-1, .filter-actions {
              grid-column: span 1 !important;
            }
            .filter-actions {
              justify-content: stretch !important;
            }
            .filter-actions button {
              flex: 1;
            }
          }
        `}</style>
      </Card>

      {/* 2. Charts Row: Historical Overview & 7-Day History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Historical Overview */}
        <Card
          title="Historical Throughput Overview"
          subtitle="Packets and bytes per minute"
          action={
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
              {[
                { label: '1h', val: 60 },
                { label: '6h', val: 360 },
                { label: '24h', val: 1440 },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => setHistoryMinutes(btn.val)}
                  style={{
                    background: historyMinutes === btn.val ? 'var(--grad-cool)' : 'transparent',
                    color: historyMinutes === btn.val ? '#04101a' : 'var(--text-faint)',
                    boxShadow: historyMinutes === btn.val ? '0 0 14px rgba(0, 229, 255, 0.35)' : 'none',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 180ms ease',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          }
        >
          <div style={{ height: '220px', position: 'relative' }}>
            {statsLoading ? (
              <div className="shimmer" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)' }} />
            ) : statsTimeline.length === 0 ? (
              <EmptyState title="No timeline data" message="No packets recorded in this time range." />
            ) : (
              <Line data={timelineChartData} options={timelineChartOptions} />
            )}
          </div>

          {/* Top Ports Chips with small cyan dots */}
          {topPorts.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="label-xs">Top Ports:</span>
              {topPorts.map((tp, idx) => (
                <span
                  key={idx}
                  className="clay-inset"
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(7, 8, 18, 0.7)',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--cyan)',
                      boxShadow: '0 0 6px var(--cyan)',
                    }}
                  />
                  <span>Port {tp.port}:</span>
                  <strong style={{ color: 'var(--cyan)' }}>{formatNumber(tp.count)}</strong>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* 7-Day History */}
        <Card title="7-Day Activity & Threat Trends" subtitle="Daily packet volume vs threat alerts">
          <div style={{ height: '220px', position: 'relative' }}>
            {weeklyLoading ? (
              <div className="shimmer" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-sm)' }} />
            ) : weeklyHistory.length === 0 ? (
              <EmptyState title="No weekly data" message="Daily summaries will appear as traffic is recorded." />
            ) : (
              <Chart type="bar" data={weeklyChartData} options={weeklyChartOptions} plugins={chartPlugins} />
            )}
          </div>
        </Card>
      </div>

      {/* 3. Results Table Card */}
      <Card
        title="Captured Packet Records"
        subtitle={`Showing ${trafficData.length} of ${formatNumber(totalRecords)} matched packets`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label-xs">Per page:</span>
            <select
              className="clay-inset"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '8px' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        }
      >
        {tableLoading && trafficData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="shimmer" style={{ height: '42px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : tableError ? (
          <div
            className="clay"
            style={{
              textAlign: 'center',
              padding: '36px',
              border: '1px solid rgba(255, 59, 107, 0.3)',
              margin: '12px 0',
            }}
          >
            <ShieldAlert size={32} color="var(--red)" style={{ marginBottom: '12px' }} />
            <div style={{ color: 'var(--red)', fontSize: '14px', marginBottom: '16px' }}>
              Error loading traffic records: {tableError}
            </div>
            <button onClick={fetchTraffic} className="btn btn-primary" style={{ padding: '8px 18px' }}>
              <RefreshCw size={14} /> Retry Query
            </button>
          </div>
        ) : trafficData.length === 0 ? (
          <EmptyState
            title="No Packets Matched"
            message="No network packets matched your filter parameters. Try expanding your date range or adjusting IP filters."
          />
        ) : (
          <div className="table-responsive table-fade-mask" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Time</th>
                  <th>Source IP : Port</th>
                  <th>Destination IP : Port</th>
                  <th>Protocol</th>
                  <th>Size</th>
                  <th>Flags</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trafficData.map((pkt) => {
                  const isSuspicious = pkt.status === 'suspicious';
                  const protoColor = PROTO_COLORS[pkt.protocol] || 'var(--text-dim)';

                  return (
                    <tr key={pkt.id} className={isSuspicious ? 'row-suspicious' : ''}>
                      <td className="font-mono" style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
                        {formatTime(pkt.timestamp)}
                      </td>
                      <td className="font-mono" style={{ color: isSuspicious ? 'var(--red)' : 'var(--cyan)' }}>
                        {pkt.src_ip}
                        <span style={{ color: 'var(--text-faint)' }}>:{pkt.src_port ?? '-'}</span>
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text)' }}>
                        {pkt.dst_ip}
                        <span style={{ color: 'var(--text-faint)' }}>:{pkt.dst_port ?? '-'}</span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: protoColor,
                            border: `1px solid ${protoColor}40`,
                          }}
                        >
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                        {pkt.packet_size} B
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text-faint)', fontSize: '11.5px' }}>
                        {pkt.tcp_flags || '-'}
                      </td>
                      <td>
                        <span
                          className={`badge ${isSuspicious ? 'badge-critical' : 'badge-muted'}`}
                          style={{ fontSize: '10px', padding: '2px 8px' }}
                        >
                          {isSuspicious && (
                            <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
                          )}
                          {pkt.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </Card>
    </div>
  );
};

export default Traffic;
