const express = require('express');
const captureController = require('../controllers/captureController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/status', authRequired, captureController.getStatus);
router.get('/interfaces', authRequired, captureController.getInterfaces);
router.post('/start', authRequired, adminOnly, captureController.startCapture);
router.post('/stop', authRequired, adminOnly, captureController.stopCapture);

module.exports = router;
