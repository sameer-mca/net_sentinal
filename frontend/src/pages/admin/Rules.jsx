import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import Toggle from '../../components/Toggle';
import SeverityBadge from '../../components/SeverityBadge';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { usePageTitle } from '../../hooks/usePageTitle';
import {
  ShieldAlert,
  Edit2,
  RotateCcw,
  AlertTriangle,
  Zap,
  Radar,
  Activity,
  Globe,
  Bug,
  ShieldOff,
  Sliders,
} from 'lucide-react';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const getRuleIcon = (attackType) => {
  switch (attackType) {
    case 'syn_flood':
      return <Zap size={20} color="var(--cyan)" />;
    case 'port_scan':
      return <Radar size={20} color="var(--violet)" />;
    case 'icmp_flood':
      return <Activity size={20} color="var(--magenta)" />;
    case 'suspicious_dns':
      return <Globe size={20} color="var(--green)" />;
    case 'suspicious_payload':
      return <Bug size={20} color="var(--red)" />;
    case 'malformed_packet':
      return <ShieldOff size={20} color="var(--amber)" />;
    default:
      return <Sliders size={20} color="var(--cyan)" />;
  }
};

const Rules = () => {
  usePageTitle('Admin · Detection Rules');

  const { addToast } = useToast();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editingRule, setEditingRule] = useState(null);
  const [editForm, setEditForm] = useState({
    threshold_value: '',
    time_window: '',
    severity: 'medium',
    description: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch all detection rules
  const fetchRules = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await api.get('/rules');
        setRules(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch rules:', err);
        if (!isBackground) {
          addToast(err.response?.data?.message || 'Failed to load detection rules', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Toggle Rule Status (Optimistic)
  const handleToggle = async (rule) => {
    const previousState = rule.is_active;
    const nextState = !previousState;

    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: nextState } : r))
    );

    try {
      const res = await api.patch(`/rules/${rule.id}/toggle`);
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, ...res.data } : r))
      );
      addToast(
        `Rule "${rule.rule_name}" is now ${nextState ? 'ACTIVE' : 'DISABLED'}`,
        'success'
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: previousState } : r))
      );
      addToast(err.response?.data?.message || 'Failed to toggle rule state', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setEditForm({
      threshold_value: rule.threshold_value,
      time_window: rule.time_window,
      severity: rule.severity || 'medium',
      description: rule.description || '',
    });
    setFormError('');
  };

  // Submit Edit Form
  const handleSaveRule = async (e) => {
    e.preventDefault();
    setFormError('');

    const thresh = Number(editForm.threshold_value);
    if (isNaN(thresh) || thresh <= 0) {
      setFormError('Threshold value must be a positive number greater than 0.');
      return;
    }

    const windowSec = parseInt(editForm.time_window, 10);
    if (isNaN(windowSec) || windowSec < 1 || windowSec > 3600) {
      setFormError('Time window must be an integer between 1 and 3600 seconds.');
      return;
    }

    if (!editForm.description.trim()) {
      setFormError('Description cannot be empty.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.put(`/rules/${editingRule.id}`, {
        threshold_value: thresh,
        time_window: windowSec,
        severity: editForm.severity,
        description: editForm.description.trim(),
      });

      addToast(`Rule "${editingRule.rule_name}" updated successfully`, 'success');
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? { ...r, ...res.data } : r))
      );
      setEditingRule(null);
    } catch (err) {
      console.error('Failed to update rule:', err);
      const msg = err.response?.data?.message || 'Failed to update rule';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        breadcrumb="NETSENTINEL / ADMIN / RULES"
        title="Intrusion Detection Engine Rules"
        description="Configure detection sensitivity, sliding thresholds, time windows, and active state for the real-time analyzer."
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fetchRules(false)}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <RotateCcw size={14} /> Refresh
          </button>
        }
      />

      {/* Info Banner */}
      <div
        className="clay"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          borderLeft: '4px solid var(--cyan)',
          background: 'rgba(0, 229, 255, 0.05)',
        }}
      >
        <Zap size={22} color="var(--cyan)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>Dynamic Rule Synchronization: </strong>
          The Python packet engine queries these rules on every analysis cycle. Any threshold,
          window, or severity changes saved here take effect immediately in packet evaluation without
          requiring an engine restart.
        </div>
      </div>

      {/* 2-Column Responsive Rules Cards Grid */}
      {loading ? (
        <div className="rules-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="clay shimmer" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card style={{ padding: '40px 20px' }}>
          <EmptyState
            title="No Detection Rules Configured"
            message="No intrusion detection rules were found in the database."
          />
        </Card>
      ) : (
        <div className="rules-grid">
          {rules.map((rule) => {
            const isActive = Boolean(rule.is_active);

            return (
              <div
                key={rule.id}
                className="clay clay-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  opacity: isActive ? 1 : 0.55,
                  transition: 'opacity 220ms ease, transform 200ms ease, box-shadow 200ms ease',
                }}
              >
                {/* Header: Icon tile, Name, Disabled badge, Toggle & Edit button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    {/* Attack Type Icon Tile */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getRuleIcon(rule.attack_type)}
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3
                          style={{
                            fontFamily: 'var(--font-head)',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--text)',
                            margin: 0,
                          }}
                        >
                          {rule.rule_name}
                        </h3>
                        {!isActive && (
                          <span className="badge badge-muted" style={{ fontSize: '9px', padding: '1px 6px' }}>
                            DISABLED
                          </span>
                        )}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--cyan)', marginTop: '2px' }}>
                        {rule.attack_type}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <Toggle
                      id={`rule-toggle-${rule.id}`}
                      checked={isActive}
                      onChange={() => handleToggle(rule)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleOpenEdit(rule)}
                      style={{ padding: '6px 10px', color: 'var(--text-faint)' }}
                      title="Edit Rule Parameters"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-dim)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {rule.description}
                </p>

                {/* Row of 3 Value Tiles (Threshold, Window, Severity) */}
                <div
                  className="clay-inset"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    gap: '8px',
                    background: 'rgba(7, 8, 18, 0.7)',
                    marginTop: 'auto',
                  }}
                >
                  <div>
                    <div className="label-xs" style={{ fontSize: '9.5px', marginBottom: '4px' }}>
                      Threshold
                    </div>
                    <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                      {rule.threshold_value}
                    </div>
                  </div>

                  <div>
                    <div className="label-xs" style={{ fontSize: '9.5px', marginBottom: '4px' }}>
                      Time Window
                    </div>
                    <div className="font-mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                      {rule.time_window}s
                    </div>
                  </div>

                  <div>
                    <div className="label-xs" style={{ fontSize: '9.5px', marginBottom: '4px' }}>
                      Severity
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <SeverityBadge severity={rule.severity} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 900px) {
          .rules-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Edit Rule Modal */}
      <Modal
        isOpen={!!editingRule}
        onClose={() => !savingEdit && setEditingRule(null)}
        title={`Edit Rule: ${editingRule?.rule_name}`}
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditingRule(null)}
              disabled={savingEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-rule-form"
              className="btn btn-primary"
              disabled={savingEdit}
              style={{ padding: '8px 20px' }}
            >
              {savingEdit ? 'Saving...' : 'Save Parameters'}
            </button>
          </>
        }
      >
        <form id="edit-rule-form" onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Attack Type Identifier</label>
            <input
              type="text"
              className="clay-inset font-mono"
              value={editingRule?.attack_type || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed', padding: '10px 14px', fontSize: '13px' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Internal rule classification tag</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">Threshold Limit</label>
              <input
                type="number"
                step="any"
                min="1"
                className="clay-inset font-mono"
                value={editForm.threshold_value}
                onChange={(e) => setEditForm((prev) => ({ ...prev, threshold_value: e.target.value }))}
                style={{ padding: '10px 14px', fontSize: '13px' }}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Events required to trigger</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="label-xs">Window (Seconds)</label>
              <input
                type="number"
                min="1"
                max="3600"
                className="clay-inset font-mono"
                value={editForm.time_window}
                onChange={(e) => setEditForm((prev) => ({ ...prev, time_window: e.target.value }))}
                style={{ padding: '10px 14px', fontSize: '13px' }}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Sliding detection window</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Alert Severity Level</label>
            <select
              className="clay-inset"
              value={editForm.severity}
              onChange={(e) => setEditForm((prev) => ({ ...prev, severity: e.target.value }))}
              style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Priority assigned to generated incident alerts</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-xs">Rule Description / Trigger Logic</label>
            <textarea
              className="clay-inset"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              style={{ resize: 'vertical', padding: '10px 14px', fontSize: '13px', color: 'var(--text)' }}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Shown in alert triage details for operators</span>
          </div>

          {formError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 59, 107, 0.12)',
                border: '1px solid rgba(255, 59, 107, 0.3)',
                color: 'var(--red)',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Rules;
