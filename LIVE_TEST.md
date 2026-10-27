# NetSentinel Live Packet Capture & Detection Testing Guide

This guide describes how to run live network verification and intrusion detection testing on a physical network adapter (such as Wi-Fi or Ethernet) on Windows 10/11 using NetSentinel.

---

## 1. Prerequisites

Before testing live packet capture:

1. **Npcap Installed**:
   - Ensure [Npcap](https://npcap.com/) is installed on Windows with **"Install Npcap in WinPcap API-compatible Mode"** enabled.
2. **Backend Server Running**:
   - In a terminal:
     ```powershell
     cd d:\netsentinel\backend
     npm run dev
     ```
   - Verifiable at `http://localhost:5000/api/health`.
3. **Frontend Server Running**:
   - In a terminal:
     ```powershell
     cd d:\netsentinel\frontend
     npm run dev
     ```
   - Verifiable at `http://localhost:5173`.
4. **Capture Service Running as Administrator**:
   - Open a **PowerShell terminal as Administrator**:
     ```powershell
     cd d:\netsentinel\capture
     .\venv\Scripts\Activate.ps1
     python -u main.py
     ```
   - The capture service registers with the backend and displays `[Engine] Capture engine initialized and running`.

---

## 2. Running Live Verification Scripts

NetSentinel includes two automated verification scripts located in `netsentinel/scripts/`.

### A. Basic Packet Capture Verification (`verify-live.ps1`)

Verifies that physical network traffic is captured, parsed, stored in MySQL, and dumped into rotating `.pcap` files without loops or synthetic mocks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-live.ps1
```

**What it verifies (7 Assertions):**
- Total captured packets > 20
- Real TCP and DNS packets captured from the live network
- ICMP echo packets captured
- Host laptop IPv4 appears as `src_ip` in at least 5 packets
- No loopback (`127.0.0.1`) traffic captured on the physical interface
- Host IP registered in the NetSentinel Device Inventory (`/devices`)
- PCAP capture file created on disk (`capture/pcap/`) larger than 0 bytes

---

### B. Live Intrusion Detection Test (`live-detection-test.ps1`)

Proves that rule-based detection triggers on **REAL network traffic** captured over the Wi-Fi adapter, using only benign, safe requests generated from the host machine:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\live-detection-test.ps1
```

#### How it works:
1. **Automated Rule Backup**: Backs up current rule thresholds to `scripts/.rules-backup.json`.
2. **Temporary Threshold Adjustment**:
   - `icmp_flood`: Threshold = 5 packets, Window = 10s
   - `syn_flood`: Threshold = 5 packets, Window = 10s
   - `suspicious_dns`: Threshold = 20 queries, Window = 60s
3. **Capture Start**: Activates sniffer mode on the physical Wi-Fi adapter via `POST /api/capture/start`.
4. **Traffic Generation**:
   - 30 rapid DNS lookups (`nst-<guid>.example.com`) over UDP port 53.
   - 4 long DNS lookups (55+ characters) over UDP port 53.
   - Plain HTTP GET requests with SQL injection (`id=1' OR 1=1 --`) and XSS (`<script>alert(1)</script>`) parameters.
   - 12 ICMP echo requests via `ping.exe 8.8.8.8 -n 12`.
5. **Assertion Validation**: Verifies that alerts fire in `/api/alerts` for `suspicious_dns`, `suspicious_payload`, and `icmp_flood`.
6. **Automatic Cleanup**: A `try / finally` block **guarantees** original rule thresholds and states are restored and the backup file is deleted.

---

### C. Testing External Scans (`-WaitForScan`)

To test port scan and SYN flood detection from an external device (e.g., a second laptop, Android phone with Termux, or Kali VM) on the same Wi-Fi network:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\live-detection-test.ps1 -WaitForScan
```

1. The script will display your laptop's Wi-Fi IP address (e.g. `192.168.1.100`).
2. Run Nmap from the external device against your laptop:
   ```bash
   nmap -p 1-100 192.168.1.100
   ```
3. NetSentinel detects the SYN scan across distinct ports and logs `port_scan` and `syn_flood` alerts in real-time.

---

## 3. Real Triggers vs. False Positives

| Rule | Production Trigger | Common Benign Triggers (False Positives) | NetSentinel Mitigation |
| :--- | :--- | :--- | :--- |
| **SYN Flood** (`syn_flood`) | Attacker sends hundreds of TCP SYN packets without finishing handshake to exhaust server resources. | Rapid web page loading opening many parallel TCP connections (e.g. CDN asset loading). | Configurable threshold (default: 150 pkts/15s) and sliding time window. |
| **Port Scan** (`port_scan`) | Attacker probes multiple destination ports to find open services (`nmap -sS`). | Network printers or UPnP media discovery scanning local ports. | Distinct port counter per destination IP within the sliding time window. |
| **ICMP Flood** (`icmp_flood`) | Ping flood / Smurf attack sending high volumes of ICMP Echo Requests. | Network diagnostic tools running continuous ping checks. | Sliding window threshold (default: 100 pkts/10s). |
| **Suspicious DNS** (`suspicious_dns`) | DNS tunneling, data exfiltration, or domain generation algorithms (DGA). | Antivirus or VPN checking malware domain reputations via DNS lookups. | Dual criteria: high volume (> 50 queries/min) OR query label length > 60 chars. |
| **Suspicious Payload** (`suspicious_payload`) | Plaintext web traffic containing SQLi (`UNION SELECT`, `' OR 1=1`), XSS (`<script>`), or command injection (`/etc/passwd`, `powershell.exe`). | Web developers testing their own applications or security documentation browsing. | Inspects unencrypted HTTP GET/POST queries; 30s alert cooldown per IP. |
| **Malformed Packet** (`malformed_packet`) | Evasion techniques using invalid TCP flag combinations (NULL scan, XMAS scan, SYN+FIN). | Rare network hardware checksum errors or faulty NIC firmware. | Immediate signature match on illegal TCP flag combinations. |

---

## 4. Wi-Fi Visibility Boundaries

When running an intrusion detection system on a standard laptop Wi-Fi adapter:

1. **What NetSentinel CAN See**:
   - **Host Traffic**: All inbound and outbound packets where your laptop is the source or destination IP.
   - **Broadcast & Multicast Traffic**: ARP requests (`who-has`), mDNS (`.local` queries), SSDP device discovery, and DHCP traffic broadcasted to the entire Wi-Fi subnet.
2. **What NetSentinel CANNOT See (By Design)**:
   - **Other Devices' Unicast Traffic**: Unencrypted unicast packets between Machine A and Machine B on the same Wi-Fi router. Standard 802.11 Wi-Fi networks use individual pairwise transient keys (PTK) in WPA2/WPA3. Without monitor mode on specialized hardware, standard Windows wireless drivers drop other devices' unicast frames.
3. **Testing Recommendation**:
   - Always target the **host laptop's own IP address** when sending test scans from external devices on the same LAN.

---

## 5. Compare with Wireshark (Side-by-Side Fidelity)

To verify that NetSentinel captures the exact same physical packets as industry-standard packet analyzers:

1. **Launch Wireshark as Administrator**:
   - Open Wireshark and double-click your active Wi-Fi adapter.
2. **Apply Display Filter**:
   - In Wireshark's filter bar, enter:
     ```text
     icmp || dns || http || tcp.flags.syn == 1
     ```
3. **Execute Live Verification**:
   - Run in PowerShell:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\scripts\live-detection-test.ps1
     ```
4. **Compare Side-by-Side**:
   - **Timestamps**: Compare the packet timestamps in Wireshark with the `/traffic` view in NetSentinel's web UI.
   - **Packet Attributes**: Compare the source IP, destination IP, protocol, and payload preview.
   - **Alerts**: In NetSentinel's `/alerts` dashboard, observe the real-time toast notifications and alert table entries matching the captured packets in Wireshark.
