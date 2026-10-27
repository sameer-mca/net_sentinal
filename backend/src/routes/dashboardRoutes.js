const express = require('express');
const { statsService } = require('../services');
const { getCaptureStatusPayload } = require('../controllers/captureController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

/**
 * GET /api/dashboard/overview
 * Single aggregated overview endpoint for the main dashboard
 */
router.get('/overview', async (req, res, next) => {
  try {
    const [capture, stats, alert_summary, recent_alerts, allDevices] = await Promise.all([
      getCaptureStatusPayload(),
      statsService.getTrafficStats(60),
      statsService.getAlertsSummary(),
      statsService.getRecentAlerts(10),
      statsService.getDevicesWithStats(),
    ]);

    // Top 5 devices by risk_score
    const top_risk_devices = allDevices
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5);

    return res.status(200).json({
      capture,
      stats,
      alert_summary,
      recent_alerts,
      top_risk_devices,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
