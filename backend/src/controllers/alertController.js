const db = require('../config/db');
const { statsService } = require('../services');
const { getIO } = require('../sockets');
const { toMysqlDateTime } = require('../utils/network');
const { isIn } = require('../utils/validators');

const VALID_STATUSES = ['new', 'acknowledged', 'resolved'];

/**
 * GET /api/alerts
 * Filterable and paginated alerts list (newest first)
 */
async function getAlerts(req, res, next) {
  try {
    const conditions = [];
    const params = [];

    // Date range defaults: from = 24h ago, to = now
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = req.query.to ? new Date(req.query.to) : new Date();

    conditions.push('a.timestamp >= ? AND a.timestamp <= ?');
    params.push(toMysqlDateTime(fromDate), toMysqlDateTime(toDate));

    if (req.query.severity) {
      conditions.push('a.severity = ?');
      params.push(String(req.query.severity).toLowerCase().trim());
    }

    if (req.query.status) {
      conditions.push('a.status = ?');
      params.push(String(req.query.status).toLowerCase().trim());
    }

    if (req.query.alert_type) {
      conditions.push('a.alert_type = ?');
      params.push(String(req.query.alert_type).trim());
    }

    if (req.query.source_ip) {
      conditions.push('a.source_ip = ?');
      params.push(String(req.query.source_ip).trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM alerts a ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await db.query(
      `SELECT a.*, r.rule_name 
       FROM alerts a 
       LEFT JOIN detection_rules r ON a.rule_id = r.id 
       ${whereClause} 
       ORDER BY a.timestamp DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      data: rows,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts/summary
 */
async function getSummary(req, res, next) {
  try {
    const summary = await statsService.getAlertsSummary();
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/alerts/:id
 */
async function getAlertById(req, res, next) {
  try {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'Invalid alert ID' });
    }

    const [rows] = await db.query(
      `SELECT a.*, r.rule_name 
       FROM alerts a 
       LEFT JOIN detection_rules r ON a.rule_id = r.id 
       WHERE a.id = ?`,
      [alertId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/alerts/:id/status
 * Admin only: updates alert status and broadcasts alert:updated
 */
async function updateAlertStatus(req, res, next) {
  try {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'Invalid alert ID' });
    }

    const { status } = req.body;
    if (!isIn(status, VALID_STATUSES)) {
      return res.status(400).json({ message: 'Status must be new, acknowledged, or resolved' });
    }

    const [existing] = await db.query('SELECT id FROM alerts WHERE id = ?', [alertId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await db.query('UPDATE alerts SET status = ? WHERE id = ?', [status, alertId]);

    const [updatedRows] = await db.query(
      `SELECT a.*, r.rule_name 
       FROM alerts a 
       LEFT JOIN detection_rules r ON a.rule_id = r.id 
       WHERE a.id = ?`,
      [alertId]
    );
    const updatedRow = updatedRows[0];

    // Emit Socket.io event alert:updated
    try {
      const io = getIO();
      io.to('dashboard').emit('alert:updated', updatedRow);
    } catch (e) {
      console.error('Socket emission error in updateAlertStatus:', e.message);
    }

    return res.status(200).json(updatedRow);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAlerts,
  getSummary,
  getAlertById,
  updateAlertStatus,
};
