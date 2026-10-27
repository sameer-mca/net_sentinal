const express = require('express');
const deviceController = require('../controllers/deviceController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

router.get('/', deviceController.getDevices);
router.get('/:id', deviceController.getDeviceById);
router.patch('/:id', adminOnly, deviceController.updateDevice);

module.exports = router;
