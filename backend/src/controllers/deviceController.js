const db = require('../config/db');
const { statsService } = require('../services');

/**
 * GET /api/devices
 * Lists all devices with computed 24h metrics, risk score, and active status
 */
async function getDevices(req, res, next) {
  try {
    const devices = await statsService.getDevicesWithStats();
    return res.status(200).json(devices);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/devices/:id
 * Single device details with last 20 alerts
 */
async function getDeviceById(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }

    const allDevices = await statsService.getDevicesWithStats();
    const device = allDevices.find((d) => d.id === deviceId);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const [alerts] = await db.query(
      `SELECT a.*, r.rule_name 
       FROM alerts a 
       LEFT JOIN detection_rules r ON a.rule_id = r.id 
       WHERE a.device_id = ? 
       ORDER BY a.timestamp DESC 
       LIMIT 20`,
      [deviceId]
    );

    return res.status(200).json({
      ...device,
      alerts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/devices/:id
 * Admin only: update device hostname and/or device_type label
 */
async function updateDevice(req, res, next) {
  try {
    const deviceId = parseInt(req.params.id, 10);
    if (isNaN(deviceId)) {
      return res.status(400).json({ message: 'Invalid device ID' });
    }

    const [existing] = await db.query('SELECT id FROM devices WHERE id = ?', [deviceId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const { hostname, device_type } = req.body;
    const updates = [];
    const params = [];

    if (hostname !== undefined) {
      updates.push('hostname = ?');
      params.push(hostname !== null ? String(hostname).trim() : null);
    }

    if (device_type !== undefined) {
      updates.push('device_type = ?');
      params.push(device_type !== null ? String(device_type).trim() : 'unknown');
    }

    if (updates.length > 0) {
      params.push(deviceId);
      await db.query(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const allDevices = await statsService.getDevicesWithStats();
    const updatedDevice = allDevices.find((d) => d.id === deviceId);

    return res.status(200).json(updatedDevice);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDevices,
  getDeviceById,
  updateDevice,
};
