import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Drawer from '../components/Drawer';
import Pagination from '../components/Pagination';
import SeverityBadge from '../components/SeverityBadge';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatTime, timeAgo, prettyAlertType } from '../utils/format';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  Filter,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Clock,
  Bell,
} from 'lucide-react';

const ALERT_TYPES = [
  'syn_flood',
  'port_scan',
  'icmp_flood',
  'suspicious_dns',
  'suspicious_payload',
  'malformed_packet',
];

const SEVERITY_COLORS = {
  critical: 'var(--sev-critical)',
  high: 'var(--sev-high)',
  medium: 'var(--sev-medium)',
  low: 'var(--sev-low)',
};

const SEVERITY_ICONS = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
};

const Alerts = () => {
  usePageTitle('Threat Alerts');

  const { isAdmin } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();

  // Summary State
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Filters State
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    type: '',
    source_ip: '',
    start_time: '',
    end_time: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAlerts, setTotalAlerts] = useState(0);

  // Table Data State
  const [alerts, setAlerts] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);

  // Detail Drawer State
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Unread New Alerts Banner
  const [unreadNewCount, setUnreadNewCount] = useState(0);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/alerts/summary');
      setSummary(res.data);
    } catch (err) {
      console.warn('Failed to load alerts summary:', err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch Alerts Table
  const fetchAlerts = useCallback(async () => {
    setTableLoading(true);
    setTableError(null);
    try {
      const params = {
        page,
        limit,
      };
      if (appliedFilters.severity) params.severity = appliedFilters.severity;
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.type) params.type = appliedFilters.type;
      if (appliedFilters.source_ip.trim()) params.source_ip = appliedFilters.source_ip.trim();
      if (appliedFilters.start_time) params.start_time = new Date(appliedFilters.start_time).toISOString();
      if (appliedFilters.end_time) params.end_time = new Date(appliedFilters.end_time).toISOString();

      const res = await api.get('/alerts', { params });
      setAlerts(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalAlerts(res.data.total || 0);
      setUnreadNewCount(0); // clear banner when user explicitly loads
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setTableError(err.response?.data?.message || err.message || 'Failed to load alerts.');
    } finally {
      setTableLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Socket.io Real-Time Listeners
  useEffect(() => {
    if (!socket) return;

    const handleAlertNew = () => {
      setUnreadNewCount((prev) => prev + 1);
      fetchSummary();
    };

    const handleAlertUpdated = (updatedAlert) => {
      if (!updatedAlert) return;
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a))
      );
      if (selectedAlert && selectedAlert.id === updatedAlert.id) {
        setSelectedAlert((prev) => ({ ...prev, ...updatedAlert }));
      }
      fetchSummary();
    };

    socket.on('alert:new', handleAlertNew);
    socket.on('alert:updated', handleAlertUpdated);

    return () => {
      socket.off('alert:new', handleAlertNew);
      socket.off('alert:updated', handleAlertUpdated);
    };
  }, [socket, fetchSummary, selectedAlert]);

  // Status Change Handler (Admin Only)
  const handleStatusChange = async (alertId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/alerts/${alertId}/status`, { status: newStatus });
      addToast(`Alert marked as ${newStatus}.`, 'success');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a)));
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      fetchSummary();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to update alert status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Severity quick filter from summary chips
  const handleQuickSeverityFilter = (sev) => {
    const nextSev = filters.severity === sev ? '' : sev;
    const nextFilters = { ...filters, severity: nextSev };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const reset = {
      severity: '',
      status: '',
      type: '',
      source_ip: '',
      start_time: '',
      end_time: '',
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  };

  // Status badge styling per requirement: new = cyan, acknowledged = amber, resolved = green
  const renderStatusBadge = (status) => {
    if (status === 'resolved') {
      return (
        <span className="badge badge-ok" style={{ fontSize: '10.5px' }}>
          Resolved
        </span>
      );
    }
    if (status === 'acknowledged') {
      return (
        <span className="badge badge-medium" style={{ fontSize: '10.5px' }}>
          Acknowledged
        </span>
      );
    }
    return (
      <span className="badge badge-info" style={{ fontSize: '10.5px' }}>
        New
      </span>
    );
  };

  // Extract severity counts map from summary
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  if (summary?.by_severity) {
    summary.by_severity.forEach((item) => {
      severityCounts[item.severity] = item.count;
    });
  }

  const chipsConfig = [
    { key: '', label: 'Open', color: 'var(--cyan)', count: summary?.open_count ?? 0 },
    { key: 'critical', label: 'Critical', color: 'var(--sev-critical)', count: severityCounts.critical },
    { key: 'high', label: 'High', color: 'var(--sev-high)', count: severityCounts.high },
    { key: 'medium', label: 'Medium', color: 'var(--sev-medium)', count: severityCounts.medium },
    { key: 'low', label: 'Low', color: 'var(--sev-low)', count: severityCounts.low },
  ];

  const DetailIcon = selectedAlert ? SEVERITY_ICONS[selectedAlert.severity] || AlertCircle : AlertCircle;
  const detailColor = selectedAlert ? SEVERITY_COLORS[selectedAlert.severity] || 'var(--cyan)' : 'var(--cyan)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Floating Glass Pill for Live Incoming Alerts */}
      {unreadNewCount > 0 && (
        <div
          onClick={fetchAlerts}
          className="clay"
          style={{
            position: 'sticky',
            top: '16px',
            zIndex: 100,
            alignSelf: 'center',
            padding: '10px 20px',
            background: 'rgba(7, 8, 18, 0.85)',
            border: '1px solid var(--cyan)',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: 'var(--cyan)',
            fontWeight: 600,
            boxShadow: '0 0 24px rgba(0, 229, 255, 0.35)',
            animation: 'alertPulseRing 2s infinite cubic-bezier(0.45, 0, 0.55, 1)',
          }}
        >
          <Bell size={16} />
          <span>{unreadNewCount} new alert(s) detected — Click to refresh</span>
          <RefreshCw size={13} style={{ marginLeft: '4px' }} />
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumb="NETSENTINEL / ALERTS"
        title="Threat Alerts & Incidents"
        description="Correlated rule-based detection events requiring operator investigation and remediation."
      />

      {/* 1. Summary Chips Row: 5 Clickable Glass Pills */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
        }}
      >
        {chipsConfig.map((chip) => {
          const isSelected = appliedFilters.severity === chip.key;
          return (
            <div
              key={chip.label}
              onClick={() => handleQuickSeverityFilter(chip.key)}
              className="clay clay-interactive"
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                border: isSelected
                  ? `1px solid ${chip.color}`
                  : '1px solid var(--border)',
                background: isSelected ? 'rgba(255, 255, 255, 0.07)' : 'var(--surface)',
                boxShadow: isSelected
                  ? `0 0 24px ${chip.color}55, inset 0 0 12px ${chip.color}22`
                  : undefined,
                transition: 'all 200ms ease',
              }}
              title={`Click to filter by ${chip.label}`}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: chip.color,
                      boxShadow: `0 0 8px ${chip.color}`,
                    }}
                  />
                  <span className="label-xs" style={{ color: chip.color, letterSpacing: '0.1em' }}>
                    {chip.label.toUpperCase()}
                  </span>
                </div>
                <div
                  className="neon-number"
                  style={{
                    fontSize: '26px',
                    color: chip.color,
                    textShadow: `0 0 16px ${chip.color}66`,
                  }}
                >
                  {summaryLoading ? '...' : chip.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Filter Bar */}
      <Card title="Alerts Filter" subtitle="Search and refine security incidents across time ranges and vectors">
        <form
          onSubmit={handleApplyFilters}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >
          {/* Severity */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Severity
            </label>
            <select
              className="clay-inset"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Triage Status
            </label>
            <select
              className="clay-inset"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Attack Type */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Attack Type
            </label>
            <select
              className="clay-inset"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="">All Types</option>
              {ALERT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {prettyAlertType(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Source IP */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              Source IP
            </label>
            <input
              type="text"
              className="clay-inset font-mono"
              placeholder="e.g. 10.10.10.66"
              value={filters.source_ip}
              onChange={(e) => setFilters({ ...filters, source_ip: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              From Date
            </label>
            <input
              type="datetime-local"
              className="clay-inset"
              value={filters.start_time}
              onChange={(e) => setFilters({ ...filters, start_time: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px' }}
            />
          </div>

          {/* End Time */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '6px' }}>
              To Date
            </label>
            <input
              type="datetime-local"
              className="clay-inset"
              value={filters.end_time}
              onChange={(e) => setFilters({ ...filters, end_time: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 14px', fontSize: '13px' }}>
              <Filter size={14} /> Apply
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              title="Reset Filters"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </form>
      </Card>

      {/* 3. Alerts Results Table */}
      <Card
        title="Security Incidents & Violations"
        subtitle={`Showing ${alerts.length} of ${totalAlerts} total alerts`}
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
        {tableLoading && alerts.length === 0 ? (
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
              Error loading alerts: {tableError}
            </div>
            <button onClick={fetchAlerts} className="btn btn-primary" style={{ padding: '8px 18px' }}>
              <RefreshCw size={14} /> Retry Query
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            title="No Alerts Found"
            message="No security alerts match the selected criteria."
          />
        ) : (
          <div className="table-responsive table-fade-mask" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Time</th>
                  <th>Severity</th>
                  <th>Attack Type</th>
                  <th>Source IP</th>
                  <th>Destination IP</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const sevColor = SEVERITY_COLORS[alert.severity] || 'var(--text-dim)';
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      style={{
                        cursor: 'pointer',
                        boxShadow: `inset 3px 0 0 ${sevColor}`,
                      }}
                    >
                      <td className="font-mono" style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
                        {formatTime(alert.timestamp)}
                      </td>
                      <td>
                        <SeverityBadge severity={alert.severity} />
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
                        {prettyAlertType(alert.alert_type)}
                      </td>
                      <td className="font-mono text-cyan" style={{ fontSize: '12px' }}>
                        {alert.source_ip}
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                        {alert.destination_ip}
                      </td>
                      <td
                        style={{
                          maxWidth: '280px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--text-dim)',
                          fontSize: '13px',
                        }}
                        title={alert.description}
                      >
                        {alert.description}
                      </td>
                      <td>{renderStatusBadge(alert.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </Card>

      {/* 4. Detail Drawer: Slides in from right (transform 280ms) */}
      <Drawer
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? prettyAlertType(selectedAlert.alert_type) : 'Incident Details'}
        footer={
          selectedAlert && isAdmin ? (
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedAlert.id, 'acknowledged')}
                disabled={updatingStatus || selectedAlert.status === 'acknowledged'}
                className="btn"
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  fontSize: '13px',
                  borderRadius: '999px',
                  border: '1px solid var(--amber)',
                  color: 'var(--amber)',
                  background: 'rgba(255, 176, 32, 0.1)',
                }}
              >
                <Clock size={15} /> Acknowledge
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(selectedAlert.id, 'resolved')}
                disabled={updatingStatus || selectedAlert.status === 'resolved'}
                className="btn"
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  fontSize: '13px',
                  borderRadius: '999px',
                  border: '1px solid var(--green)',
                  color: 'var(--green)',
                  background: 'rgba(45, 255, 160, 0.1)',
                }}
              >
                <CheckCircle2 size={15} /> Resolve
              </button>
            </div>
          ) : null
        }
      >
        {selectedAlert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Header Icon Tile + Alert Type */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(7, 8, 18, 0.7)',
                border: `1px solid ${detailColor}44`,
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `${detailColor}20`,
                  border: `1px solid ${detailColor}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 0 16px ${detailColor}33`,
                }}
              >
                <DetailIcon size={24} color={detailColor} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {prettyAlertType(selectedAlert.alert_type)}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <SeverityBadge severity={selectedAlert.severity} />
                  {renderStatusBadge(selectedAlert.status)}
                </div>
              </div>
            </div>

            {/* 2-Column Definition Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div className="clay-inset" style={{ padding: '12px 14px' }}>
                <span className="label-xs" style={{ display: 'block', marginBottom: '4px' }}>
                  Source IP
                </span>
                <div className="font-mono text-cyan" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {selectedAlert.source_ip}
                </div>
              </div>

              <div className="clay-inset" style={{ padding: '12px 14px' }}>
                <span className="label-xs" style={{ display: 'block', marginBottom: '4px' }}>
                  Destination IP
                </span>
                <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>
                  {selectedAlert.destination_ip}
                </div>
              </div>

              <div className="clay-inset" style={{ padding: '12px 14px' }}>
                <span className="label-xs" style={{ display: 'block', marginBottom: '4px' }}>
                  Detection Time
                </span>
                <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text)' }}>
                  {formatTime(selectedAlert.timestamp)}
                </div>
              </div>

              <div className="clay-inset" style={{ padding: '12px 14px' }}>
                <span className="label-xs" style={{ display: 'block', marginBottom: '4px' }}>
                  Relative
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {timeAgo(selectedAlert.timestamp)}
                </div>
              </div>
            </div>

            {/* Rule Association */}
            <div className="clay-inset" style={{ padding: '12px 14px' }}>
              <span className="label-xs" style={{ display: 'block', marginBottom: '4px' }}>
                Rule Triggered
              </span>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                {selectedAlert.rule_name || prettyAlertType(selectedAlert.alert_type)}
              </div>
            </div>

            {/* Description in .clay-inset block */}
            <div className="clay-inset" style={{ padding: '14px 16px' }}>
              <span className="label-xs" style={{ display: 'block', marginBottom: '8px' }}>
                Incident Description & Evidence
              </span>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text)',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono)',
                  margin: 0,
                }}
              >
                {selectedAlert.description}
              </p>
            </div>

            {/* Non-admin read-only notice */}
            {!isAdmin && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  fontSize: '12px',
                  color: 'var(--text-faint)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={15} />
                <span>Read-only view. Incident triage actions require Administrator role.</span>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Alerts;
