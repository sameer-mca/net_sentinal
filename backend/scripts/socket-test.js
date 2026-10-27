/**
 * Socket.io integration test script for NetSentinel
 * Logs in as Admin, connects via Socket.io with auth token,
 * listens for live events, and optionally sends sample packets & alerts to verify reception.
 */

const { io } = require('socket.io-client');
const env = require('../src/config/env');

const BASE_URL = `http://localhost:${env.PORT}`;

async function main() {
  console.log(`[SocketTest] Logging in as admin (${env.ADMIN_EMAIL})...`);

  // 1. Log in to get JWT token
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${loginRes.statusText}`);
  }

  const { token, user } = await loginRes.json();
  console.log(`[SocketTest] Logged in successfully as ${user.name} (${user.role}).`);

  // 2. Connect via Socket.io
  console.log(`[SocketTest] Connecting to Socket.io server at ${BASE_URL}...`);
  const socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  const receivedEvents = {
    trafficBatch: false,
    trafficStats: false,
    alertNew: false,
  };

  function checkDone() {
    if (receivedEvents.trafficBatch && receivedEvents.trafficStats && receivedEvents.alertNew) {
      console.log('\n[SocketTest] SUCCESS: All 3 required events ("traffic:batch", "traffic:stats", "alert:new") received!');
      setTimeout(() => {
        socket.disconnect();
        process.exit(0);
      }, 500);
    }
  }

  socket.on('connect', async () => {
    console.log(`[SocketTest] Socket connected! Socket ID: ${socket.id}`);

    // If --auto-send or AUTO_SEND env is set, trigger sample ingestion
    const autoSend = process.argv.includes('--auto-send') || process.env.AUTO_SEND === '1';
    if (autoSend) {
      console.log('[SocketTest] Auto-sending sample packet batch and alert...');
      await sendSampleData();
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[SocketTest] Socket connect error:', err.message);
  });

  socket.on('traffic:batch', (packets) => {
    console.log(`[SocketTest] EVENT RECEIVED: "traffic:batch" (count: ${packets.length})`);
    if (packets.length > 0) {
      console.log('             Sample packet:', JSON.stringify(packets[0]));
    }
    receivedEvents.trafficBatch = true;
    checkDone();
  });

  socket.on('traffic:stats', (stats) => {
    console.log(`[SocketTest] EVENT RECEIVED: "traffic:stats" -> Packets: ${stats.packets}, Bytes: ${stats.bytes}, Protocols:`, stats.protocols);
    receivedEvents.trafficStats = true;
    checkDone();
  });

  socket.on('alert:new', (alert) => {
    console.log(`[SocketTest] EVENT RECEIVED: "alert:new" -> ID: ${alert.id}, Type: ${alert.alert_type}, Severity: ${alert.severity}, Source: ${alert.source_ip}`);
    receivedEvents.alertNew = true;
    checkDone();
  });

  socket.on('capture:status', (status) => {
    console.log('[SocketTest] EVENT RECEIVED: "capture:status" -> Running:', status.settings?.is_running, 'Engine Online:', status.engine_online);
  });

  async function sendSampleData() {
    // Send packet batch
    const samplePackets = [
      {
        timestamp: new Date().toISOString(),
        src_ip: '192.168.1.50',
        dst_ip: '142.250.190.46',
        src_port: 52400,
        dst_port: 443,
        protocol: 'TCP',
        packet_size: 480,
        tcp_flags: 'PA',
        src_mac: '00:1a:2b:3c:4d:5e',
        status: 'normal',
      },
      {
        timestamp: new Date().toISOString(),
        src_ip: '192.168.1.50',
        dst_ip: '8.8.8.8',
        src_port: 53120,
        dst_port: 53,
        protocol: 'DNS',
        packet_size: 72,
        tcp_flags: null,
        src_mac: '00:1a:2b:3c:4d:5e',
        status: 'normal',
      },
    ];

    await fetch(`${BASE_URL}/api/ingest/packets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.INGEST_API_KEY,
      },
      body: JSON.stringify({ packets: samplePackets }),
    });

    // Send sample alert
    const sampleAlerts = [
      {
        timestamp: new Date().toISOString(),
        rule_id: 1,
        alert_type: 'syn_flood',
        severity: 'high',
        source_ip: '10.10.10.66',
        destination_ip: '192.168.1.50',
        description: 'SYN flood detected: 120 SYN packets from 10.10.10.66 to 192.168.1.50 in 10s',
      },
    ];

    await fetch(`${BASE_URL}/api/ingest/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.INGEST_API_KEY,
      },
      body: JSON.stringify({ alerts: sampleAlerts }),
    });
  }

  // Safety timeout for auto-send mode
  if (process.argv.includes('--auto-send') || process.env.AUTO_SEND === '1') {
    setTimeout(() => {
      console.error('[SocketTest] Timeout waiting for events');
      process.exit(1);
    }, 10000);
  }
}

main().catch((err) => {
  console.error('[SocketTest] Fatal error:', err);
  process.exit(1);
});
