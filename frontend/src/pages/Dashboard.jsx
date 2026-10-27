import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import CaptureControlBar from '../components/dashboard/CaptureControlBar';
import TrafficWaveform from '../components/dashboard/TrafficWaveform';
import ProtocolDonut from '../components/dashboard/ProtocolDonut';
import PacketStreamTable from '../components/dashboard/PacketStreamTable';
import LiveAlertsFeed from '../components/dashboard/LiveAlertsFeed';
import TopTalkersCard from '../components/dashboard/TopTalkersCard';
import TopRiskDevicesCard from '../components/dashboard/TopRiskDevicesCard';
import { formatNumber, formatTime } from '../utils/format';
import PageHeader from '../components/PageHeader';
import { usePageTitle } from '../hooks/usePageTitle';
import { Activity, ShieldAlert, Cpu, HardDrive, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  usePageTitle('Command Center');

  const { socket } = useSocket();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overview Data from REST API
  const [overview, setOverview] = useState(null);

  // Live Socket States
  const [captureState, setCaptureState] = useState(null);
  const [packets, setPackets] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Live Session Counters & Rolling Charts
  const [sessionPackets, setSessionPackets] = useState(0);
  const [currentBandwidthKbps, setCurrentBandwidthKbps] = useState(0);
  const [protocolCounts, setProtocolCounts] = useState({ TCP: 0, UDP: 0, ICMP: 0, DNS: 0, OTHER: 0 });
  const [waveformHistory, setWaveformHistory] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [newlyAddedAlertId, setNewlyAddedAlertId] = useState(null);

  // Rolling buffers in ref
  const statsSamplesRef = useRef([]); // Last 5 samples for bandwidth calculation
  const waveformRef = useRef([]); // 60 rolling points
  const lastStatsTimeRef = useRef(Date.now());

  // Keep isPausedRef in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Initial Data Fetch
  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/overview');
      const data = res.data;
      setOverview(data);
      setCaptureState(data.capture);

      // Populate initial alerts
      if (data.recent_alerts) {
        setRecentAlerts(data.recent_alerts);
      }

      // Populate initial protocol counts
      const protoList = data.protocol_distribution || data.stats?.protocol_distribution;
      if (protoList && Array.isArray(protoList)) {
        const counts = { TCP: 0, UDP: 0, ICMP: 0, DNS: 0, OTHER: 0 };
        protoList.forEach((item) => {
          if (counts[item.protocol] !== undefined) {
            counts[item.protocol] = Number(item.count || 0);
          }
        });
        setProtocolCounts(counts);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard overview:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();

    // Re-fetch every 30 seconds
    const interval = setInterval(() => {
      fetchOverview();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOverview]);

  // Initialize rolling waveform 60 points
  useEffect(() => {
    const points = [];
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      const t = new Date(now - i * 1000);
      points.push({
        time: t.getTime(),
        label: formatTime(t),
        packets: 0,
        bytes: 0,
      });
    }
    waveformRef.current = points;
    setWaveformHistory(points);
  }, []);

  // Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    // 1. Packet batch
    const handleTrafficBatch = (batch) => {
      if (!Array.isArray(batch) || batch.length === 0) return;

      setSessionPackets((prev) => prev + batch.length);

      if (!isPausedRef.current) {
        setPackets((prev) => {
          const combined = [...batch, ...prev];
          return combined.slice(0, 50);
        });
      }
    };

    // 2. Traffic stats
    const handleTrafficStats = (stats) => {
      if (!stats) return;

      const now = Date.now();
      lastStatsTimeRef.current = now;

      // Update bandwidth sample buffer
      const samples = statsSamplesRef.current;
      samples.push({ time: now, bytes: stats.bytes || 0, packets: stats.packets || 0 });
      if (samples.length > 5) samples.shift();

      if (samples.length >= 2) {
        const timeDiffSec = Math.max(1, (samples[samples.length - 1].time - samples[0].time) / 1000);
        const totalBytes = samples.reduce((acc, s) => acc + s.bytes, 0);
        const kbps = (totalBytes * 8) / 1000 / timeDiffSec;
        setCurrentBandwidthKbps(parseFloat(kbps.toFixed(2)));
      } else if (stats.bytes > 0) {
        setCurrentBandwidthKbps(parseFloat(((stats.bytes * 8) / 1000).toFixed(2)));
      }

      // Update waveform
      const currentPoints = [...waveformRef.current];
      currentPoints.shift();
      currentPoints.push({
        time: now,
        label: formatTime(now),
        packets: stats.packets || 0,
        bytes: stats.bytes || 0,
      });
      waveformRef.current = currentPoints;
      setWaveformHistory(currentPoints);

      // Update protocol counts
      if (stats.protocols) {
        setProtocolCounts((prev) => {
          const updated = { ...prev };
          Object.keys(stats.protocols).forEach((proto) => {
            if (updated[proto] !== undefined) {
              updated[proto] += Number(stats.protocols[proto] || 0);
            }
          });
          return updated;
        });
      }
    };

    // 3. New Alert
    const handleAlertNew = (alert) => {
      if (!alert) return;

      setNewlyAddedAlertId(alert.id);
      setRecentAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)].slice(0, 10));

      // Trigger toast for high or critical
      if (alert.severity === 'high' || alert.severity === 'critical') {
        addToast(
          `ALERT [${alert.severity.toUpperCase()}]: ${alert.description || alert.alert_type}`,
          'error',
          5000
        );
      }
    };

    // 4. Alert Updated
    const handleAlertUpdated = (alert) => {
      if (!alert) return;
      setRecentAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
    };

    // 5. Capture Status
    const handleCaptureStatus = (status) => {
      if (status) {
        setCaptureState(status);
      }
    };

    socket.on('traffic:batch', handleTrafficBatch);
    socket.on('traffic:stats', handleTrafficStats);
    socket.on('alert:new', handleAlertNew);
    socket.on('alert:updated', handleAlertUpdated);
    socket.on('capture:status', handleCaptureStatus);

    return () => {
      socket.off('traffic:batch', handleTrafficBatch);
      socket.off('traffic:stats', handleTrafficStats);
      socket.off('alert:new', handleAlertNew);
      socket.off('alert:updated', handleAlertUpdated);
      socket.off('capture:status', handleCaptureStatus);
    };
  }, [socket, addToast]);

  // Idle Bandwidth Decay
  useEffect(() => {
    const decayTimer = setInterval(() => {
      if (Date.now() - lastStatsTimeRef.current > 4000) {
        setCurrentBandwidthKbps(0);
      }
    }, 2000);
    return () => clearInterval(decayTimer);
  }, []);

  // Loading skeleton with shimmer
  if (loading && !overview) {
    return (
      <div className="dashboard-grid">
        <div className="clay shimmer col-span-4" style={{ height: '76px' }} />
        <div className="clay shimmer col-span-1" style={{ height: '136px' }} />
        <div className="clay shimmer col-span-1" style={{ height: '136px' }} />
        <div className="clay shimmer col-span-1" style={{ height: '136px' }} />
        <div className="clay shimmer col-span-1" style={{ height: '136px' }} />
        <div className="clay shimmer col-span-3" style={{ height: '310px' }} />
        <div className="clay shimmer col-span-1" style={{ height: '310px' }} />
        <div className="clay shimmer col-span-3" style={{ height: '380px' }} />
        <div className="clay shimmer col-span-1" style={{ height: '380px' }} />
        <div className="clay shimmer col-span-2" style={{ height: '300px' }} />
        <div className="clay shimmer col-span-2" style={{ height: '300px' }} />
      </div>
    );
  }

  // Error state
  if (error && !overview) {
    return (
      <div
        className="clay"
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          margin: '40px auto',
          maxWidth: '520px',
          border: '1px solid rgba(255, 59, 107, 0.3)',
          boxShadow: '0 0 32px rgba(255, 59, 107, 0.15)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255, 59, 107, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <ShieldAlert size={30} color="var(--red)" />
        </div>
        <h3 style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>
          Unable to Load Dashboard
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: 1.5 }}>
          {error}
        </p>
        <button onClick={fetchOverview} className="btn btn-primary" style={{ padding: '10px 24px' }}>
          <RefreshCw size={15} /> Retry Telemetry
        </button>
      </div>
    );
  }

  // Aggregate stats values
  const totalPacketsDisplay =
    (overview?.traffic?.total_packets || overview?.stats?.totals?.packets || 0) + sessionPackets;
  const openAlertsCount =
    overview?.alerts?.new ??
    overview?.alert_summary?.byStatus?.find((s) => s.status === 'new')?.count ??
    overview?.stats?.totals?.alerts ??
    recentAlerts.length;
  const activeDevicesCount =
    overview?.devices?.total ??
    overview?.stats?.totals?.active_devices ??
    overview?.top_risk_devices?.length ??
    0;

  const packetsSparkline = waveformHistory.map((p) => p.packets);
  const bytesSparkline = waveformHistory.map((p) => p.bytes);

  return (
    <div className="dashboard-grid">
      {/* Header Block */}
      <div className="col-span-4 fade-up" style={{ '--i': 0 }}>
        <PageHeader
          breadcrumb="NETSENTINEL / COMMAND CENTER"
          title="Live Network Telemetry"
          description="Real-time wire analysis, rule-based threat correlation, and throughput monitoring."
        />
      </div>

      {/* ROW 1: Capture Control Bar */}
      <div className="col-span-4 fade-up" style={{ '--i': 0.5 }}>
        <CaptureControlBar
          captureState={captureState}
          onStatusChange={(newState) => setCaptureState(newState)}
        />
      </div>

      {/* ROW 2: 4 Key StatCards with Sparklines & Animations */}
      <div className="col-span-1 fade-up" style={{ '--i': 1 }}>
        <StatCard
          label="Captured Packets"
          value={formatNumber(totalPacketsDisplay)}
          subtext={`+${sessionPackets} live in session`}
          icon={Activity}
          color="var(--cyan)"
          sparklineData={packetsSparkline}
        />
      </div>

      <div className="col-span-1 fade-up" style={{ '--i': 2 }}>
        <StatCard
          label="Current Bandwidth"
          value={`${currentBandwidthKbps.toFixed(1)} Kbps`}
          subtext="Throughput (last 5s)"
          icon={Cpu}
          color="var(--violet)"
          sparklineData={bytesSparkline}
        />
      </div>

      <div className="col-span-1 fade-up" style={{ '--i': 3 }}>
        <StatCard
          label="Open Threat Alerts"
          value={openAlertsCount}
          subtext="Awaiting operator triage"
          icon={ShieldAlert}
          color="var(--magenta)"
          pulse={openAlertsCount > 0}
        />
      </div>

      <div className="col-span-1 fade-up" style={{ '--i': 4 }}>
        <StatCard
          label="Tracked Endpoints"
          value={activeDevicesCount}
          subtext="Subnet hosts inventory"
          icon={HardDrive}
          color="var(--green)"
        />
      </div>

      {/* ROW 3: Charts */}
      <div className="col-span-3 fade-up" style={{ '--i': 5 }}>
        <TrafficWaveform historyPoints={waveformHistory} />
      </div>
      <div className="col-span-1 fade-up" style={{ '--i': 6 }}>
        <ProtocolDonut protocolCounts={protocolCounts} />
      </div>

      {/* ROW 4: Packet Stream & Live Alerts */}
      <div className="col-span-3 fade-up" style={{ '--i': 7 }}>
        <PacketStreamTable
          packets={packets}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
        />
      </div>
      <div className="col-span-1 fade-up" style={{ '--i': 8 }}>
        <LiveAlertsFeed
          alerts={recentAlerts}
          newlyAddedId={newlyAddedAlertId}
          severitySummary={overview?.alert_summary?.bySeverity}
        />
      </div>

      {/* ROW 5: Host Analysis & Risk Profiling */}
      <div className="col-span-2 fade-up" style={{ '--i': 9 }}>
        <TopTalkersCard topTalkers={overview?.top_talkers || overview?.stats?.top_talkers || []} />
      </div>
      <div className="col-span-2 fade-up" style={{ '--i': 10 }}>
        <TopRiskDevicesCard topRiskDevices={overview?.top_risk_devices || []} />
      </div>
    </div>
  );
};

export default Dashboard;
