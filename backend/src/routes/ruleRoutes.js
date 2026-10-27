const express = require('express');
const ruleController = require('../controllers/ruleController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

router.get('/', ruleController.getRules);
router.put('/:id', adminOnly, ruleController.updateRule);
router.patch('/:id/toggle', adminOnly, ruleController.toggleRule);

module.exports = router;
