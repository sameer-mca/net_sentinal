import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDebounce from '../hooks/useDebounce';
import Card from '../components/Card';
import Modal from '../components/Modal';
import SeverityBadge from '../components/SeverityBadge';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatBytes, formatTime, timeAgo, prettyAlertType, formatNumber } from '../utils/format';
import {
  Laptop,
  Server,
  Smartphone,
  HardDrive,
  Router as RouterIcon,
  Cpu,
  HelpCircle,
  Monitor,
  Edit2,
  ShieldAlert,
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

const DEVICE_TYPES = ['unknown', 'laptop', 'desktop', 'server', 'mobile', 'iot', 'router'];

const getDeviceIcon = (type, size = 18) => {
  switch (String(type || '').toLowerCase()) {
    case 'laptop':
      return <Laptop size={size} />;
    case 'desktop':
      return <Monitor size={size} />;
    case 'server':
      return <Server size={size} />;
    case 'mobile':
      return <Smartphone size={size} />;
    case 'iot':
      return <Cpu size={size} />;
    case 'router':
      return <RouterIcon size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
};

const getDeviceTypeGradient = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'server':
      return 'linear-gradient(135deg, rgba(124, 92, 255, 0.25), rgba(255, 43, 214, 0.2))';
    case 'router':
      return 'linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(124, 92, 255, 0.2))';
    case 'mobile':
      return 'linear-gradient(135deg, rgba(45, 255, 160, 0.25), rgba(0, 229, 255, 0.2))';
    case 'iot':
      return 'linear-gradient(135deg, rgba(255, 176, 32, 0.25), rgba(255, 59, 107, 0.2))';
    default:
      return 'linear-gradient(135deg, rgba(0, 229, 255, 0.18), rgba(124, 92, 255, 0.18))';
  }
};

const getRiskBarGradient = (level) => {
  switch (String(level || '').toLowerCase()) {
    case 'critical':
      return 'linear-gradient(90deg, #ff3b6b, #ff2bd6)';
    case 'high':
      return 'linear-gradient(90deg, #ff7a45, #ff3b6b)';
    case 'medium':
      return 'linear-gradient(90deg, #ffb020, #ff7a45)';
    case 'low':
    default:
      return 'linear-gradient(90deg, #2dffa0, #00e5ff)';
  }
};

const Devices = () => {
  usePageTitle('Device Inventory');

  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('last_seen');

  // Modals
  const [selectedDeviceForAlerts, setSelectedDeviceForAlerts] = useState(null);
  const [deviceAlerts, setDeviceAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const [editingDevice, setEditingDevice] = useState(null);
  const [editForm, setEditForm] = useState({ hostname: '', device_type: 'unknown' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch devices
  const fetchDevices = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      try {
        const response = await api.get('/devices');
        setDevices(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to fetch devices:', err);
        if (!isBackground) {
          addToast(err.response?.data?.message || 'Failed to load device inventory', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(() => {
      fetchDevices(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Open Alerts Modal
  const handleOpenAlertsModal = async (device) => {
    setSelectedDeviceForAlerts(device);
    setLoadingAlerts(true);
    setDeviceAlerts([]);

    try {
      const res = await api.get(`/devices/${device.id}`);
      setDeviceAlerts(res.data?.alerts || []);
    } catch (err) {
      console.error('Failed to load device alerts:', err);
      addToast('Failed to load alerts for this device', 'error');
    } finally {
      setLoadingAlerts(false);
    }
  };

  // Open Edit Modal (Admin)
  const handleOpenEditModal = (device, e) => {
    e.stopPropagation();
    setEditingDevice(device);
    setEditForm({
      hostname: device.hostname || '',
      device_type: device.device_type || 'unknown',
    });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;

    setSavingEdit(true);
    try {
      const res = await api.patch(`/devices/${editingDevice.id}`, {
        hostname: editForm.hostname.trim() || null,
        device_type: editForm.device_type,
      });

      addToast('Device details updated successfully', 'success');
      setDevices((prev) =>
        prev.map((d) => (d.id === editingDevice.id ? { ...d, ...res.data } : d))
      );
      setEditingDevice(null);
    } catch (err) {
      console.error('Failed to update device:', err);
      addToast(err.response?.data?.message || 'Failed to update device', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered & Sorted Devices
  const filteredDevices = useMemo(() => {
    return devices
      .filter((device) => {
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase().trim();
          const matchIp = device.ip_address?.toLowerCase().includes(q);
          const matchHost = device.hostname?.toLowerCase().includes(q);
          const matchMac = device.mac_address?.toLowerCase().includes(q);
          if (!matchIp && !matchHost && !matchMac) return false;
        }

        if (statusFilter !== 'all') {
          if (device.status !== statusFilter) return false;
        }

        if (riskFilter !== 'all') {
          if (device.risk_level !== riskFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk_score') {
          return (b.risk_score || 0) - (a.risk_score || 0);
        }
        if (sortBy === 'packets_24h') {
          return (b.packets_24h || 0) - (a.packets_24h || 0);
        }
        if (sortBy === 'ip_address') {
          return (a.ip_address || '').localeCompare(b.ip_address || '');
        }
        const dateA = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const dateB = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return dateB - dateA;
      });
  }, [devices, debouncedSearch, statusFilter, riskFilter, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRiskFilter('all');
    setSortBy('last_seen');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    riskFilter !== 'all' ||
    sortBy !== 'last_seen';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        breadcrumb="NETSENTINEL / DEVICES"
        title="Subnet Devices & Host Inventory"
        description="Monitored endpoint nodes, behavioral risk telemetry, and traffic profiles."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {refreshing && (
              <span style={{ fontSize: '12px', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot-live" /> Syncing...
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchDevices(false)}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <RotateCcw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* Filter and Control Bar in Glass Toolbar Card */}
      <Card title="Inventory Search & Filters" subtitle="Filter tracked subnet endpoints by address, activity state, and threat posture">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            alignItems: 'flex-end',
          }}
        >
          {/* Search Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Search Host / IP / MAC</label>
            <div
              className="clay-inset"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '999px',
              }}
            >
              <Search size={15} color="var(--text-faint)" />
              <input
                type="text"
                placeholder="e.g. 192.168.1.10..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Activity Status</label>
            <select
              className="clay-inset"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '999px', width: '100%' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Seen &lt; 5m)</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Risk Level</label>
            <select
              className="clay-inset"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '999px', width: '100%' }}
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Sort Inventory By</label>
            <select
              className="clay-inset"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '999px', width: '100%' }}
            >
              <option value="last_seen">Last Active (Newest)</option>
              <option value="risk_score">Highest Risk Score</option>
              <option value="packets_24h">Highest 24h Traffic</option>
              <option value="ip_address">IP Address</option>
            </select>
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={clearFilters}
                style={{ padding: '8px 16px', fontSize: '13px', width: '100%' }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Device Count Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-dim)' }}>
        <span>
          Showing <strong>{filteredDevices.length}</strong> of <strong>{devices.length}</strong> tracked hosts
        </span>
      </div>

      {/* Device Cards Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="clay shimmer" style={{ height: '240px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card style={{ padding: '40px 20px' }}>
          <EmptyState
            title="No Devices Found"
            message={
              hasActiveFilters
                ? 'No network devices match the active search criteria. Try clearing filters.'
                : 'No network hosts have communicated on monitored interfaces yet.'
            }
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredDevices.map((device) => {
            const isActive = device.status === 'active';
            const riskBarGrad = getRiskBarGradient(device.risk_level);
            const riskScore = device.risk_score || 0;
            const iconBg = getDeviceTypeGradient(device.device_type);
            const isCritical = (device.risk_level || '').toLowerCase() === 'critical';

            return (
              <div
                key={device.id}
                className="clay clay-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  border: isCritical ? '1px solid rgba(255, 59, 107, 0.4)' : undefined,
                  boxShadow: isCritical ? '0 0 24px rgba(255, 59, 107, 0.2)' : undefined,
                }}
              >
                {/* Top Row: Device icon tile, IP in mono 16px, hostname dim, status dot at right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    {/* Device Icon Tile with gradient background by device type */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: iconBg,
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--cyan)',
                        flexShrink: 0,
                      }}
                    >
                      {getDeviceIcon(device.device_type, 20)}
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {device.ip_address}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: device.hostname ? 'var(--cyan)' : 'var(--text-faint)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {device.hostname || 'Unnamed Host'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Active/Inactive dot */}
                    {isActive ? (
                      <span className="dot-live" title="Active (seen < 5m)" />
                    ) : (
                      <span className="dot-offline" style={{ backgroundColor: 'var(--text-faint)' }} title="Inactive" />
                    )}

                    {/* Admin Edit button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(device, e)}
                        className="btn btn-ghost"
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          color: 'var(--text-faint)',
                        }}
                        title="Edit Device Hostname / Type"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* MAC Address */}
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', marginTop: '-8px' }}>
                  MAC: {device.mac_address || '00:00:00:00:00:00'}
                </div>

                {/* Stats Row: Three mini tiles (Packets, Traffic, Alerts) */}
                <div
                  className="clay-inset"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    gap: '8px',
                    background: 'rgba(7, 8, 18, 0.7)',
                  }}
                >
                  <div>
                    <div className="label-xs" style={{ fontSize: '9px', marginBottom: '3px' }}>
                      Packets
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {formatNumber(device.packets_24h || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="label-xs" style={{ fontSize: '9px', marginBottom: '3px' }}>
                      Traffic
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {formatBytes(device.bytes_24h || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="label-xs" style={{ fontSize: '9px', marginBottom: '3px' }}>
                      Alerts
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: (device.alerts_24h || 0) > 0 ? 'var(--red)' : 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {device.alerts_24h || 0}
                    </div>
                  </div>
                </div>

                {/* Risk Meter: Bar 8px high with gradient by level */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="label-xs">Risk Threat Score</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                        {riskScore}/100
                      </span>
                      <SeverityBadge severity={device.risk_level || 'low'} />
                    </div>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(6, riskScore))}%`,
                        background: riskBarGrad,
                        boxShadow: isCritical ? '0 0 12px rgba(255, 59, 107, 0.6)' : undefined,
                      }}
                    />
                  </div>
                </div>

                {/* Footer with first seen / last seen in dim text and View Alerts */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '11px',
                    color: 'var(--text-faint)',
                    marginTop: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} />
                    <span>Seen {timeAgo(device.last_seen)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAlertsModal(device)}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <ShieldAlert size={12} color={(device.alerts_24h || 0) > 0 ? 'var(--red)' : 'var(--text-dim)'} />
                    <span>Alerts ({device.alerts_24h || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Device Alerts Modal */}
      <Modal
        isOpen={!!selectedDeviceForAlerts}
        onClose={() => setSelectedDeviceForAlerts(null)}
        title={
          selectedDeviceForAlerts
            ? `Security Incidents: ${selectedDeviceForAlerts.ip_address} ${
                selectedDeviceForAlerts.hostname ? `(${selectedDeviceForAlerts.hostname})` : ''
              }`
            : 'Device Alerts'
        }
        maxWidth="720px"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setSelectedDeviceForAlerts(null)}
            style={{ padding: '8px 20px' }}
          >
            Close
          </button>
        }
      >
        {loadingAlerts ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer" style={{ height: '56px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : deviceAlerts.length === 0 ? (
          <div style={{ padding: '24px 10px' }}>
            <EmptyState
              title="No Threat Alerts Recorded"
              message="This host has not triggered any intrusion detection rules in the system log."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Showing latest <strong>{deviceAlerts.length}</strong> alerts associated with this device:
            </div>
            {deviceAlerts.map((alert) => (
              <div
                key={alert.id}
                className="clay-inset"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderLeft: `3px solid ${
                    alert.severity === 'critical'
                      ? 'var(--sev-critical)'
                      : alert.severity === 'high'
                      ? 'var(--sev-high)'
                      : alert.severity === 'medium'
                      ? 'var(--sev-medium)'
                      : 'var(--sev-low)'
                  }`,
                  background: 'rgba(7, 8, 18, 0.7)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', fontFamily: 'var(--font-head)' }}>
                      {prettyAlertType(alert.alert_type)}
                    </span>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    {formatTime(alert.timestamp)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.4, fontFamily: 'var(--font-mono)' }}>
                  {alert.description}
                </div>
                {alert.rule_name && (
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    Rule Triggered: <span style={{ color: 'var(--cyan)' }}>{alert.rule_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Admin Edit Device Modal */}
      {isAdmin && (
        <Modal
          isOpen={!!editingDevice}
          onClose={() => !savingEdit && setEditingDevice(null)}
          title={`Edit Device Details: ${editingDevice?.ip_address}`}
          maxWidth="480px"
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditingDevice(null)}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-device-form"
                className="btn btn-primary"
                disabled={savingEdit}
                style={{ padding: '8px 20px' }}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form id="edit-device-form" onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">IP Address</label>
              <input
                type="text"
                className="clay-inset font-mono"
                value={editingDevice?.ip_address || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed', padding: '10px 14px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">MAC Address</label>
              <input
                type="text"
                className="clay-inset font-mono"
                value={editingDevice?.mac_address || '00:00:00:00:00:00'}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed', padding: '10px 14px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">Hostname / Custom Label</label>
              <input
                type="text"
                className="clay-inset"
                placeholder="e.g. gateway-router, payroll-laptop"
                value={editForm.hostname}
                onChange={(e) => setEditForm((prev) => ({ ...prev, hostname: e.target.value }))}
                maxLength={100}
                style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">Device Category</label>
              <select
                className="clay-inset"
                value={editForm.device_type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, device_type: e.target.value }))}
                style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
              >
                {DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Devices;
