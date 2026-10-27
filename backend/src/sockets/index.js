const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const { sha256 } = require('../utils/hash');

let ioInstance = null;

/**
 * Initialize Socket.io with HTTP server and authentication middleware
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Authenticate socket connections
  ioInstance.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!rawToken || typeof rawToken !== 'string') {
        return next(new Error('Unauthorized'));
      }

      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_SECRET);
      } catch (err) {
        return next(new Error('Unauthorized'));
      }

      if (!decoded || !decoded.id) {
        return next(new Error('Unauthorized'));
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
        return next(new Error('Unauthorized'));
      }

      const sessionUser = rows[0];
      socket.data.user = {
        id: sessionUser.user_id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
      };

      return next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Unauthorized'));
    }
  });

  ioInstance.on('connection', (socket) => {
    socket.join('dashboard');

    socket.on('disconnect', () => {
      // Disconnected
    });
  });

  return ioInstance;
}

/**
 * Retrieve the active Socket.io instance
 * @returns {Server}
 */
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized');
  }
  return ioInstance;
}

module.exports = {
  initSocket,
  getIO,
};
