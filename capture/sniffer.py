import threading
import time
import queue
from scapy.all import conf
from scapy.sendrecv import sniff
from features import extract_features
from config import CAPTURE_BPF_FILTER

def resolve_iface(value):
    """
    Resolves an interface identifier (name, description, network_name, or guid)
    to a Scapy interface object.
    Matches case-insensitively and trimmed. If multiple interfaces match,
    prefers the one with an IPv4 address.
    Raises ValueError("Interface not found: <value>") if no interface matches.
    """
    if not value or not isinstance(value, str):
        raise ValueError(f"Interface not found: {value}")

    val = value.strip().lower()
    candidates = []

    # First pass: match against conf.ifaces
    for iface_key, dev in conf.ifaces.items():
        name = str(getattr(dev, "name", "") or "").strip().lower()
        desc = str(getattr(dev, "description", "") or "").strip().lower()
        net_name = str(getattr(dev, "network_name", "") or "").strip().lower()
        guid = str(getattr(dev, "guid", "") or "").strip().lower()
        key_str = str(iface_key).strip().lower()

        if val in (name, desc, net_name, guid, key_str):
            candidates.append(dev)

    # Second pass: strip common Windows filter driver suffixes if value was modified
    if not candidates:
        base_val = (
            val.replace("-npcap packet driver (npcap)-0000", "")
            .replace("-native wifi filter driver-0000", "")
            .replace("-virtual wifi filter driver-0000", "")
            .replace("-wfp native mac layer lightweight filter-0000", "")
            .replace("-wfp 802.3 mac layer lightweight filter-0000", "")
            .replace("-qos packet scheduler-0000", "")
            .strip()
        )
        if base_val:
            for iface_key, dev in conf.ifaces.items():
                name = str(getattr(dev, "name", "") or "").strip().lower()
                desc = str(getattr(dev, "description", "") or "").strip().lower()
                if base_val in (name, desc):
                    candidates.append(dev)

    if not candidates:
        raise ValueError(f"Interface not found: {value}")

    # Prefer one with an IPv4 address
    with_ip = [c for c in candidates if getattr(c, "ip", None) and str(c.ip).strip() != ""]
    if with_ip:
        return with_ip[0]
    return candidates[0]


class Sniffer:
    """
    Live packet capture sniffer running in a background thread using Scapy.
    Pushes extracted feature dictionaries to a thread-safe queue and logs raw packets via RotatingPcap.
    """

    def __init__(self, packet_queue, interface=None, pcap_writer=None):
        self.queue = packet_queue
        self.raw_interface_name = interface
        self.interface = resolve_iface(interface) if interface else getattr(conf, "iface", None)
        self.pcap_writer = pcap_writer
        self.stop_event = threading.Event()
        self.thread = None
        self.dropped_packets = 0
        self.last_drop_log_time = 0.0

    def start(self):
        """Starts live packet capture in a background thread."""
        self.stop_event.clear()
        self.thread = threading.Thread(target=self._sniff_loop, daemon=True)
        self.thread.start()
        iface_disp = getattr(self.interface, "name", str(self.interface))
        print(f"[Sniffer] Started sniffing on interface: {iface_disp}")

    def _record_drop(self):
        """Counts dropped packets and logs rate-limited drop messages (at most once every 10s)."""
        self.dropped_packets += 1
        now = time.time()
        if now - self.last_drop_log_time >= 10.0:
            print(f"[Sniffer] dropped {self.dropped_packets} packets (queue full)")
            self.last_drop_log_time = now

    def _handle_packet(self, pkt):
        """Packet handler callback for Scapy sniff."""
        try:
            if self.pcap_writer:
                self.pcap_writer.write(pkt)

            features = extract_features(pkt)
            if features:
                try:
                    self.queue.put_nowait(features)
                except queue.Full:
                    self._record_drop()
        except Exception as e:
            print(f"[Sniffer] Error handling packet: {e}")

    def _sniff_loop(self):
        """Sniffer loop running until stop_event is set."""
        while not self.stop_event.is_set():
            try:
                sniff_kwargs = {
                    "prn": self._handle_packet,
                    "store": False,
                    "timeout": 1.0,
                    "stop_filter": lambda p: self.stop_event.is_set(),
                }
                if self.interface:
                    sniff_kwargs["iface"] = self.interface

                if CAPTURE_BPF_FILTER:
                    sniff_kwargs["filter"] = CAPTURE_BPF_FILTER

                sniff(**sniff_kwargs)
            except Exception as e:
                if not self.stop_event.is_set():
                    print(f"[Sniffer] Capture error on {self.interface}: {e}")
                    time.sleep(1.0)

    def stop(self):
        """Signals the sniffer thread to stop and closes the PCAP writer."""
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)

        if self.pcap_writer:
            self.pcap_writer.close()

        print("[Sniffer] Stopped sniffing.")
