const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const db = require('./config/db');
const { initSocket } = require('./sockets');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const ingestRoutes = require('./routes/ingestRoutes');
const captureRoutes = require('./routes/captureRoutes');
const trafficRoutes = require('./routes/trafficRoutes');
const alertRoutes = require('./routes/alertRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io on the HTTP server
const io = initSocket(server);

// Global middleware
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Public health check endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await db.query('SELECT 1');
  } catch (err) {
    console.error('Database health check error:', err.message);
    dbStatus = 'error';
  }

  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    db: dbStatus
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ message });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(env.PORT, () => {
    console.log(`NetSentinel backend listening on port ${env.PORT}`);
  });
}

module.exports = { app, server, io };
