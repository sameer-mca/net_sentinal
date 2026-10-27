/**
 * NetSentinel Demo Seed Script
 * Generates and inserts 200 packets and 10 alerts distributed across the last 2 hours.
 */

const db = require('../src/config/db');
const { isPrivateIp, toMysqlDateTime } = require('../src/utils/network');

const PRIVATE_HOSTS = [
  { ip: '192.168.1.10', mac: 'aa:bb:cc:00:01:0a', hostname: 'gateway-router', type: 'router' },
  { ip: '192.168.1.20', mac: 'aa:bb:cc:00:01:0b', hostname: 'database-server', type: 'server' },
  { ip: '192.168.1.30', mac: 'aa:bb:cc:00:01:0c', hostname: 'workstation-dev1', type: 'workstation' },
  { ip: '192.168.1.40', mac: 'aa:bb:cc:00:01:0d', hostname: 'workstation-dev2', type: 'workstation' },
  { ip: '192.168.1.50', mac: 'aa:bb:cc:00:01:0e', hostname: 'iot-camera-lobby', type: 'iot' },
];

const PUBLIC_IPS = [
  '142.250.190.46',
  '8.8.8.8',
  '1.1.1.1',
  '93.184.216.34',
  '151.101.65.140',
  '104.244.42.1',
];

const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'DNS'];
const COMMON_PORTS = [80, 443, 53, 22, 8080, 3306, 5000, 5353];
const TCP_FLAGS = ['S', 'SA', 'A', 'PA', 'FA'];

async function seedDemo() {
  console.log('--- NetSentinel Demo Data Seeding ---');

  // 1. Upsert devices
  console.log('Upserting demo devices...');
  const now = new Date();
  const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);

  for (const host of PRIVATE_HOSTS) {
    await db.query(
      `INSERT INTO devices (ip_address, mac_address, hostname, device_type, status, first_seen, last_seen)
       VALUES (?, ?, ?, ?, 'active', ?, ?)
       ON DUPLICATE KEY UPDATE
         hostname = VALUES(hostname),
         device_type = VALUES(device_type),
         last_seen = GREATEST(last_seen, VALUES(last_seen)),
         status = 'active'`,
      [host.ip, host.mac, host.hostname, host.type, toMysqlDateTime(twoHoursAgo), toMysqlDateTime(now)]
    );
  }

  const [deviceRows] = await db.query('SELECT id, ip_address FROM devices');
  const ipToDeviceId = {};
  for (const row of deviceRows) {
    ipToDeviceId[row.ip_address] = row.id;
  }
  console.log(`Initialized ${deviceRows.length} devices.`);

  // 2. Generate 200 packets across last 120 minutes
  console.log('Generating 200 packets across last 2 hours...');
  const trafficValues = [];

  for (let i = 0; i < 200; i++) {
    // Random minutes in the past 120 min
    const offsetMs = Math.floor(Math.random() * 120 * 60 * 1000);
    const packetTime = new Date(Date.now() - offsetMs);

    const isOutbound = Math.random() > 0.35;
    const privateHost = PRIVATE_HOSTS[Math.floor(Math.random() * PRIVATE_HOSTS.length)];
    const publicIp = PUBLIC_IPS[Math.floor(Math.random() * PUBLIC_IPS.length)];

    const src_ip = isOutbound ? privateHost.ip : publicIp;
    const dst_ip = isOutbound ? publicIp : privateHost.ip;
    const deviceId = isOutbound ? ipToDeviceId[src_ip] : ipToDeviceId[dst_ip];

    const protocol = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
    const src_port = Math.floor(49152 + Math.random() * 16000);
    const dst_port = protocol === 'ICMP' ? null : COMMON_PORTS[Math.floor(Math.random() * COMMON_PORTS.length)];
    const tcp_flags = protocol === 'TCP' ? TCP_FLAGS[Math.floor(Math.random() * TCP_FLAGS.length)] : null;
    const packet_size = protocol === 'DNS' ? Math.floor(50 + Math.random() * 100) : Math.floor(64 + Math.random() * 1400);
    const isSuspicious = Math.random() < 0.08;
    const status = isSuspicious ? 'suspicious' : 'normal';

    trafficValues.push([
      deviceId || null,
      toMysqlDateTime(packetTime),
      src_ip,
      dst_ip,
      src_port,
      dst_port,
      protocol,
      packet_size,
      1, // packet_count
      packet_size, // bytes_transferred
      0, // duration
      tcp_flags,
      status,
    ]);
  }

  await db.query(
    `INSERT INTO network_traffic 
     (device_id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, packet_size, packet_count, bytes_transferred, duration, tcp_flags, status)
     VALUES ?`,
    [trafficValues]
  );
  console.log('Inserted 200 network traffic rows.');

  // 3. Generate 10 alerts
  console.log('Generating 10 alerts across last 2 hours...');
  const sampleAlerts = [
    {
      rule_id: 1,
      alert_type: 'syn_flood',
      severity: 'high',
      source_ip: '10.10.10.66',
      destination_ip: '192.168.1.20',
      description: 'SYN flood suspected: 150 SYN packets without ACK from 10.10.10.66 to 192.168.1.20 in 10s',
      status: 'new',
    },
    {
      rule_id: 2,
      alert_type: 'port_scan',
      severity: 'medium',
      source_ip: '192.168.1.40',
      destination_ip: '192.168.1.10',
      description: 'Port scan detected: 28 distinct destination ports probed in 10s',
      status: 'acknowledged',
    },
    {
      rule_id: 3,
      alert_type: 'icmp_flood',
      severity: 'high',
      source_ip: '10.10.10.88',
      destination_ip: '192.168.1.10',
      description: 'ICMP flood suspected: 200 echo request packets in 10s',
      status: 'new',
    },
    {
      rule_id: 4,
      alert_type: 'suspicious_dns',
      severity: 'medium',
      source_ip: '192.168.1.50',
      destination_ip: '8.8.8.8',
      description: 'Suspicious DNS query: 85-character domain query resembling DNS tunneling',
      status: 'resolved',
    },
    {
      rule_id: 5,
      alert_type: 'suspicious_payload',
      severity: 'high',
      source_ip: '198.51.100.22',
      destination_ip: '192.168.1.20',
      description: "SQL injection payload detected in HTTP request: \"' OR '1'='1\"",
      status: 'new',
    },
    {
      rule_id: 6,
      alert_type: 'malformed_packet',
      severity: 'medium',
      source_ip: '203.0.113.15',
      destination_ip: '192.168.1.10',
      description: 'Illegal TCP flag combination detected (SYN+FIN)',
      status: 'acknowledged',
    },
    {
      rule_id: 1,
      alert_type: 'syn_flood',
      severity: 'high',
      source_ip: '10.10.10.99',
      destination_ip: '192.168.1.30',
      description: 'SYN flood attempt on developer workstation: 120 packets in 10s',
      status: 'new',
    },
    {
      rule_id: 2,
      alert_type: 'port_scan',
      severity: 'medium',
      source_ip: '192.168.1.30',
      destination_ip: '192.168.1.20',
      description: 'Internal port scan against database server: 22 ports scanned',
      status: 'new',
    },
    {
      rule_id: 5,
      alert_type: 'suspicious_payload',
      severity: 'critical',
      source_ip: '198.51.100.44',
      destination_ip: '192.168.1.20',
      description: 'Remote command execution pattern detected in request body (/bin/sh)',
      status: 'new',
    },
    {
      rule_id: 4,
      alert_type: 'suspicious_dns',
      severity: 'low',
      source_ip: '192.168.1.40',
      destination_ip: '1.1.1.1',
      description: 'High frequency DNS lookups (55 requests in 60s)',
      status: 'resolved',
    },
  ];

  for (let i = 0; i < sampleAlerts.length; i++) {
    const a = sampleAlerts[i];
    const offsetMs = Math.floor(Math.random() * 115 * 60 * 1000);
    const alertTime = new Date(Date.now() - offsetMs);
    const deviceId = ipToDeviceId[a.source_ip] || ipToDeviceId[a.destination_ip] || null;

    await db.query(
      `INSERT INTO alerts 
       (device_id, rule_id, traffic_id, timestamp, alert_type, severity, source_ip, destination_ip, description, status)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        a.rule_id,
        toMysqlDateTime(alertTime),
        a.alert_type,
        a.severity,
        a.source_ip,
        a.destination_ip,
        a.description,
        a.status,
      ]
    );
  }
  console.log('Inserted 10 alerts.');

  console.log('--- Demo Data Seeding Completed Successfully ---');
}

if (require.main === module) {
  seedDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seedDemo;
