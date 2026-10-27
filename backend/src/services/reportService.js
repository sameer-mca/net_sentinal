const db = require('../config/db');
const { toMysqlDateTime } = require('../utils/network');
const { calculateRiskLevel } = require('./statsService');

/**
 * Builds data for a Network Traffic Report
 * @param {string|Date} startTime
 * @param {string|Date} endTime
 */
async function buildTrafficReport(startTime, endTime) {
  const startStr = toMysqlDateTime(startTime);
  const endStr = toMysqlDateTime(endTime);

  // 1. Overall Summary
  const [summaryRows] = await db.query(
    `SELECT 
       COUNT(*) AS total_packets,
       COALESCE(SUM(bytes_transferred), 0) AS total_bytes,
       COUNT(DISTINCT src_ip) AS unique_sources,
       COUNT(DISTINCT dst_ip) AS unique_destinations
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?`,
    [startStr, endStr]
  );

  const summary = {
    total_packets: Number(summaryRows[0]?.total_packets || 0),
    total_bytes: Number(summaryRows[0]?.total_bytes || 0),
    unique_sources: Number(summaryRows[0]?.unique_sources || 0),
    unique_destinations: Number(summaryRows[0]?.unique_destinations || 0),
  };

  // 2. Protocol Distribution
  const [protocolRows] = await db.query(
    `SELECT protocol, COUNT(*) AS count, COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY protocol
     ORDER BY count DESC`,
    [startStr, endStr]
  );

  // 3. Top 10 Talkers
  const [topTalkers] = await db.query(
    `SELECT src_ip AS ip, COUNT(*) AS packets, COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY src_ip
     ORDER BY bytes DESC
     LIMIT 10`,
    [startStr, endStr]
  );

  // 4. Top 10 Destination Ports
  const [topPorts] = await db.query(
    `SELECT dst_port AS port, COUNT(*) AS count, COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ? AND dst_port IS NOT NULL
     GROUP BY dst_port
     ORDER BY count DESC
     LIMIT 10`,
    [startStr, endStr]
  );

  // 5. Per-Hour Packet Counts
  const [hourlyPackets] = await db.query(
    `SELECT 
       DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') AS hour,
       COUNT(*) AS packets,
       COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY hour
     ORDER BY hour ASC`,
    [startStr, endStr]
  );

  // 6. Detailed Packet Rows (for CSV export, max 10000)
  const [packets] = await db.query(
    `SELECT timestamp, src_ip, dst_ip, src_port, dst_port, protocol, packet_size, tcp_flags, status
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC
     LIMIT 10000`,
    [startStr, endStr]
  );

  return {
    report_type: 'traffic',
    start_time: startTime,
    end_time: endTime,
    summary,
    protocol_distribution: protocolRows.map((r) => ({
      protocol: r.protocol,
      count: Number(r.count),
      bytes: Number(r.bytes),
    })),
    top_talkers: topTalkers.map((r) => ({
      ip: r.ip,
      packets: Number(r.packets),
      bytes: Number(r.bytes),
    })),
    top_ports: topPorts.map((r) => ({
      port: Number(r.port),
      count: Number(r.count),
      bytes: Number(r.bytes),
    })),
    hourly_packets: hourlyPackets.map((r) => ({
      hour: r.hour,
      packets: Number(r.packets),
      bytes: Number(r.bytes),
    })),
    packets,
  };
}

/**
 * Builds data for an Intrusion Alerts Report
 * @param {string|Date} startTime
 * @param {string|Date} endTime
 */
async function buildAlertsReport(startTime, endTime) {
  const startStr = toMysqlDateTime(startTime);
  const endStr = toMysqlDateTime(endTime);

  // 1. Summary
  const [totalRow] = await db.query(
    `SELECT COUNT(*) AS total_alerts FROM alerts WHERE timestamp >= ? AND timestamp <= ?`,
    [startStr, endStr]
  );

  const [severityRows] = await db.query(
    `SELECT severity, COUNT(*) AS count
     FROM alerts
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY severity
     ORDER BY count DESC`,
    [startStr, endStr]
  );

  const [typeRows] = await db.query(
    `SELECT alert_type, COUNT(*) AS count
     FROM alerts
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY alert_type
     ORDER BY count DESC`,
    [startStr, endStr]
  );

  const [statusRows] = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM alerts
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY status
     ORDER BY count DESC`,
    [startStr, endStr]
  );

  const summary = {
    total_alerts: Number(totalRow[0]?.total_alerts || 0),
    by_severity: severityRows.map((r) => ({ severity: r.severity, count: Number(r.count) })),
    by_type: typeRows.map((r) => ({ alert_type: r.alert_type, count: Number(r.count) })),
    by_status: statusRows.map((r) => ({ status: r.status, count: Number(r.count) })),
  };

  // 2. Full Alert List (max 1000 rows, newest first)
  const [alerts] = await db.query(
    `SELECT a.id, a.timestamp, a.alert_type, a.severity, a.source_ip, a.destination_ip, a.description, a.status, r.rule_name
     FROM alerts a
     LEFT JOIN detection_rules r ON a.rule_id = r.id
     WHERE a.timestamp >= ? AND a.timestamp <= ?
     ORDER BY a.timestamp DESC
     LIMIT 1000`,
    [startStr, endStr]
  );

  return {
    report_type: 'alerts',
    start_time: startTime,
    end_time: endTime,
    summary,
    alerts,
  };
}

/**
 * Builds data for a Devices & Risk Report
 * @param {string|Date} startTime
 * @param {string|Date} endTime
 */
async function buildDevicesReport(startTime, endTime) {
  const startStr = toMysqlDateTime(startTime);
  const endStr = toMysqlDateTime(endTime);

  const [rows] = await db.query(
    `SELECT 
       d.id,
       d.ip_address,
       d.mac_address,
       d.hostname,
       d.device_type,
       d.first_seen,
       d.last_seen,
       COALESCE(t.packets, 0) AS packets,
       COALESCE(t.bytes, 0) AS bytes,
       COALESCE(a.alerts, 0) AS alerts,
       COALESCE(a.risk_score, 0) AS risk_score
     FROM devices d
     LEFT JOIN (
       SELECT 
         device_id,
         COUNT(*) AS packets,
         SUM(bytes_transferred) AS bytes
       FROM network_traffic
       WHERE timestamp >= ? AND timestamp <= ? AND device_id IS NOT NULL
       GROUP BY device_id
     ) t ON d.id = t.device_id
     LEFT JOIN (
       SELECT 
         device_id,
         COUNT(*) AS alerts,
         SUM(CASE 
           WHEN severity = 'critical' THEN 10
           WHEN severity = 'high' THEN 6
           WHEN severity = 'medium' THEN 3
           WHEN severity = 'low' THEN 1
           ELSE 0
         END) AS risk_score
       FROM alerts
       WHERE timestamp >= ? AND timestamp <= ? AND device_id IS NOT NULL
       GROUP BY device_id
     ) a ON d.id = a.device_id
     ORDER BY risk_score DESC, d.last_seen DESC`,
    [startStr, endStr, startStr, endStr]
  );

  const devices = rows.map((r) => {
    const riskScore = Number(r.risk_score);
    return {
      id: r.id,
      ip_address: r.ip_address,
      mac_address: r.mac_address,
      hostname: r.hostname,
      device_type: r.device_type,
      packets: Number(r.packets),
      bytes: Number(r.bytes),
      alerts: Number(r.alerts),
      risk_score: riskScore,
      risk_level: calculateRiskLevel(riskScore),
      first_seen: r.first_seen,
      last_seen: r.last_seen,
    };
  });

  return {
    report_type: 'devices',
    start_time: startTime,
    end_time: endTime,
    devices,
  };
}

/**
 * Returns historical daily metrics for the last N days
 * @param {number} days
 */
async function getHistorySummary(days = 7) {
  const safeDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 30);

  const [trafficRows] = await db.query(
    `SELECT 
       DATE_FORMAT(timestamp, '%Y-%m-%d') AS date,
       COUNT(*) AS packets,
       COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY date
     ORDER BY date ASC`,
    [safeDays]
  );

  const [alertRows] = await db.query(
    `SELECT 
       DATE_FORMAT(timestamp, '%Y-%m-%d') AS date,
       COUNT(*) AS alerts
     FROM alerts
     WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY date
     ORDER BY date ASC`,
    [safeDays]
  );

  const dateMap = new Map();

  // Populate days in interval
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dateMap.set(dateStr, {
      date: dateStr,
      packets: 0,
      bytes: 0,
      alerts: 0,
    });
  }

  for (const r of trafficRows) {
    const existing = dateMap.get(r.date) || { date: r.date, packets: 0, bytes: 0, alerts: 0 };
    existing.packets = Number(r.packets);
    existing.bytes = Number(r.bytes);
    dateMap.set(r.date, existing);
  }

  for (const r of alertRows) {
    const existing = dateMap.get(r.date) || { date: r.date, packets: 0, bytes: 0, alerts: 0 };
    existing.alerts = Number(r.alerts);
    dateMap.set(r.date, existing);
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  buildTrafficReport,
  buildAlertsReport,
  buildDevicesReport,
  getHistorySummary,
};
