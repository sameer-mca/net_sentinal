const { authRequired, adminOnly } = require('./auth');
const { ingestAuth } = require('./ingestAuth');

module.exports = {
  authRequired,
  adminOnly,
  ingestAuth,
};
