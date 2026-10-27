-- NetSentinel Database Schema
-- MySQL 8.0+ / 8.4+ Engine: InnoDB, Charset: utf8mb4

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    mac_address VARCHAR(50) NULL,
    hostname VARCHAR(100) NULL,
    device_type VARCHAR(50) DEFAULT 'unknown',
    status VARCHAR(20) DEFAULT 'active',
    first_seen DATETIME NOT NULL,
    last_seen DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS network_traffic (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NULL,
    timestamp DATETIME(3) NOT NULL,
    src_ip VARCHAR(45) NOT NULL,
    dst_ip VARCHAR(45) NOT NULL,
    src_port INT NULL,
    dst_port INT NULL,
    protocol VARCHAR(20) NOT NULL,
    packet_size INT NOT NULL,
    packet_count INT NOT NULL DEFAULT 1,
    bytes_transferred BIGINT NOT NULL DEFAULT 0,
    duration FLOAT NOT NULL DEFAULT 0,
    tcp_flags VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'normal',
    CONSTRAINT fk_traffic_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    INDEX idx_traffic_time (timestamp),
    INDEX idx_traffic_src (src_ip),
    INDEX idx_traffic_dst (dst_ip),
    INDEX idx_traffic_proto (protocol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detection_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    attack_type VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    threshold_value DECIMAL(10,2) NOT NULL,
    time_window INT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NULL,
    rule_id INT NULL,
    traffic_id BIGINT NULL,
    timestamp DATETIME(3) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    destination_ip VARCHAR(45) NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    CONSTRAINT fk_alerts_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_rule FOREIGN KEY (rule_id) REFERENCES detection_rules(id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_traffic FOREIGN KEY (traffic_id) REFERENCES network_traffic(id) ON DELETE SET NULL,
    INDEX idx_alerts_time (timestamp),
    INDEX idx_alerts_sev (severity),
    INDEX idx_alerts_status (status),
    INDEX idx_alerts_src (source_ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(255) NOT NULL,
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS capture_settings (
    id INT PRIMARY KEY,
    is_running BOOLEAN NOT NULL DEFAULT FALSE,
    mode VARCHAR(20) NOT NULL DEFAULT 'simulator',
    interface_name VARCHAR(255) NULL,
    simulate_attacks BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
