const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { isEmail, isStrongPassword, isIn } = require('../utils/validators');

/**
 * List all users, newest first
 */
async function getUsers(req, res, next) {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new user (admin only)
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one letter and one number',
      });
    }

    if (!isIn(role, ['user', 'admin'])) {
      return res.status(400).json({ message: 'Role must be either "user" or "admin"' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check for duplicate email
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, role]
    );

    const [newUser] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: newUser[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user role
 * An admin cannot change their own role
 */
async function updateUserRole(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot change their own role' });
    }

    const { role } = req.body;
    if (!isIn(role, ['user', 'admin'])) {
      return res.status(400).json({ message: 'Role must be either "user" or "admin"' });
    }

    const [existing] = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [targetId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);

    return res.status(200).json({
      message: 'User role updated successfully',
      user: {
        id: targetId,
        name: existing[0].name,
        email: existing[0].email,
        role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a user
 * An admin cannot delete themselves
 */
async function deleteUser(req, res, next) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot delete their own account' });
    }

    const [existing] = await db.query(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [targetId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.query('DELETE FROM users WHERE id = ?', [targetId]);

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
};
