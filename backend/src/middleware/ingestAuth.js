const env = require('../config/env');

/**
 * Middleware to verify Python ingest API key
 */
function ingestAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== env.INGEST_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return next();
}

module.exports = {
  ingestAuth,
};
