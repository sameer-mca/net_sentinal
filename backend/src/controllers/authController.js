const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const { sha256 } = require('../utils/hash');
const { isEmail, isStrongPassword } = require('../utils/validators');

/**
 * Register a new user
 * Always sets role to 'user'
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

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

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check for existing user
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password with 10 salt rounds
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, 'user']
    );

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role: 'user',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in an existing user
 * Generates JWT and creates active user session
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const [users] = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = sha256(token);

    await db.query(
      'INSERT INTO user_sessions (user_id, token, expires_at, is_active) VALUES (?, ?, ?, 1)',
      [user.id, tokenHash, expiresAt]
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log out user by invalidating the current session
 */
async function logout(req, res, next) {
  try {
    const tokenHash = req.tokenHash || sha256(req.token);

    await db.query(
      'UPDATE user_sessions SET is_active = 0 WHERE token = ?',
      [tokenHash]
    );

    return res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

/**
 * Return current user information
 */
async function getMe(req, res, next) {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
