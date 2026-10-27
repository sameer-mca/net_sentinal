# NetSentinel Packet Capture Service

Python 3.10+ packet capture engine and rule-based intrusion detection service for NetSentinel.
Supports both live network sniffing (via Scapy & Npcap) and a built-in synthetic traffic simulator with attack scenarios.

---

## Windows Prerequisites

1. **Python 3.10 or higher**: Verify with `python --version`.
2. **Npcap (Required for Live Sniffing)**:
   - Download and install Npcap from [npcap.com](https://npcap.com/#download).
   - **Important**: During installation, ensure the checkbox **"Install Npcap in WinPcap API-compatible Mode"** is checked.
3. **Administrator Permissions**:
   - For live sniffing mode, open PowerShell / Terminal as **Administrator**.
   - Built-in traffic simulation mode (`simulator`) does not require administrator privileges or Npcap.

---

## Installation & Setup

1. Open PowerShell and navigate to the capture folder:
   ```powershell
   Set-Location "d:\netsentinel\capture"
   ```

2. Create and activate the Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install required packages:
   ```powershell
   pip install -r requirements.txt
   ```

4. Verify or adjust `.env` settings:
   ```env
   API_URL=http://localhost:5000/api/ingest
   INGEST_API_KEY=change_this_ingest_key
   PCAP_DIR=./pcap
   BATCH_INTERVAL=1.0
   CONTROL_POLL_INTERVAL=2.0
   PCAP_MAX_MB=20
   PCAP_MAX_FILES=10
   ```

---

## Running the Service

With the backend running on port 5000:

```powershell
.\venv\Scripts\Activate.ps1
python main.py
```

The service will:
- Print available network interfaces.
- Send heartbeats to the Node.js backend every 3 seconds.
- Poll `GET /api/ingest/control` every 2 seconds for start/stop commands, mode (simulator / sniffer), and active detection rules.
- Stream packets and alerts via HTTP to the backend ingest endpoints.
