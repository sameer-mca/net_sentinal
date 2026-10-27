const fs = require('fs');

/**
 * Escapes a cell value for CSV output adhering to RFC 4180
 * @param {any} val
 * @returns {string}
 */
function formatCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of values into a CSV line
 * @param {Array<any>} cells
 * @returns {string}
 */
function formatCsvRow(cells) {
  return cells.map(formatCsvCell).join(',');
}

/**
 * Generates a CSV file on disk for the given report data
 * @param {object} reportData
 * @param {string} filePath
 * @returns {Promise<string>} filePath
 */
async function generateCsv(reportData, filePath) {
  const lines = [];

  if (reportData.report_type === 'traffic') {
    lines.push(
      formatCsvRow([
        'Timestamp',
        'Source IP',
        'Destination IP',
        'Source Port',
        'Destination Port',
        'Protocol',
        'Packet Size (Bytes)',
        'TCP Flags',
        'Status',
      ])
    );

    const packets = reportData.packets || [];
    for (const p of packets) {
      lines.push(
        formatCsvRow([
          p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp,
          p.src_ip,
          p.dst_ip,
          p.src_port !== null && p.src_port !== undefined ? p.src_port : '',
          p.dst_port !== null && p.dst_port !== undefined ? p.dst_port : '',
          p.protocol,
          p.packet_size,
          p.tcp_flags || '',
          p.status,
        ])
      );
    }
  } else if (reportData.report_type === 'alerts') {
    lines.push(
      formatCsvRow([
        'ID',
        'Timestamp',
        'Rule Name',
        'Alert Type',
        'Severity',
        'Source IP',
        'Destination IP',
        'Status',
        'Description',
      ])
    );

    const alerts = reportData.alerts || [];
    for (const a of alerts) {
      lines.push(
        formatCsvRow([
          a.id,
          a.timestamp instanceof Date ? a.timestamp.toISOString() : a.timestamp,
          a.rule_name || '',
          a.alert_type,
          a.severity,
          a.source_ip,
          a.destination_ip || '',
          a.status,
          a.description || '',
        ])
      );
    }
  } else if (reportData.report_type === 'devices') {
    lines.push(
      formatCsvRow([
        'ID',
        'IP Address',
        'MAC Address',
        'Hostname',
        'Device Type',
        'Packets',
        'Bytes',
        'Alerts',
        'Risk Score',
        'Risk Level',
        'First Seen',
        'Last Seen',
      ])
    );

    const devices = reportData.devices || [];
    for (const d of devices) {
      lines.push(
        formatCsvRow([
          d.id,
          d.ip_address,
          d.mac_address || '',
          d.hostname || '',
          d.device_type,
          d.packets,
          d.bytes,
          d.alerts,
          d.risk_score,
          d.risk_level,
          d.first_seen instanceof Date ? d.first_seen.toISOString() : d.first_seen,
          d.last_seen instanceof Date ? d.last_seen.toISOString() : d.last_seen,
        ])
      );
    }
  } else {
    throw new Error(`Unsupported report type for CSV: ${reportData.report_type}`);
  }

  const csvContent = lines.join('\r\n');
  await fs.promises.writeFile(filePath, csvContent, 'utf8');
  return filePath;
}

module.exports = {
  generateCsv,
  formatCsvCell,
  formatCsvRow,
};
