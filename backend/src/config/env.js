const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  DB_NAME: process.env.DB_NAME || 'netsentinel',
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_long_random_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  INGEST_API_KEY: process.env.INGEST_API_KEY || 'change_this_ingest_key',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Administrator',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@netsentinel.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345',
};

module.exports = env;
