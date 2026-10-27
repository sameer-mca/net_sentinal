const db = require('../config/db');
const { statsService } = require('../services');
const { toMysqlDateTime } = require('../utils/network');

/**
 * GET /api/traffic
 * Filterable and paginated network traffic query
 */
async function getTraffic(req, res, next) {
  try {
    const conditions = [];
    const params = [];

    // Date range defaults: from = 24h ago, to = now
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = req.query.to ? new Date(req.query.to) : new Date();

    conditions.push('timestamp >= ? AND timestamp <= ?');
    params.push(toMysqlDateTime(fromDate), toMysqlDateTime(toDate));

    if (req.query.protocol) {
      conditions.push('protocol = ?');
      params.push(String(req.query.protocol).trim().toUpperCase());
    }

    if (req.query.src_ip) {
      conditions.push('src_ip = ?');
      params.push(String(req.query.src_ip).trim());
    }

    if (req.query.dst_ip) {
      conditions.push('dst_ip = ?');
      params.push(String(req.query.dst_ip).trim());
    }

    if (req.query.port) {
      const portNum = parseInt(req.query.port, 10);
      if (!isNaN(portNum)) {
        conditions.push('(src_port = ? OR dst_port = ?)');
        params.push(portNum, portNum);
      }
    }

    if (req.query.status) {
      conditions.push('status = ?');
      params.push(String(req.query.status).trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM network_traffic ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total || 0);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Sorting (default timestamp DESC)
    const sortDirection = String(req.query.sort).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await db.query(
      `SELECT * FROM network_traffic ${whereClause} ORDER BY timestamp ${sortDirection} LIMIT ? OFFSET ?`,
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
 * GET /api/traffic/stats
 */
async function getStats(req, res, next) {
  try {
    const minutes = parseInt(req.query.minutes, 10) || 60;
    const stats = await statsService.getTrafficStats(minutes);
    return res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/traffic/protocols
 */
async function getProtocols(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT protocol FROM network_traffic ORDER BY protocol ASC'
    );
    const protocols = rows.map((r) => r.protocol);
    return res.status(200).json(protocols);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTraffic,
  getStats,
  getProtocols,
};
