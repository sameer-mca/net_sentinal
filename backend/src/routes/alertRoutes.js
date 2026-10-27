const express = require('express');
const alertController = require('../controllers/alertController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

// Fixed routes first
router.get('/summary', alertController.getSummary);

// Parameter routes
router.get('/:id', alertController.getAlertById);
router.patch('/:id/status', adminOnly, alertController.updateAlertStatus);

// Main list route
router.get('/', alertController.getAlerts);

module.exports = router;
