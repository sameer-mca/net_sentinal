const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const { sha256 } = require('../utils/hash');

/**
 * Middleware to require a valid authenticated JWT session
 */
async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tokenHash = sha256(token);
    const [rows] = await db.query(
      `SELECT s.id AS session_id, s.user_id, u.name, u.email, u.role
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > NOW()
       LIMIT 1;`,
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sessionUser = rows[0];
    req.user = {
      id: sessionUser.user_id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
    };
    req.token = token;
    req.tokenHash = tokenHash;

    return next();
  } catch (error) {
    console.error('authRequired error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

/**
 * Middleware to restrict access to admin users only
 */
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

module.exports = {
  authRequired,
  adminOnly,
};
