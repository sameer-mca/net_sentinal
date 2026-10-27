import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatTime } from '../utils/format';
import {
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ShieldAlert,
  Activity,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const getIsoLocalString = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const Reports = () => {
  usePageTitle('Security Reports');

  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  // Generator State
  const [reportType, setReportType] = useState('traffic');
  const [format, setFormat] = useState('pdf');
  const [startTime, setStartTime] = useState(
    getIsoLocalString(new Date(Date.now() - 24 * 60 * 60 * 1000))
  );
  const [endTime, setEndTime] = useState(getIsoLocalString(new Date()));
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reports List State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);

  // Download & Delete State
  const [downloadingId, setDownloadingId] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Reports List
  const fetchReports = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const res = await api.get('/reports', {
          params: { page: targetPage, limit },
        });
        setReports(res.data?.data || []);
        setPage(res.data?.page || 1);
        setTotalPages(res.data?.totalPages || 1);
        setTotalReports(res.data?.total || 0);
      } catch (err) {
        console.error('Failed to load reports:', err);
        addToast('Failed to load reports archive', 'error');
      } finally {
        setLoading(false);
      }
    },
    [page, limit, addToast]
  );

  useEffect(() => {
    fetchReports(page);
  }, [page, fetchReports]);

  // Preset Handlers
  const applyPreset = (hours) => {
    const end = new Date();
    const start = new Date(Date.now() - hours * 60 * 60 * 1000);
    setStartTime(getIsoLocalString(start));
    setEndTime(getIsoLocalString(end));
    setValidationError('');
  };

  // Generate Report Handler
  const handleGenerate = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!startTime || !endTime) {
      setValidationError('Please select both start and end dates/times.');
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      setValidationError('Start time must be strictly before end time.');
      return;
    }

    const maxMs = 30 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxMs) {
      setValidationError('Report duration cannot exceed 30 days.');
      return;
    }

    setGenerating(true);
    try {
      await api.post('/reports', {
        report_type: reportType,
        format,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });

      addToast('Report generated and saved to archive!', 'success');
      if (page === 1) {
        fetchReports(1);
      } else {
        setPage(1);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      const msg = err.response?.data?.message || 'Failed to generate report';
      setValidationError(msg);
      addToast(msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Download Handler
  const handleDownload = async (report) => {
    setDownloadingId(report.id);
    try {
      const response = await api.get(`/reports/${report.id}/download`, {
        responseType: 'blob',
      });

      let filename = `${report.report_type}_report_${report.id}.${report.format}`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = new Blob([response.data], {
        type: report.format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8;',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast(`Downloaded ${filename}`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      addToast('Failed to download report file', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/reports/${reportToDelete.id}`);
      addToast('Report deleted successfully', 'success');
      setReportToDelete(null);
      fetchReports(page);
    } catch (err) {
      console.error('Delete error:', err);
      addToast(err.response?.data?.message || 'Failed to delete report', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'traffic':
        return <Activity size={16} color="var(--cyan)" />;
      case 'alerts':
        return <ShieldAlert size={16} color="var(--magenta)" />;
      case 'devices':
        return <Layers size={16} color="var(--violet)" />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        breadcrumb="NETSENTINEL / REPORTS"
        title="Security Reports & Audits"
        description="Compile executive PDF incident briefs and raw CSV network streams for forensics."
      />

      {/* Generator Card */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--cyan)" />
            <span>Generate Security Audit Report</span>
          </div>
        }
        subtitle="Produce downloadable incident and bandwidth audit logs"
      >
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Step 1: Select Type */}
          <div>
            <label className="label-xs" style={{ display: 'block', marginBottom: '10px' }}>
              1. Report Scope Category
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              {[
                {
                  id: 'traffic',
                  name: 'Traffic Analysis',
                  desc: 'Protocols, packet volume, byte throughput, and top talkers',
                  icon: Activity,
                  color: 'var(--cyan)',
                },
                {
                  id: 'alerts',
                  name: 'Intrusion Threats',
                  desc: 'Triggered security rules, severity breakdown, and target nodes',
                  icon: ShieldAlert,
                  color: 'var(--magenta)',
                },
                {
                  id: 'devices',
                  name: 'Device Inventory',
                  desc: 'Subnet endpoints, behavioral risk scores, and activity logs',
                  icon: Layers,
                  color: 'var(--violet)',
                },
              ].map((item) => {
                const isSelected = reportType === item.id;
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => setReportType(item.id)}
                    className="clay clay-interactive"
                    style={{
                      padding: '18px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: isSelected ? `1px solid ${item.color}` : '1px solid var(--border)',
                      boxShadow: isSelected
                        ? `0 0 24px ${item.color}44, inset 0 0 10px ${item.color}22`
                        : undefined,
                      background: isSelected ? 'rgba(255, 255, 255, 0.07)' : 'var(--surface)',
                      transition: 'all 200ms ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: `${item.color}15`,
                          border: `1px solid ${item.color}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconComponent size={18} color={item.color} />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-head)',
                          fontWeight: 700,
                          fontSize: '15px',
                          color: isSelected ? 'var(--text)' : 'var(--text-dim)',
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      {item.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Time Window & Format */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'flex-start',
            }}
          >
            {/* Time Window with Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <label className="label-xs">2. Analysis Time Window</label>
                {/* Presets */}
                <div
                  className="clay-inset"
                  style={{
                    display: 'inline-flex',
                    padding: '2px',
                    borderRadius: '999px',
                    background: 'rgba(7, 8, 18, 0.8)',
                  }}
                >
                  {[
                    { label: '1 Hour', hours: 1 },
                    { label: '24 Hours', hours: 24 },
                    { label: '7 Days', hours: 168 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.hours)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-faint)',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '999px',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cyan)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="label-xs" style={{ display: 'block', marginBottom: '4px', fontSize: '10px' }}>
                    Start Date/Time
                  </span>
                  <input
                    type="datetime-local"
                    className="clay-inset"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setValidationError('');
                    }}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px' }}
                    required
                  />
                </div>
                <div>
                  <span className="label-xs" style={{ display: 'block', marginBottom: '4px', fontSize: '10px' }}>
                    End Date/Time
                  </span>
                  <input
                    type="datetime-local"
                    className="clay-inset"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setValidationError('');
                    }}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px' }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Export Format as Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className="label-xs">3. Export Document Format</label>

              <div
                className="clay-inset"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(7, 8, 18, 0.8)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    background: format === 'pdf' ? 'linear-gradient(135deg, rgba(255, 59, 107, 0.25), rgba(255, 43, 214, 0.25))' : 'transparent',
                    boxShadow: format === 'pdf' ? '0 0 16px rgba(255, 59, 107, 0.3)' : 'none',
                    color: format === 'pdf' ? '#ffffff' : 'var(--text-faint)',
                    transition: 'all 180ms ease',
                  }}
                >
                  <FileText size={18} color={format === 'pdf' ? 'var(--red)' : 'var(--text-faint)'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }}>PDF Document</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>Visual summary</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    background: format === 'csv' ? 'linear-gradient(135deg, rgba(45, 255, 160, 0.25), rgba(0, 229, 255, 0.25))' : 'transparent',
                    boxShadow: format === 'csv' ? '0 0 16px rgba(45, 255, 160, 0.3)' : 'none',
                    color: format === 'csv' ? '#ffffff' : 'var(--text-faint)',
                    transition: 'all 180ms ease',
                  }}
                >
                  <FileSpreadsheet size={18} color={format === 'csv' ? 'var(--green)' : 'var(--text-faint)'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }}>CSV Spreadsheet</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>Raw datasets</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
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
              <span>{validationError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="report-generate-action" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={generating}
              style={{ minWidth: '180px', height: '42px', fontSize: '14px' }}
            >
              {generating ? (
                <>
                  <span className="dot-live" />
                  <span>Compiling Report...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </form>

        <style>{`
          @media (max-width: 768px) {
            .report-generate-action {
              justify-content: stretch !important;
            }
            .report-generate-action button {
              width: 100% !important;
            }
          }
        `}</style>
      </Card>

      {/* Generated Reports Archive Card */}
      <Card
        title="My Reports Archive"
        subtitle="Catalog of previously compiled audits and data exports"
        action={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fetchReports(page)}
            disabled={loading}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <RotateCcw size={13} />
            <span>Refresh</span>
          </button>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shimmer" style={{ height: '48px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '24px 10px' }}>
            <EmptyState
              title="No Reports Generated Yet"
              message="Use the generator above to compile PDF audits or export CSV packet logs."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="table-responsive table-fade-mask" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Report Type</th>
                    <th>Format</th>
                    <th>Analysis Window</th>
                    <th>Generated Date</th>
                    {isAdmin && <th>Generated By</th>}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      {/* Report Type */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getReportTypeIcon(report.report_type)}
                          <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text)' }}>
                            {report.report_type}
                          </span>
                        </div>
                      </td>

                      {/* Format Badge: PDF = red-magenta tint, CSV = green tint */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontSize: '11px',
                            padding: '3px 9px',
                            background:
                              report.format === 'pdf'
                                ? 'rgba(255, 59, 107, 0.16)'
                                : 'rgba(45, 255, 160, 0.16)',
                            color: report.format === 'pdf' ? 'var(--red)' : 'var(--green)',
                            border: `1px solid ${
                              report.format === 'pdf' ? 'rgba(255, 59, 107, 0.35)' : 'rgba(45, 255, 160, 0.35)'
                            }`,
                          }}
                        >
                          {report.format?.toUpperCase()}
                        </span>
                      </td>

                      {/* Time Window */}
                      <td>
                        <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                          <div>From: {formatTime(report.start_time)}</div>
                          <div>To: {formatTime(report.end_time)}</div>
                        </div>
                      </td>

                      {/* Generated Date */}
                      <td className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {formatTime(report.generated_at)}
                      </td>

                      {/* Generated By (Admin view) */}
                      {isAdmin && (
                        <td style={{ fontSize: '12px', color: 'var(--cyan)' }}>
                          {report.user_name || report.user_email || `User #${report.user_id}`}
                        </td>
                      )}

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === report.id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              color: 'var(--cyan)',
                            }}
                            title="Download Report File"
                          >
                            <Download size={14} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setReportToDelete(report)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              color: 'var(--red)',
                            }}
                            title="Delete Report"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            )}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!reportToDelete}
        onClose={() => !deleting && setReportToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Stored Report"
        message={`Are you sure you want to permanently delete this ${reportToDelete?.report_type} report (${reportToDelete?.format?.toUpperCase()}) generated on ${
          reportToDelete ? formatTime(reportToDelete.generated_at) : ''
        }? The generated file on disk will be removed.`}
        confirmText="Delete Report"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
};

export default Reports;
