import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the capture directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

API_URL = os.getenv("API_URL", "http://localhost:5000/api/ingest").rstrip("/")
INGEST_API_KEY = os.getenv("INGEST_API_KEY", "change_this_ingest_key")
PCAP_DIR = os.getenv("PCAP_DIR", "./pcap")
BATCH_INTERVAL = float(os.getenv("BATCH_INTERVAL", "1.0"))
CONTROL_POLL_INTERVAL = float(os.getenv("CONTROL_POLL_INTERVAL", "2.0"))
PCAP_MAX_MB = float(os.getenv("PCAP_MAX_MB", "20"))
PCAP_MAX_FILES = int(os.getenv("PCAP_MAX_FILES", "10"))
HEARTBEAT_INTERVAL = 3.0
MAX_BUFFERED_PACKETS = 5000
CAPTURE_BPF_FILTER = os.getenv("CAPTURE_BPF_FILTER", "ip or ip6")
