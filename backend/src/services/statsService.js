const db = require('../config/db');
const { toMysqlDateTime } = require('../utils/network');

/**
 * Calculates risk level string based on numerical risk score
 * @param {number} score
 * @returns {'low'|'medium'|'high'|'critical'}
 */
function calculateRiskLevel(score) {
  if (score >= 30) return 'critical';
  if (score >= 15) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

/**
 * Get comprehensive traffic statistics for a given time window in minutes
 * @param {number} minutes
 */
async function getTrafficStats(minutes = 60) {
  const windowMinutes = Math.min(Math.max(parseInt(minutes, 10) || 60, 1), 1440);
  const now = new Date();
  const fromDate = new Date(Date.now() - windowMinutes * 60 * 1000);
  const fromStr = toMysqlDateTime(fromDate);
  const toStr = toMysqlDateTime(now);

  // 1. Totals
  const [trafficTotals] = await db.query(
    `SELECT 
       COUNT(*) AS packets,
       COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?`,
    [fromStr, toStr]
  );

  const [alertTotals] = await db.query(
    `SELECT COUNT(*) AS alerts
     FROM alerts
     WHERE timestamp >= ? AND timestamp <= ?`,
    [fromStr, toStr]
  );

  const [activeDeviceTotals] = await db.query(
    `SELECT COUNT(DISTINCT device_id) AS active_devices
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ? AND device_id IS NOT NULL`,
    [fromStr, toStr]
  );

  // 2. Protocol distribution
  const [protoDist] = await db.query(
    `SELECT protocol, COUNT(*) AS count
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY protocol
     ORDER BY count DESC`,
    [fromStr, toStr]
  );

  // 3. Timeline (grouped per minute)
  const [timeline] = await db.query(
    `SELECT 
       DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i') AS time,
       COUNT(*) AS packets,
       COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY time
     ORDER BY time ASC`,
    [fromStr, toStr]
  );

  // 4. Top talkers (top 5 src_ip by bytes)
  const [topTalkers] = await db.query(
    `SELECT 
       src_ip AS ip,
       COUNT(*) AS packets,
       COALESCE(SUM(bytes_transferred), 0) AS bytes
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ?
     GROUP BY src_ip
     ORDER BY bytes DESC
     LIMIT 5`,
    [fromStr, toStr]
  );

  // 5. Top ports (top 5 dst_port non-null)
  const [topPorts] = await db.query(
    `SELECT 
       dst_port AS port,
       COUNT(*) AS count
     FROM network_traffic
     WHERE timestamp >= ? AND timestamp <= ? AND dst_port IS NOT NULL
     GROUP BY dst_port
     ORDER BY count DESC
     LIMIT 5`,
    [fromStr, toStr]
  );

  return {
    totals: {
      packets: Number(trafficTotals[0]?.packets || 0),
      bytes: Number(trafficTotals[0]?.bytes || 0),
      alerts: Number(alertTotals[0]?.alerts || 0),
      active_devices: Number(activeDeviceTotals[0]?.active_devices || 0),
    },
    protocol_distribution: protoDist.map((r) => ({
      protocol: r.protocol,
      count: Number(r.count),
    })),
    timeline: timeline.map((r) => ({
      time: r.time,
      packets: Number(r.packets),
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
    })),
  };
}

/**
 * Get summary breakdown of alerts
 */
async function getAlertsSummary() {
  const [bySeverity] = await db.query(
    `SELECT severity, COUNT(*) AS count
     FROM alerts
     GROUP BY severity
     ORDER BY count DESC`
  );

  const [byType] = await db.query(
    `SELECT alert_type, COUNT(*) AS count
     FROM alerts
     GROUP BY alert_type
     ORDER BY count DESC`
  );

  const [byStatus] = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM alerts
     GROUP BY status
     ORDER BY count DESC`
  );

  const [timeline] = await db.query(
    `SELECT 
       DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') AS hour,
       COUNT(*) AS count
     FROM alerts
     WHERE timestamp >= NOW() - INTERVAL 24 HOUR
     GROUP BY hour
     ORDER BY hour ASC`
  );

  const [openCountRow] = await db.query(
    `SELECT COUNT(*) AS open_count
     FROM alerts
     WHERE status = 'new'`
  );

  return {
    by_severity: bySeverity.map((r) => ({ severity: r.severity, count: Number(r.count) })),
    by_type: byType.map((r) => ({ alert_type: r.alert_type, count: Number(r.count) })),
    by_status: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    last_24h_timeline: timeline.map((r) => ({ hour: r.hour, count: Number(r.count) })),
    open_count: Number(openCountRow[0]?.open_count || 0),
  };
}

/**
 * Get all devices with 24h stats and risk calculation
 */
async function getDevicesWithStats() {
  const [rows] = await db.query(
    `SELECT 
       d.id,
       d.ip_address,
       d.mac_address,
       d.hostname,
       d.device_type,
       d.first_seen,
       d.last_seen,
       COALESCE(t.packets_24h, 0) AS packets_24h,
       COALESCE(t.bytes_24h, 0) AS bytes_24h,
       COALESCE(a.alerts_24h, 0) AS alerts_24h,
       COALESCE(a.risk_score, 0) AS risk_score
     FROM devices d
     LEFT JOIN (
       SELECT 
         device_id,
         COUNT(*) AS packets_24h,
         SUM(bytes_transferred) AS bytes_24h
       FROM network_traffic
       WHERE timestamp >= NOW() - INTERVAL 24 HOUR AND device_id IS NOT NULL
       GROUP BY device_id
     ) t ON d.id = t.device_id
     LEFT JOIN (
       SELECT 
         device_id,
         COUNT(*) AS alerts_24h,
         SUM(CASE 
           WHEN severity = 'critical' THEN 10
           WHEN severity = 'high' THEN 6
           WHEN severity = 'medium' THEN 3
           WHEN severity = 'low' THEN 1
           ELSE 0
         END) AS risk_score
       FROM alerts
       WHERE timestamp >= NOW() - INTERVAL 24 HOUR AND device_id IS NOT NULL
       GROUP BY device_id
     ) a ON d.id = a.device_id
     ORDER BY d.last_seen DESC`
  );

  const now = Date.now();
  return rows.map((r) => {
    const lastSeenTime = new Date(r.last_seen).getTime();
    // Active if last_seen within 5 minutes
    const isRecentlySeen = !isNaN(lastSeenTime) && now - lastSeenTime <= 5 * 60 * 1000;
    const riskScore = Number(r.risk_score);

    return {
      id: r.id,
      ip_address: r.ip_address,
      mac_address: r.mac_address,
      hostname: r.hostname,
      device_type: r.device_type,
      status: isRecentlySeen ? 'active' : 'inactive',
      first_seen: r.first_seen,
      last_seen: r.last_seen,
      packets_24h: Number(r.packets_24h),
      bytes_24h: Number(r.bytes_24h),
      alerts_24h: Number(r.alerts_24h),
      risk_score: riskScore,
      risk_level: calculateRiskLevel(riskScore),
    };
  });
}

/**
 * Get recent alerts with joined rule_name
 * @param {number} limit
 */
async function getRecentAlerts(limit = 10) {
  const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
  const [rows] = await db.query(
    `SELECT a.*, r.rule_name
     FROM alerts a
     LEFT JOIN detection_rules r ON a.rule_id = r.id
     ORDER BY a.timestamp DESC
     LIMIT ?`,
    [safeLimit]
  );
  return rows;
}

module.exports = {
  calculateRiskLevel,
  getTrafficStats,
  getAlertsSummary,
  getDevicesWithStats,
  getRecentAlerts,
};
