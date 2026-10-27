const db = require('../config/db');
const { captureState } = require('../services');
const { getIO } = require('../sockets');
const { isPrivateIp, toMysqlDateTime } = require('../utils/network');
const { isIn } = require('../utils/validators');
const { getCaptureStatusPayload } = require('./captureController');

const VALID_PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'DNS', 'OTHER'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

/**
 * POST /api/ingest/packets
 * Ingests a batch of packets from capture service
 */
async function postPackets(req, res, next) {
  try {
    const { packets } = req.body;

    if (!Array.isArray(packets)) {
      return res.status(400).json({ message: 'packets must be an array' });
    }

    if (packets.length > 1000) {
      return res.status(413).json({ message: 'Packet batch too large (max 1000)' });
    }

    const validPackets = [];
    let skipped = 0;

    for (const p of packets) {
      if (!p || typeof p !== 'object') {
        skipped++;
        continue;
      }

      // Check required fields
      if (!p.timestamp || !p.src_ip || !p.dst_ip) {
        skipped++;
        continue;
      }

      const parsedDate = new Date(p.timestamp);
      if (isNaN(parsedDate.getTime())) {
        skipped++;
        continue;
      }

      const protocol = typeof p.protocol === 'string' ? p.protocol.toUpperCase() : '';
      if (!VALID_PROTOCOLS.includes(protocol)) {
        skipped++;
        continue;
      }

      const packetSize = Number(p.packet_size);
      if (isNaN(packetSize) || packetSize < 0) {
        skipped++;
        continue;
      }

      const status = p.status === 'suspicious' ? 'suspicious' : 'normal';

      validPackets.push({
        timestamp: parsedDate,
        isoTimestamp: parsedDate.toISOString(),
        src_ip: String(p.src_ip).trim(),
        dst_ip: String(p.dst_ip).trim(),
        src_port: p.src_port !== undefined && p.src_port !== null && !isNaN(p.src_port) ? parseInt(p.src_port, 10) : null,
        dst_port: p.dst_port !== undefined && p.dst_port !== null && !isNaN(p.dst_port) ? parseInt(p.dst_port, 10) : null,
        protocol,
        packet_size: packetSize,
        tcp_flags: p.tcp_flags ? String(p.tcp_flags) : null,
        src_mac: p.src_mac ? String(p.src_mac).toLowerCase() : null,
        status,
      });
    }

    if (validPackets.length === 0) {
      return res.status(200).json({ inserted: 0, skipped });
    }

    // Upsert distinct private IPs into devices
    const privateIpsMap = new Map();
    for (const p of validPackets) {
      // Check src_ip
      if (isPrivateIp(p.src_ip)) {
        const existing = privateIpsMap.get(p.src_ip) || {
          firstSeen: p.timestamp,
          lastSeen: p.timestamp,
          mac: null,
        };
        if (p.timestamp < existing.firstSeen) existing.firstSeen = p.timestamp;
        if (p.timestamp > existing.lastSeen) existing.lastSeen = p.timestamp;
        if (p.src_mac) existing.mac = p.src_mac;
        privateIpsMap.set(p.src_ip, existing);
      }

      // Check dst_ip
      if (isPrivateIp(p.dst_ip)) {
        const existing = privateIpsMap.get(p.dst_ip) || {
          firstSeen: p.timestamp,
          lastSeen: p.timestamp,
          mac: null,
        };
        if (p.timestamp < existing.firstSeen) existing.firstSeen = p.timestamp;
        if (p.timestamp > existing.lastSeen) existing.lastSeen = p.timestamp;
        privateIpsMap.set(p.dst_ip, existing);
      }
    }

    const ipToDeviceId = {};

    if (privateIpsMap.size > 0) {
      for (const [ip, data] of privateIpsMap.entries()) {
        await db.query(
          `INSERT INTO devices (ip_address, mac_address, status, first_seen, last_seen)
           VALUES (?, ?, 'active', ?, ?)
           ON DUPLICATE KEY UPDATE
             last_seen = GREATEST(last_seen, VALUES(last_seen)),
             status = 'active',
             mac_address = IF(VALUES(mac_address) IS NOT NULL, VALUES(mac_address), mac_address)`,
          [ip, data.mac || null, toMysqlDateTime(data.firstSeen), toMysqlDateTime(data.lastSeen)]
        );
      }

      const ipList = Array.from(privateIpsMap.keys());
      const [deviceRows] = await db.query(
        'SELECT id, ip_address FROM devices WHERE ip_address IN (?)',
        [ipList]
      );

      for (const row of deviceRows) {
        ipToDeviceId[row.ip_address] = row.id;
      }
    }

    // Bulk insert into network_traffic
    const trafficRows = validPackets.map((p) => {
      let deviceId = null;
      if (isPrivateIp(p.src_ip) && ipToDeviceId[p.src_ip]) {
        deviceId = ipToDeviceId[p.src_ip];
      } else if (isPrivateIp(p.dst_ip) && ipToDeviceId[p.dst_ip]) {
        deviceId = ipToDeviceId[p.dst_ip];
      }

      return [
        deviceId,
        toMysqlDateTime(p.timestamp),
        p.src_ip,
        p.dst_ip,
        p.src_port,
        p.dst_port,
        p.protocol,
        p.packet_size,
        1, // packet_count
        p.packet_size, // bytes_transferred
        0, // duration
        p.tcp_flags,
        p.status,
      ];
    });

    await db.query(
      `INSERT INTO network_traffic 
       (device_id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, packet_size, packet_count, bytes_transferred, duration, tcp_flags, status) 
       VALUES ?`,
      [trafficRows]
    );

    // Socket.io emissions
    try {
      const io = getIO();

      // Newest 50 packets of the batch
      const sortedPackets = [...validPackets].sort((a, b) => b.timestamp - a.timestamp);
      const newest50 = sortedPackets.slice(0, 50).map((p) => ({
        timestamp: p.isoTimestamp,
        src_ip: p.src_ip,
        dst_ip: p.dst_ip,
        src_port: p.src_port,
        dst_port: p.dst_port,
        protocol: p.protocol,
        packet_size: p.packet_size,
        status: p.status,
      }));

      // Protocol stats calculation
      const protocols = { TCP: 0, UDP: 0, ICMP: 0, DNS: 0, OTHER: 0 };
      let totalBytes = 0;

      for (const p of validPackets) {
        totalBytes += p.packet_size;
        if (protocols[p.protocol] !== undefined) {
          protocols[p.protocol]++;
        } else {
          protocols.OTHER++;
        }
      }

      const statsPayload = {
        timestamp: new Date().toISOString(),
        packets: validPackets.length,
        bytes: totalBytes,
        protocols,
      };

      io.to('dashboard').emit('traffic:batch', newest50);
      io.to('dashboard').emit('traffic:stats', statsPayload);
    } catch (e) {
      console.error('Socket emission error in postPackets:', e.message);
    }

    return res.status(200).json({
      inserted: validPackets.length,
      skipped,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ingest/alerts
 * Ingests a batch of alerts from capture service
 */
async function postAlerts(req, res, next) {
  try {
    const { alerts } = req.body;

    if (!Array.isArray(alerts)) {
      return res.status(400).json({ message: 'alerts must be an array' });
    }

    if (alerts.length > 200) {
      return res.status(413).json({ message: 'Alerts batch too large (max 200)' });
    }

    let insertedCount = 0;

    for (const a of alerts) {
      if (!a || !a.alert_type || !a.severity || !a.source_ip) {
        continue;
      }

      const severity = String(a.severity).toLowerCase();
      if (!VALID_SEVERITIES.includes(severity)) {
        continue;
      }

      const alertTimestamp = a.timestamp ? new Date(a.timestamp) : new Date();
      const mysqlTime = toMysqlDateTime(alertTimestamp);

      // Find device_id by source_ip if available
      let deviceId = null;
      const [devices] = await db.query(
        'SELECT id FROM devices WHERE ip_address = ? LIMIT 1',
        [a.source_ip]
      );
      if (devices && devices.length > 0) {
        deviceId = devices[0].id;
      }

      const ruleId = a.rule_id ? parseInt(a.rule_id, 10) : null;
      const destinationIp = a.destination_ip || null;
      const description = a.description || '';

      const [insertResult] = await db.query(
        `INSERT INTO alerts 
         (device_id, rule_id, traffic_id, timestamp, alert_type, severity, source_ip, destination_ip, description, status)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'new')`,
        [
          deviceId,
          ruleId,
          mysqlTime,
          a.alert_type,
          severity,
          a.source_ip,
          destinationIp,
          description,
        ]
      );

      insertedCount++;

      // Fetch the full inserted alert row and emit alert:new
      try {
        const [insertedRows] = await db.query(
          'SELECT * FROM alerts WHERE id = ?',
          [insertResult.insertId]
        );
        if (insertedRows && insertedRows.length > 0) {
          const fullAlert = insertedRows[0];
          const io = getIO();
          io.to('dashboard').emit('alert:new', fullAlert);
        }
      } catch (err) {
        console.error('Socket emission error in postAlerts:', err.message);
      }
    }

    return res.status(200).json({ inserted: insertedCount });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ingest/heartbeat
 * Heartbeat from Python capture service
 */
async function postHeartbeat(req, res, next) {
  try {
    const { running, mode, interfaces, last_error } = req.body;

    const changed = captureState.updateHeartbeat({
      running,
      mode,
      interfaces,
      last_error,
    });

    if (changed) {
      try {
        const payload = await getCaptureStatusPayload();
        const io = getIO();
        io.to('dashboard').emit('capture:status', payload);
      } catch (err) {
        console.error('Socket emission error in postHeartbeat:', err.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ingest/control
 * Returns capture settings and active detection rules for the Python service
 */
async function getControl(req, res, next) {
  try {
    const [settingsRows] = await db.query('SELECT * FROM capture_settings WHERE id = 1');
    const settings = settingsRows[0] || null;

    const [rulesRows] = await db.query(
      'SELECT * FROM detection_rules WHERE is_active = 1'
    );

    return res.status(200).json({
      settings,
      rules: rulesRows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  postPackets,
  postAlerts,
  postHeartbeat,
  getControl,
};
