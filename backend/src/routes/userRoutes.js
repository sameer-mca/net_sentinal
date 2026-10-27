const express = require('express');
const userController = require('../controllers/userController');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All user management routes require an authenticated admin
router.use(authRequired, adminOnly);

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.patch('/:id/role', userController.updateUserRole);
router.delete('/:id', userController.deleteUser);

module.exports = router;
