# NetSentinel

**Network Traffic Analyzer and Intrusion Detection System**  
*MCA Mini Project — Rule-Based Network Anomaly & Signature Detection System*

NetSentinel is a full-stack, real-time network monitoring and intrusion detection platform designed and optimized for Windows 10/11 environments. It captures network packets via Scapy or a high-fidelity synthetic traffic simulator, evaluates threats across sliding time windows using rule-based detection, records telemetry in MySQL 8, and streams live telemetry to a cyberpunk-accented soft claymorphism web dashboard.

---

## Architecture

```
+---------------------------------------------------------------------------------------+
|                                    NETWORK INTERFACE                                  |
|               (Live Network Packets via Npcap OR Built-in Traffic Simulator)          |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                    PYTHON CAPTURE & INTRUSION DETECTION ENGINE                        |
|   - Scapy sniffer & synthetic packet generator (TCP, UDP, ICMP, DNS)                  |
|   - Multi-Rule Sliding Window Analyzer (SYN Flood, Port Scan, ICMP Flood, DNS, etc.)  |
|   - 30-second threat alert deduplication / cooldown cache                             |
|   - Rotated local PCAP dump archiver                                                  |
|   - Ingestion client (POST /api/ingest/packets & alerts with x-api-key)               |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                           NODE.JS + EXPRESS API SERVER                                |
|   - Ingest Controller (validates API key, batches bulk packet inserts)                |
|   - MySQL 8.4 connection pool (mysql2/promise)                                        |
|   - JWT authentication & SHA-256 session token management                             |
|   - Role-Based Access Control (RBAC: Admin vs User)                                   |
|   - PDFKit executive summary and CSV raw forensic export engine                       |
|   - Socket.io live streaming room (`/stream`) pushing live packets & alerts           |
+---------------------------------------------------------------------------------------+
                         |                                      |
                         v                                      v
+---------------------------------+  +--------------------------------------------------+
|          MYSQL DATABASE         |  |             REACT WEB DASHBOARD (VITE)           |
|  - `network_traffic`            |  |  - Real-time packet throughput and protocol charts|
|  - `alerts`                     |  |  - Sliding incident investigation drawer         |
|  - `devices`                    |  |  - Network device inventory with risk scores     |
|  - `detection_rules`            |  |  - PDF & CSV forensic report generator           |
|  - `users` & `user_sessions`    |  |  - Live capture control bar (Simulator vs Live)  |
|  - `capture_settings`           |  |  - Admin detection rule sensitivity tuning       |
|  - `reports`                    |  |  - Soft Claymorphism UI with plain CSS           |
+---------------------------------+  +--------------------------------------------------+
```

---

## Key Features

- **Real-Time Packet Ingestion**: Capture live packets from Ethernet/Wi-Fi interfaces or generate realistic multi-host background network traffic with attack injection.
- **Rule-Based Intrusion Detection**: Sliding-window statistical tracking and payload inspection detecting 6 major attack categories with immediate alert emission.
- **Live Cyberpunk Claymorphic Dashboard**: Real-time traffic throughput charts, protocol distribution donuts, dynamic bandwidth gauges, and audio/visual threat notifications.
- **Incident Investigation Drawer**: Inspect packet headers, forensic signatures, raw payload previews, and triage status (`new`, `acknowledged`, `resolved`).
- **Automated Device Discovery**: Automatic MAC/IP discovery with behavioral threat scoring (0–100) and categorized host inventory.
- **Executive Audit Reporting**: One-click generation of PDF summaries and raw CSV forensic dumps with custom time windows.
- **Role-Based Access Control**: Strict segregation between Read-Only Security Analysts (`user`) and Privileged SecOps Administrators (`admin`).

---

## Folder Structure

```
netsentinel/
├── backend/                  # Node.js + Express + Socket.io Server (CommonJS)
│   ├── src/
│   │   ├── config/           # Database pool & environment variables
│   │   ├── controllers/      # Route controllers (traffic, alerts, auth, etc.)
│   │   ├── db/               # Migration runner and schema definitions
│   │   ├── middleware/       # JWT auth & RBAC guards
│   │   ├── routes/           # REST endpoints (/api/...)
│   │   ├── services/         # Reporting, statistics, and PDF generators
│   │   ├── sockets/          # Socket.io live event emitters
│   │   └── server.js         # HTTP server entry point
│   ├── reports/              # Storage directory for generated PDF & CSV reports
│   └── package.json
│
├── capture/                  # Python 3.10+ Packet Capture & Threat Engine
│   ├── detector.py           # Sliding-window multi-rule threat analyzer
│   ├── sniffer.py            # Scapy live interface packet sniffer
│   ├── simulator.py          # Synthetic traffic and attack scenario generator
│   ├── ingest_client.py      # HTTP client sending telemetry to backend
│   ├── pcap_writer.py        # Rotating PCAP file archiver
│   ├── main.py               # Main capture orchestration loop
│   └── requirements.txt
│
├── frontend/                 # React 18 + Vite Web Application
│   ├── src/
│   │   ├── api/              # Axios HTTP client with auth interceptors
│   │   ├── components/       # Claymorphic UI components (Cards, Modals, Drawer, etc.)
│   │   ├── context/          # Auth, Socket.io, and Toast state providers
│   │   ├── pages/            # Application views (Dashboard, Traffic, Alerts, Devices, etc.)
│   │   ├── styles/           # Pure CSS design system (theme.css)
│   │   ├── App.jsx           # Client router
│   │   └── main.jsx          # React DOM entry point
│   └── package.json
│
├── scripts/                  # Automated verification and helper scripts
│   └── e2e-check.ps1         # 10-step end-to-end integration test
├── start-all.ps1             # One-click Windows startup script (3 windows)
└── README.md
```

---

## Windows Setup Guide (Step-by-Step)

Follow these exact steps in order in Windows PowerShell:

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **MySQL Server**: v8.0 or v8.4
- **Npcap**: *(Optional for Live mode)* Download and install [Npcap](https://npcap.com/) with "WinPcap API-compatible Mode" enabled.

---

### Step 1: Configure MySQL Database and Backend `.env`
1. Ensure your MySQL server is running (default port `3306` or `3307`).
2. Open `d:\netsentinel\backend\.env` (or copy from `.env.example`) and verify your credentials:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   DB_HOST=localhost
   DB_PORT=3307
   DB_USER=root
   DB_PASSWORD=root123
   DB_NAME=netsentinel
   JWT_SECRET=change_this_long_random_secret
   JWT_EXPIRES_IN=8h
   INGEST_API_KEY=change_this_ingest_key
   ADMIN_NAME=Administrator
   ADMIN_EMAIL=admin@netsentinel.local
   ADMIN_PASSWORD=Admin@12345
   ```

### Step 2: Initialize Database and Start Backend
```powershell
Set-Location "d:\netsentinel\backend"
npm install
npm run db:init
npm run dev
```
*Leave this terminal running. The backend will initialize tables and seed the initial administrator.*

### Step 3: Setup Python Capture Virtual Environment & Start Engine
Open a second PowerShell window:
```powershell
Set-Location "d:\netsentinel\capture"
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -u main.py
```
*Leave this terminal running. The engine will poll the backend for control signals.*

### Step 4: Install and Start Frontend Dashboard
Open a third PowerShell window:
```powershell
Set-Location "d:\netsentinel\frontend"
npm install
npm run dev
```

### Step 5: Launch Dashboard in Browser
1. Open your browser and navigate to: **`http://localhost:5173`**
2. Log in using either of the seeded accounts:
   - **Administrator Account**:
     - **Email**: `admin@netsentinel.local`
     - **Password**: `Admin@12345`
   - **Standard User Account**:
     - **Email**: `alice@netsentinel.local`
     - **Password**: `Password123`

---

## One-Click Startup Script

Once setup is complete, you can start all three services simultaneously by running:
```powershell
.\start-all.ps1
```
This script launches three separate PowerShell windows titled for each component.

---

## Simulator Mode vs Live Sniffer Mode

| Feature | Simulator Mode (Default) | Live Sniffer Mode |
| :--- | :--- | :--- |
| **Prerequisites** | None. Works out of the box. | Requires [Npcap](https://npcap.com/) installed on Windows. |
| **Permissions** | Standard user permissions. | **Administrator Terminal** required to access raw sockets. |
| **Traffic Source** | Synthetic realistic packets across multi-host subnet. | Physical or Wi-Fi network interface. |
| **Attack Injection** | Injects SYN floods, port scans, and suspicious DNS. | Monitors real network threats on the wire. |
| **How to Activate** | Selected in Topbar / Dashboard Capture Bar: choose `Simulator`. | Selected in Topbar: choose interface (e.g. `Wi-Fi`) and click Start. |

---

## User Roles and Access Control

### Default Login Credentials

The database initialization script (`npm run db:init`) automatically provisions default accounts for testing both privilege levels:

| Role | Name | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** (`admin`) | `Administrator` | `admin@netsentinel.local` | `Admin@12345` | Full system control: start/stop packet capture, toggle/tune detection rules, resolve alerts, manage and elevate user accounts. |
| **Standard User** (`user`) | `Alice Tester` | `alice@netsentinel.local` | `Password123` | Security analyst read-only view: live dashboard charts, real-time packet stream, threat alerts, device inventory, generate & export forensic reports. |

> [!NOTE]
> **New Registrations**: Self-registering via the web portal (`/register`) automatically assigns the `user` role. Passwords require a minimum of 8 characters and must contain at least one letter and one number. Only an existing Administrator can elevate a user to the `admin` role in the **Admin > Users** management view.

### Permissions Matrix

| Capability | Regular User (`user`) | Administrator (`admin`) |
| :--- | :---: | :---: |
| View Live Dashboard & Streams | Yes | Yes |
| Filter & Search Packets | Yes | Yes |
| View Threat Alerts | Yes | Yes |
| View Device Inventory | Yes | Yes |
| Generate & Download Reports | Yes (Own reports) | Yes (All reports) |
| Start / Stop Capture Engine | No (Hidden & HTTP 403) | **Yes** |
| Select Mode & Network Interface | No (Hidden & HTTP 403) | **Yes** |
| Acknowledge / Resolve Alerts | No (Disabled) | **Yes** |
| Edit Detection Rules & Thresholds | No (Route blocked) | **Yes** |
| Toggle Rules Active/Disabled | No (Route blocked) | **Yes** |
| Edit Device Hostnames & Categories | No (Disabled) | **Yes** |
| User Management (Add / Role / Delete) | No (Route blocked) | **Yes** |

---

## Intrusion Detection Rules Specification

NetSentinel evaluates network packets in real-time across configurable sliding windows:

| Rule Name | Attack Type Identifier | Default Threshold | Time Window | Severity | Trigger Criteria |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **SYN Flood** | `syn_flood` | 150 packets | 15 seconds | `critical` | Excessive TCP SYN packets from a single source without corresponding ACK completions. |
| **Port Scan** | `port_scan` | 15 ports | 10 seconds | `medium` | A single source IP probing multiple distinct destination ports on a host. |
| **ICMP Flood** | `icmp_flood` | 100 packets | 10 seconds | `high` | Rapid burst of ICMP Echo Request (ping) packets exceeding threshold. |
| **Suspicious DNS** | `suspicious_dns` | 50 queries | 60 seconds | `medium` | High-frequency DNS requests or abnormally long query strings (\(> 60\) chars) suggesting tunneling. |
| **Suspicious Payload** | `suspicious_payload` | 1 match | 1 second | `high` | Inbound payload matching known attack signatures (SQLi, path traversal, remote execution). |
| **Malformed Packet** | `malformed_packet` | 1 match | 1 second | `medium` | Packets with invalid headers or illegal TCP flag combinations (NULL, XMAS, SYN+FIN). |

*All detection rules feature a 30-second deduplication cooldown to prevent database flooding.*

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"Engine Offline" badge in dashboard** | Python capture service is not running or cannot reach backend. | Verify `python main.py` is running in `capture/` and backend is listening on port 5000. |
| **No network interfaces listed in Live mode** | Missing Npcap driver or running without Administrator privileges. | Install [Npcap](https://npcap.com/) with WinPcap compatibility mode. Re-run `main.py` in an **Elevated (Administrator) PowerShell terminal**. |
| **MySQL Access Denied (Error 1045)** | Incorrect credentials in `backend/.env`. | Verify `DB_USER` and `DB_PASSWORD` in `backend/.env` match your local MySQL configuration. |
| **Port 5000 or 5173 Already in Use** | An orphaned node process is holding the port. | In PowerShell run: `Get-Process node \| Stop-Process -Force` and restart. |
| **Captured traffic not saving to MySQL** | Ingest API key mismatch. | Ensure `INGEST_API_KEY` in `backend/.env` and `capture/.env` have identical values. |

---

## Security and Legal Notice

> **Important**: NetSentinel is designed for educational, defensive, and authorized administrative monitoring purposes only. Capturing network packets and analyzing traffic must **strictly be restricted to networks, hosts, and infrastructure you own or have explicit written authorization to monitor**. Unauthorized packet interception may violate local, state, and federal laws.
