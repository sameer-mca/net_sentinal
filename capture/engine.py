import time
import queue
import threading
import ipaddress
from config import BATCH_INTERVAL, CONTROL_POLL_INTERVAL, HEARTBEAT_INTERVAL
from api_client import ApiClient
from simulator import Simulator
from sniffer import Sniffer, resolve_iface
from pcap_writer import RotatingPcap
from detector import Detector

def is_private_ip(ip_str):
    if not ip_str:
        return False
    try:
        addr = ipaddress.ip_address(ip_str)
        return addr.version == 4 and addr.is_private and not addr.is_link_local and not addr.is_loopback
    except Exception:
        return False

def get_interfaces():
    """
    Enumerates available network interfaces on Windows using Scapy conf.ifaces.
    Filters out noise/virtual adapters and deduplicates Npcap twins.
    Returns a sorted list of dicts: {name, description, ip, is_default, recommended}.
    """
    interfaces = []
    default_dev = None
    try:
        from scapy.all import conf
        default_dev = getattr(conf, "iface", None)
    except Exception:
        pass

    default_name = getattr(default_dev, "name", None)
    default_net_name = getattr(default_dev, "network_name", None)
    default_guid = getattr(default_dev, "guid", None)

    exclude_keywords = [
        "loopback",
        "wan miniport",
        "kernel debug",
        "bluetooth",
        "wi-fi direct",
        "wifi direct",
        "virtual adapter #2"
    ]

    virtual_keywords = [
        "virtual", "loopback", "miniport", "bluetooth",
        "wifi direct", "wi-fi direct", "kernel debug",
        "vmware", "virtualbox", "tap"
    ]

    seen = {}

    try:
        from scapy.all import conf
        for iface_key, dev in conf.ifaces.items():
            name = getattr(dev, "name", None) or str(iface_key)
            desc = getattr(dev, "description", None) or name
            ip = getattr(dev, "ip", None) or ""
            guid = getattr(dev, "guid", None) or ""
            net_name = getattr(dev, "network_name", None) or ""

            desc_lower = desc.lower()
            if any(kw in desc_lower for kw in exclude_keywords):
                continue

            clean_name = name.replace("-Npcap Packet Driver (NPCAP)-0000", "").strip()
            clean_desc = desc.replace("-Npcap Packet Driver (NPCAP)-0000", "").strip()

            is_def = (
                (default_dev and dev == default_dev) or
                (default_name and clean_name.lower() == default_name.lower()) or
                (default_net_name and net_name.lower() == default_net_name.lower()) or
                (default_guid and guid.lower() == default_guid.lower())
            )

            has_priv_ip = is_private_ip(ip)
            is_virt = any(kw in clean_desc.lower() for kw in virtual_keywords)
            recommended = has_priv_ip and not is_virt

            item = {
                "name": clean_name,
                "description": clean_desc,
                "ip": ip if ip else None,
                "is_default": bool(is_def),
                "recommended": bool(recommended)
            }

            key = clean_name.lower()
            if key in seen:
                if not seen[key].get("ip") and ip:
                    seen[key] = item
                elif not seen[key].get("is_default") and item["is_default"]:
                    seen[key]["is_default"] = True
            else:
                seen[key] = item

        interfaces = list(seen.values())
        # Sort: recommended first, then default, then others
        interfaces.sort(key=lambda x: (not x["recommended"], not x["is_default"], x["name"].lower()))
    except Exception as e:
        print(f"[Engine] Notice: Could not read Scapy interfaces: {e}")

    if not interfaces:
        interfaces.append({
            "name": "Ethernet",
            "description": "Ethernet Adapter",
            "ip": None,
            "is_default": True,
            "recommended": False
        })

    return interfaces


class Engine:
    """
    Central orchestration engine for packet capture and ingestion.
    Coordinates polling backend control, running Sniffer or Simulator,
    batching feature dictionaries, invoking detection rules, and sending heartbeats.
    """

    def __init__(self):
        self.api = ApiClient()
        self.detector = Detector()
        self.packet_queue = queue.Queue(maxsize=20000)
        self.stop_event = threading.Event()

        self.interfaces = get_interfaces()
        self.current_source = None
        self.current_mode = None
        self.current_interface = None
        self.current_simulate_attacks = True
        self.is_running = False
        self.last_error = None
        self.logged_errors = set()

        self.threads = []

    def start(self):
        """Starts engine background threads (batching, heartbeat, control polling)."""
        self.stop_event.clear()

        t_batch = threading.Thread(target=self._batching_loop, daemon=True, name="BatchingThread")
        t_heartbeat = threading.Thread(target=self._heartbeat_loop, daemon=True, name="HeartbeatThread")
        t_control = threading.Thread(target=self._control_loop, daemon=True, name="ControlLoop")

        self.threads = [t_batch, t_heartbeat, t_control]
        for t in self.threads:
            t.start()

        print("[Engine] Engine threads initialized and running.")

    def _start_source(self, mode, interface_name, simulate_attacks):
        """Starts either Sniffer or Simulator source."""
        self._stop_source()

        self.current_mode = mode
        self.current_interface = interface_name
        self.current_simulate_attacks = simulate_attacks
        self.last_error = None

        if mode == "sniffer":
            try:
                pcap_writer = RotatingPcap()
                self.current_source = Sniffer(
                    packet_queue=self.packet_queue,
                    interface=interface_name,
                    pcap_writer=pcap_writer
                )
                self.current_source.start()
                self.is_running = True
                print(f"[Engine] Sniffer active on interface '{interface_name}'")
            except Exception as e:
                self.last_error = str(e)
                print(f"[Engine] Sniffer startup failed: {e}. Last error set: {self.last_error}")
                self.is_running = False
                self.current_source = None

        elif mode == "simulator":
            try:
                self.current_source = Simulator(
                    packet_queue=self.packet_queue,
                    simulate_attacks=simulate_attacks
                )
                self.current_source.start()
                self.is_running = True
                print(f"[Engine] Simulator active (simulate_attacks={simulate_attacks})")
            except Exception as e:
                self.last_error = f"Simulator startup error: {e}"
                print(f"[Engine] Simulator failed: {e}")
                self.is_running = False
                self.current_source = None

    def _stop_source(self):
        """Stops the active capture source if one is running."""
        if self.current_source:
            try:
                self.current_source.stop()
            except Exception as e:
                print(f"[Engine] Error stopping source: {e}")
            self.current_source = None

        self.is_running = False
        self.current_mode = None

    def _control_loop(self):
        """Polls GET /api/ingest/control every CONTROL_POLL_INTERVAL seconds."""
        while not self.stop_event.is_set():
            try:
                control_data = self.api.get_control()
                if control_data:
                    settings = control_data.get("settings") or {}
                    rules = control_data.get("rules") or []
                    self.detector.update_rules(rules)

                    desired_running = bool(settings.get("is_running", False))
                    desired_mode = settings.get("mode", "simulator")
                    desired_interface = settings.get("interface_name")
                    desired_simulate = bool(settings.get("simulate_attacks", True))

                    if desired_running:
                        state_changed = (
                            not self.is_running
                            or self.current_mode != desired_mode
                            or self.current_interface != desired_interface
                            or self.current_simulate_attacks != desired_simulate
                        )
                        if state_changed:
                            print(f"[Engine] Starting capture source: mode={desired_mode}, iface={desired_interface}")
                            self._start_source(desired_mode, desired_interface, desired_simulate)
                    else:
                        if self.is_running or self.current_source:
                            print("[Engine] Stopping capture source per backend control settings.")
                            self._stop_source()

            except Exception as e:
                print(f"[Engine] Exception in control loop: {e}")

            time.sleep(CONTROL_POLL_INTERVAL)

    def _batching_loop(self):
        """Drains packet queue every BATCH_INTERVAL seconds, detects attacks, and sends to backend."""
        while not self.stop_event.is_set():
            time.sleep(BATCH_INTERVAL)

            packets_to_send = []
            alerts_to_send = []

            # Drain queue
            while not self.packet_queue.empty():
                try:
                    pkt = self.packet_queue.get_nowait()
                except queue.Empty:
                    break

                # Pass to detector
                alerts = []
                try:
                    alerts = self.detector.process(pkt)
                except Exception as e:
                    err_type = type(e).__name__
                    if err_type not in self.logged_errors:
                        print(f"[Engine] Error in detector.process ({err_type}): {e}")
                        self.logged_errors.add(err_type)

                if alerts:
                    alerts_to_send.extend(alerts)

                # Send ONLY the required Data Contract fields to backend ingest
                cleaned_packet = {
                    "timestamp": pkt.get("timestamp"),
                    "src_ip": pkt.get("src_ip"),
                    "dst_ip": pkt.get("dst_ip"),
                    "src_port": pkt.get("src_port"),
                    "dst_port": pkt.get("dst_port"),
                    "protocol": pkt.get("protocol"),
                    "packet_size": pkt.get("packet_size"),
                    "tcp_flags": pkt.get("tcp_flags"),
                    "src_mac": pkt.get("src_mac"),
                    "status": pkt.get("status", "normal"),
                }
                packets_to_send.append(cleaned_packet)

            if packets_to_send:
                self.api.send_packets(packets_to_send)

            if alerts_to_send:
                self.api.send_alerts(alerts_to_send)

    def _heartbeat_loop(self):
        """Emits heartbeat every HEARTBEAT_INTERVAL seconds."""
        while not self.stop_event.is_set():
            self.interfaces = get_interfaces()
            heartbeat_payload = {
                "running": self.is_running,
                "mode": self.current_mode,
                "interfaces": self.interfaces,
                "last_error": self.last_error,
            }
            self.api.send_heartbeat(heartbeat_payload)
            time.sleep(HEARTBEAT_INTERVAL)

    def stop(self):
        """Stops all sources and engine loops gracefully."""
        print("[Engine] Shutting down capture engine...")
        self.stop_event.set()
        self._stop_source()
        for t in self.threads:
            t.join(timeout=1.0)
        print("[Engine] Engine stopped.")
