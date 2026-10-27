const express = require('express');
const reportController = require('../controllers/reportController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

// Fixed routes declared BEFORE parameter routes
router.get('/history-summary', reportController.getHistorySummary);

// Collection routes
router.post('/', reportController.createReport);
router.get('/', reportController.getReports);

// Parameter routes
router.get('/:id/download', reportController.downloadReport);
router.delete('/:id', reportController.deleteReport);

module.exports = router;
