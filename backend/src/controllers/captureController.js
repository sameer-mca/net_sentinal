const db = require('../config/db');
const { captureState } = require('../services');
const { getIO } = require('../sockets');

/**
 * Helper to build the unified capture status object
 */
async function getCaptureStatusPayload() {
  const [rows] = await db.query('SELECT * FROM capture_settings WHERE id = 1');
  const settings = rows[0] || null;

  return {
    settings,
    engine_online: captureState.isEngineOnline(),
    engine: captureState.getEngine(),
  };
}

/**
 * GET /api/capture/status
 */
async function getStatus(req, res, next) {
  try {
    const payload = await getCaptureStatusPayload();
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/capture/interfaces
 */
async function getInterfaces(req, res, next) {
  try {
    const interfaces = captureState.getInterfaces();
    return res.status(200).json(interfaces);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/capture/start
 */
async function startCapture(req, res, next) {
  try {
    const { mode, interface_name, simulate_attacks } = req.body;

    if (!mode || (mode !== 'simulator' && mode !== 'sniffer')) {
      return res.status(400).json({ message: "Mode must be 'simulator' or 'sniffer'" });
    }

    if (mode === 'sniffer' && (!interface_name || typeof interface_name !== 'string')) {
      return res.status(400).json({ message: 'interface_name is required when mode is sniffer' });
    }

    const simAttacks = simulate_attacks !== undefined ? Boolean(simulate_attacks) : true;
    const iface = mode === 'sniffer' ? interface_name.trim() : (interface_name || null);

    await db.query(
      `UPDATE capture_settings 
       SET is_running = TRUE, mode = ?, interface_name = ?, simulate_attacks = ?
       WHERE id = 1`,
      [mode, iface, simAttacks]
    );

    const payload = await getCaptureStatusPayload();

    try {
      const io = getIO();
      io.to('dashboard').emit('capture:status', payload);
    } catch (e) {
      console.error('Socket emission error in startCapture:', e.message);
    }

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/capture/stop
 */
async function stopCapture(req, res, next) {
  try {
    await db.query('UPDATE capture_settings SET is_running = FALSE WHERE id = 1');

    const payload = await getCaptureStatusPayload();

    try {
      const io = getIO();
      io.to('dashboard').emit('capture:status', payload);
    } catch (e) {
      console.error('Socket emission error in stopCapture:', e.message);
    }

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatus,
  getInterfaces,
  startCapture,
  stopCapture,
  getCaptureStatusPayload,
};
