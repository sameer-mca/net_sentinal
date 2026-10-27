import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import Spinner from '../Spinner';
import { Play, Square, AlertCircle, Info, Radio, Network } from 'lucide-react';

const CaptureControlBar = ({ captureState, onStatusChange }) => {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  const settings = captureState?.settings || {};
  const isOnline = !!captureState?.engine_online;
  const isRunning = !!settings.is_running;
  const interfaces = captureState?.engine?.interfaces || [];
  const lastError = captureState?.engine?.last_error;

  const [mode, setMode] = useState(settings.mode || 'simulator');
  const [selectedInterface, setSelectedInterface] = useState(settings.interface_name || '');
  const [simulateAttacks, setSimulateAttacks] = useState(!!settings.simulate_attacks);
  const [submitting, setSubmitting] = useState(false);

  // Preselect default interface when switching to sniffer or when interfaces become available
  React.useEffect(() => {
    if (mode === 'sniffer' && !selectedInterface && interfaces.length > 0) {
      const def = interfaces.find((i) => i.is_default) || interfaces.find((i) => i.recommended) || interfaces[0];
      if (def?.name) {
        setSelectedInterface(def.name);
      }
    }
  }, [mode, selectedInterface, interfaces]);

  const handleSwitchToSniffer = () => {
    setMode('sniffer');
    if (!selectedInterface) {
      const def = interfaces.find((i) => i.is_default) || interfaces.find((i) => i.recommended) || interfaces[0];
      if (def?.name) {
        setSelectedInterface(def.name);
      }
    }
  };

  const sortedInterfaces = [...interfaces].sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });

  const handleStart = async () => {
    setSubmitting(true);
    try {
      const body = {
        mode,
        simulate_attacks: mode === 'simulator' ? simulateAttacks : false,
      };
      if (mode === 'sniffer' && selectedInterface) {
        body.interface_name = selectedInterface;
      }

      const res = await api.post('/capture/start', body);
      addToast(`Capture started in ${mode} mode.`, 'success');
      if (onStatusChange) onStatusChange(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to start capture.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStop = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/capture/stop');
      addToast('Capture stopped.', 'info');
      if (onStatusChange) onStatusChange(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to stop capture.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="clay col-span-4"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        borderLeft: isRunning ? '4px solid var(--green)' : '4px solid var(--violet)',
        position: 'relative',
        boxShadow: isRunning
          ? '0 24px 48px -16px rgba(0, 0, 0, 0.65), 0 0 24px rgba(45, 255, 160, 0.12)'
          : '0 24px 48px -16px rgba(0, 0, 0, 0.65)',
      }}
    >
      <div
        className="capture-bar-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left: Engine Status Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Live indicator & Engine Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={isOnline ? 'dot-live' : 'dot-offline'} />
            <div>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                Capture Engine
              </span>
              <span style={{ fontSize: '11px', color: isOnline ? 'var(--green)' : 'var(--red)', display: 'block', lineHeight: 1 }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

          {/* Running Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label-xs">State</span>
            <span
              className={`badge ${isRunning ? 'badge-ok' : 'badge-muted'}`}
              style={{ fontSize: '10.5px', padding: '3px 10px' }}
            >
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          {/* Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label-xs">Mode</span>
            <span
              className="badge badge-info font-mono"
              style={{ fontSize: '11px', padding: '3px 10px' }}
            >
              {settings.mode ? settings.mode.toUpperCase() : 'NONE'}
            </span>
          </div>

          {/* Interface if active */}
          {settings.interface_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="label-xs">Adapter</span>
              <span
                style={{
                  fontSize: '11.5px',
                  color: 'var(--violet)',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(124, 92, 255, 0.1)',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  border: '1px solid rgba(124, 92, 255, 0.25)',
                }}
              >
                {settings.interface_name}
              </span>
            </div>
          )}
        </div>

        {/* Right: Admin Controls or Read-only Status */}
        {isAdmin ? (
          <div
            className="capture-bar-admin-controls"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
          >
            {/* Segmented Control Mode Switcher */}
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
                onClick={() => setMode('simulator')}
                disabled={isRunning || submitting}
                style={{
                  background: mode === 'simulator' ? 'var(--grad-cool)' : 'transparent',
                  color: mode === 'simulator' ? '#04101a' : 'var(--text-faint)',
                  boxShadow: mode === 'simulator' ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  transition: 'all 180ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Radio size={12} /> Simulator
              </button>
              <button
                type="button"
                onClick={handleSwitchToSniffer}
                disabled={isRunning || submitting}
                style={{
                  background: mode === 'sniffer' ? 'var(--grad-cool)' : 'transparent',
                  color: mode === 'sniffer' ? '#04101a' : 'var(--text-faint)',
                  boxShadow: mode === 'sniffer' ? '0 0 16px rgba(0, 229, 255, 0.35)' : 'none',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  transition: 'all 180ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Network size={12} /> Sniffer
              </button>
            </div>

            {/* Interface Dropdown (when sniffer selected) */}
            {mode === 'sniffer' && (
              <select
                className="clay-inset"
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                disabled={isRunning || submitting}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  maxWidth: '190px',
                  borderRadius: '999px',
                  color: 'var(--text)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">Select Adapter...</option>
                {sortedInterfaces.map((iface, idx) => {
                  let label = iface.description || iface.name;
                  if (iface.ip) {
                    label += ` — ${iface.ip}`;
                  }
                  if (iface.is_default) {
                    label += ' (default)';
                  }
                  return (
                    <option key={idx} value={iface.name}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Simulate Attacks Checkbox */}
            {mode === 'simulator' && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: simulateAttacks ? 'var(--magenta)' : 'var(--text-dim)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: simulateAttacks ? 'rgba(255, 43, 214, 0.1)' : 'transparent',
                  border: `1px solid ${simulateAttacks ? 'rgba(255, 43, 214, 0.3)' : 'transparent'}`,
                  transition: 'all 180ms ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={simulateAttacks}
                  onChange={(e) => setSimulateAttacks(e.target.checked)}
                  disabled={isRunning || submitting}
                  style={{ accentColor: 'var(--magenta)', cursor: 'pointer' }}
                />
                Simulate Attacks
              </label>
            )}

            {/* Start / Stop Toggle Button */}
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={submitting}
                className="btn btn-danger"
                style={{ padding: '7px 18px', fontSize: '13px' }}
              >
                {submitting ? (
                  <Spinner size={14} color="#ffffff" />
                ) : (
                  <Square size={13} fill="currentColor" />
                )}
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={submitting || !isOnline}
                className="btn btn-primary"
                style={{ padding: '7px 18px', fontSize: '13px' }}
              >
                {submitting ? (
                  <Spinner size={14} color="#04101a" />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}
                <span>Start</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
            Managed by System Administrator
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .capture-bar-content {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .capture-bar-admin-controls {
            width: 100% !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      {/* Warning Banner if engine is offline */}
      {!isOnline && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 176, 32, 0.1)',
            border: '1px solid rgba(255, 176, 32, 0.3)',
            color: 'var(--amber)',
            fontSize: '12.5px',
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            Capture service is offline. Start the Python capture service (<code className="font-mono">python -u main.py</code>) to capture live traffic.
          </span>
        </div>
      )}

      {/* Error Banner if engine reported an error */}
      {lastError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 59, 107, 0.1)',
            border: '1px solid rgba(255, 59, 107, 0.35)',
            color: 'var(--red)',
            fontSize: '12.5px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>Capture Engine Error: {lastError}</span>
        </div>
      )}
    </div>
  );
};

export default CaptureControlBar;
