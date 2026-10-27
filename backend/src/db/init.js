const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const rulesToSeed = [
  {
    rule_name: 'SYN Flood',
    attack_type: 'syn_flood',
    threshold_value: 100,
    time_window: 10,
    severity: 'high',
    description: 'SYN packets without ACK from one source exceed threshold within the window.',
  },
  {
    rule_name: 'Port Scan',
    attack_type: 'port_scan',
    threshold_value: 15,
    time_window: 10,
    severity: 'medium',
    description: 'One source contacts many distinct destination ports on one host within the window.',
  },
  {
    rule_name: 'ICMP Flood',
    attack_type: 'icmp_flood',
    threshold_value: 100,
    time_window: 10,
    severity: 'high',
    description: 'ICMP packets from one source exceed threshold within the window.',
  },
  {
    rule_name: 'Suspicious DNS',
    attack_type: 'suspicious_dns',
    threshold_value: 50,
    time_window: 60,
    severity: 'medium',
    description: 'Too many DNS queries from one source, or unusually long DNS query names (over 60 characters).',
  },
  {
    rule_name: 'Suspicious Payload',
    attack_type: 'suspicious_payload',
    threshold_value: 1,
    time_window: 1,
    severity: 'high',
    description: 'Packet payload contains known attack signatures (SQL injection, XSS, path traversal, shell commands).',
  },
  {
    rule_name: 'Malformed Packet',
    attack_type: 'malformed_packet',
    threshold_value: 1,
    time_window: 1,
    severity: 'medium',
    description: 'Packet has an invalid header or illegal TCP flag combination (NULL, XMAS, SYN+FIN).',
  },
];

async function initDatabase() {
  console.log('--- NetSentinel Database Initialization ---');
  console.log(`Connecting to MySQL server at ${env.DB_HOST}:${env.DB_PORT} as ${env.DB_USER}...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      multipleStatements: true,
    });
    console.log('Connected to MySQL server.');

    // 1. Create database if it does not exist
    console.log(`Creating database '${env.DB_NAME}' if not exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`Database '${env.DB_NAME}' is ready.`);

    // 2. Select database
    await connection.query(`USE \`${env.DB_NAME}\`;`);

    // 3. Run schema.sql
    console.log('Reading and executing schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('Database tables verified/created successfully.');

    // 4. Seed capture_settings row 1
    console.log('Seeding capture_settings (id = 1)...');
    await connection.query(
      `INSERT IGNORE INTO capture_settings (id, is_running, mode, interface_name, simulate_attacks)
       VALUES (1, FALSE, 'simulator', NULL, TRUE);`
    );
    console.log('capture_settings initialized.');

    // 5. Seed detection rules
    console.log('Seeding default detection rules...');
    for (const rule of rulesToSeed) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO detection_rules 
         (rule_name, attack_type, description, threshold_value, time_window, severity, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE);`,
        [
          rule.rule_name,
          rule.attack_type,
          rule.description,
          rule.threshold_value,
          rule.time_window,
          rule.severity,
        ]
      );
      if (result.affectedRows > 0) {
        console.log(` - Inserted detection rule: ${rule.rule_name} (${rule.attack_type})`);
      } else {
        console.log(` - Detection rule exists: ${rule.rule_name} (${rule.attack_type})`);
      }
    }

    // 6. Seed admin user
    console.log('Checking for admin user...');
    const [existingAdmin] = await connection.query(
      `SELECT id, email, role FROM users WHERE email = ? LIMIT 1;`,
      [env.ADMIN_EMAIL]
    );

    if (existingAdmin.length === 0) {
      console.log(`Creating default admin user: ${env.ADMIN_EMAIL}...`);
      const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
      await connection.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin');`,
        [env.ADMIN_NAME, env.ADMIN_EMAIL, passwordHash]
      );
      console.log('Default admin user created successfully.');
    } else {
      console.log(`Admin user '${env.ADMIN_EMAIL}' already exists. Skipping.`);
    }

    // 7. Seed demo standard user
    console.log('Checking for demo standard user...');
    const [existingUser] = await connection.query(
      `SELECT id, email, role FROM users WHERE email = ? LIMIT 1;`,
      ['alice@netsentinel.local']
    );

    if (existingUser.length === 0) {
      console.log('Creating demo standard user: alice@netsentinel.local...');
      const userPasswordHash = await bcrypt.hash('Password123', 10);
      await connection.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user');`,
        ['Alice Tester', 'alice@netsentinel.local', userPasswordHash]
      );
      console.log('Demo standard user created successfully.');
    } else {
      console.log("Demo user 'alice@netsentinel.local' already exists. Skipping.");
    }

    console.log('--- NetSentinel Database Initialization Completed Successfully ---');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

if (require.main === module) {
  initDatabase().catch(() => process.exit(1));
}

module.exports = initDatabase;
