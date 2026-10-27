const express = require('express');
const trafficController = require('../controllers/trafficController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// All traffic routes require authentication
router.use(authRequired);

// Fixed routes first
router.get('/stats', trafficController.getStats);
router.get('/protocols', trafficController.getProtocols);

// Main list route
router.get('/', trafficController.getTraffic);

module.exports = router;
