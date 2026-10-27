import requests
from config import API_URL, INGEST_API_KEY, MAX_BUFFERED_PACKETS

class ApiClient:
    """
    HTTP client for communication with NetSentinel backend ingest API.
    Uses requests.Session with x-api-key authentication and 5-second timeout.
    Maintains an in-memory retry buffer for packets if backend is unreachable.
    """

    def __init__(self, api_url=API_URL, api_key=INGEST_API_KEY):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        })
        self.timeout = 5.0
        self.packet_buffer = []

    def get_control(self):
        """
        Polls GET /api/ingest/control to fetch capture settings and active detection rules.
        """
        url = f"{self.api_url}/control"
        try:
            resp = self.session.get(url, timeout=self.timeout)
            if resp.status_code == 200:
                return resp.json()
            else:
                print(f"[ApiClient] get_control returned status {resp.status_code}: {resp.text[:100]}")
                return None
        except Exception as e:
            print(f"[ApiClient] Error polling control endpoint: {e}")
            return None

    def send_packets(self, new_packets):
        """
        Sends packets to POST /api/ingest/packets in batches up to 800.
        Retains unsent packets in buffer up to MAX_BUFFERED_PACKETS on failure.
        """
        if new_packets:
            self.packet_buffer.extend(new_packets)

        # Enforce buffer capacity, discarding oldest
        if len(self.packet_buffer) > MAX_BUFFERED_PACKETS:
            dropped = len(self.packet_buffer) - MAX_BUFFERED_PACKETS
            self.packet_buffer = self.packet_buffer[-MAX_BUFFERED_PACKETS:]
            print(f"[ApiClient] Packet buffer full; dropped {dropped} oldest packets")

        if not self.packet_buffer:
            return True

        url = f"{self.api_url}/packets"

        while self.packet_buffer:
            batch = self.packet_buffer[:800]
            try:
                resp = self.session.post(url, json={"packets": batch}, timeout=self.timeout)
                if resp.status_code == 200:
                    # Successfully sent, remove this batch from buffer
                    self.packet_buffer = self.packet_buffer[len(batch):]
                else:
                    print(f"[ApiClient] send_packets failed ({resp.status_code}): {resp.text[:120]}")
                    return False
            except Exception as e:
                print(f"[ApiClient] send_packets connection error: {e}")
                return False

        return True

    def send_alerts(self, alerts):
        """
        Sends alerts to POST /api/ingest/alerts.
        """
        if not alerts:
            return True

        url = f"{self.api_url}/alerts"
        try:
            resp = self.session.post(url, json={"alerts": alerts}, timeout=self.timeout)
            if resp.status_code == 200:
                return True
            else:
                print(f"[ApiClient] send_alerts failed ({resp.status_code}): {resp.text[:120]}")
                return False
        except Exception as e:
            print(f"[ApiClient] send_alerts error: {e}")
            return False

    def send_heartbeat(self, heartbeat_data):
        """
        Sends heartbeat status to POST /api/ingest/heartbeat.
        """
        url = f"{self.api_url}/heartbeat"
        try:
            resp = self.session.post(url, json=heartbeat_data, timeout=self.timeout)
            if resp.status_code == 200:
                return True
            else:
                print(f"[ApiClient] send_heartbeat returned status {resp.status_code}")
                return False
        except Exception as e:
            print(f"[ApiClient] send_heartbeat error: {e}")
            return False
