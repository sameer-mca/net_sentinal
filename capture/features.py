import datetime
from scapy.layers.l2 import Ether
from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6
from scapy.layers.dns import DNS, DNSQR
from scapy.packet import Raw

def extract_features(scapy_packet):
    """
    Extracts normalized network features from a captured Scapy packet.
    Supports IPv4 and IPv6 packets.
    Returns a dictionary of features or None if packet cannot be parsed or is non-IP.
    """
    try:
        if IP in scapy_packet:
            ip_layer = scapy_packet[IP]
        elif IPv6 in scapy_packet:
            ip_layer = scapy_packet[IPv6]
        else:
            return None

        src_ip = str(ip_layer.src)[:45]
        dst_ip = str(ip_layer.dst)[:45]
        packet_size = len(scapy_packet)

        # Timestamp in ISO 8601 UTC with milliseconds
        if hasattr(scapy_packet, "time") and scapy_packet.time is not None:
            dt = datetime.datetime.fromtimestamp(float(scapy_packet.time), datetime.timezone.utc)
        else:
            dt = datetime.datetime.now(datetime.timezone.utc)
        timestamp = dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        # Source MAC address
        src_mac = None
        if Ether in scapy_packet and scapy_packet[Ether].src:
            src_mac = str(scapy_packet[Ether].src).lower()

        src_port = None
        dst_port = None
        tcp_flags = None
        dns_query = None
        payload_preview = ""
        malformed_reason = None

        # Check IP header length for IPv4 (IHL minimum is 5 words = 20 bytes)
        if hasattr(ip_layer, "ihl") and ip_layer.ihl is not None and ip_layer.ihl < 5:
            malformed_reason = "Invalid IP header length"

        # Protocol determination
        is_dns = (
            DNS in scapy_packet
            or (UDP in scapy_packet and (scapy_packet[UDP].sport == 53 or scapy_packet[UDP].dport == 53))
            or (TCP in scapy_packet and (scapy_packet[TCP].sport == 53 or scapy_packet[TCP].dport == 53))
        )

        if is_dns:
            protocol = "DNS"
            if UDP in scapy_packet:
                src_port = int(scapy_packet[UDP].sport)
                dst_port = int(scapy_packet[UDP].dport)
            elif TCP in scapy_packet:
                src_port = int(scapy_packet[TCP].sport)
                dst_port = int(scapy_packet[TCP].dport)
                tcp_flags = str(scapy_packet[TCP].flags)

            if DNS in scapy_packet and scapy_packet.haslayer(DNSQR):
                try:
                    q = scapy_packet[DNSQR].qname
                    if isinstance(q, bytes):
                        dns_query = q.decode("utf-8", errors="ignore").rstrip(".")
                    elif isinstance(q, str):
                        dns_query = q.rstrip(".")
                except Exception:
                    dns_query = None

        elif TCP in scapy_packet:
            protocol = "TCP"
            tcp_layer = scapy_packet[TCP]
            src_port = int(tcp_layer.sport)
            dst_port = int(tcp_layer.dport)
            tcp_flags = str(tcp_layer.flags)
            flags_int = int(tcp_layer.flags)

            # Check for TCP flag anomalies
            if flags_int == 0:
                malformed_reason = "TCP NULL flags"
            elif (flags_int & 0x03) == 0x03:  # SYN (0x02) and FIN (0x01)
                malformed_reason = "TCP SYN+FIN"
            elif (flags_int & 0x29) == 0x29:  # FIN (0x01) + PSH (0x08) + URG (0x20)
                malformed_reason = "TCP XMAS flags"

        elif UDP in scapy_packet:
            protocol = "UDP"
            udp_layer = scapy_packet[UDP]
            src_port = int(udp_layer.sport)
            dst_port = int(udp_layer.dport)

        elif ICMP in scapy_packet or any(l.__name__.startswith("ICMPv6") for l in scapy_packet.layers()):
            protocol = "ICMP"

        else:
            protocol = "OTHER"

        # Check for port 0 used on TCP/UDP
        if (src_port == 0 or dst_port == 0) and (protocol in ("TCP", "UDP", "DNS")):
            malformed_reason = "Port 0 used"

        # Extract payload preview (first 300 bytes decoded as latin-1)
        if Raw in scapy_packet:
            try:
                load = bytes(scapy_packet[Raw].load)[:300]
                payload_preview = load.decode("latin-1", errors="replace")
            except Exception:
                payload_preview = ""

        return {
            "timestamp": timestamp,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": src_port,
            "dst_port": dst_port,
            "protocol": protocol,
            "packet_size": packet_size,
            "tcp_flags": tcp_flags,
            "src_mac": src_mac,
            "dns_query": dns_query,
            "payload_preview": payload_preview,
            "malformed_reason": malformed_reason,
            "status": "normal"
        }
    except Exception:
        return None
