const express = require('express');
const ingestController = require('../controllers/ingestController');
const { ingestAuth } = require('../middleware/ingestAuth');

const router = express.Router();

// All ingest routes are protected by ingestAuth (x-api-key header)
router.use(ingestAuth);

router.post('/packets', ingestController.postPackets);
router.post('/alerts', ingestController.postAlerts);
router.post('/heartbeat', ingestController.postHeartbeat);
router.get('/control', ingestController.getControl);

module.exports = router;
