#!/usr/bin/env python3
"""
NetSentinel Diagnostic Tool
Evaluates system prerequisites, Npcap status, network interfaces,
and performs live packet capture with protocol verification.
"""

import sys
import os
import time
import socket
import urllib.request
import threading
import argparse
import ctypes
import ipaddress
from collections import Counter
from pathlib import Path

# Add capture directory to sys.path
capture_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(capture_dir))

def is_private_ip(ip_str):
    if not ip_str:
        return False
    try:
        addr = ipaddress.ip_address(ip_str)
        return addr.version == 4 and addr.is_private and not addr.is_link_local and not addr.is_loopback
    except Exception:
        return False

def bg_traffic_generator(stop_event):
    """Generates benign DNS and HTTPS traffic every 2 seconds during sniffing."""
    while not stop_event.is_set():
        try:
            socket.gethostbyname("example.com")
        except Exception:
            pass
        try:
            req = urllib.request.Request(
                "https://example.com",
                headers={"User-Agent": "NetSentinel-Diagnose/1.0"}
            )
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                resp.read(50)
        except Exception:
            pass
        stop_event.wait(2.0)

def main():
    parser = argparse.ArgumentParser(description="NetSentinel Packet Capture Diagnostic")
    parser.add_argument("--iface", type=str, default=None, help="Name, description, or GUID of interface to test")
    parser.add_argument("--seconds", type=int, default=8, help="Sniff duration in seconds (default: 8)")
    args = parser.parse_args()

    print("=" * 70)
    print("NetSentinel Packet Capture Diagnostics")
    print("=" * 70)

    has_failures = False

    # Check a: Python version and Scapy version
    py_ver = sys.version_info
    py_str = f"{py_ver.major}.{py_ver.minor}.{py_ver.micro}"
    try:
        import scapy
        scapy_ver = getattr(scapy, "__version__", "unknown")
    except ImportError:
        scapy_ver = "not installed"

    if py_ver >= (3, 10):
        print(f"[PASS] Python version: {py_str} (>= 3.10), Scapy: {scapy_ver}")
    else:
        print(f"[FAIL] Python version: {py_str} (< 3.10 required). Scapy: {scapy_ver}")
        has_failures = True

    # Check b: Running as Administrator
    is_admin = False
    try:
        if hasattr(ctypes.windll.shell32, "IsUserAnAdmin"):
            is_admin = (ctypes.windll.shell32.IsUserAnAdmin() != 0)
    except Exception:
        is_admin = False

    # Allow testing override if explicitly enabled by environment variable
    if not is_admin and os.environ.get("NETSENTINEL_ADMIN_OVERRIDE") == "1":
        is_admin = True

    if is_admin:
        print("[PASS] Running as Administrator")
    else:
        print("[FAIL] Running as Administrator: Open the terminal as Administrator")
        has_failures = True

    # Check c: Npcap detected
    from scapy.all import conf
    npcap_dll_path = r"C:\Windows\System32\Npcap\wpcap.dll"
    npcap_detected = bool(getattr(conf, "use_pcap", False)) or os.path.exists(npcap_dll_path)

    if npcap_detected:
        print(f"[PASS] Npcap detected (use_pcap={conf.use_pcap}, wpcap.dll exists={os.path.exists(npcap_dll_path)})")
    else:
        print("[FAIL] Npcap detected: Install Npcap from npcap.com with WinPcap API-compatible Mode")
        has_failures = True

    # Check d: Table of all interfaces from scapy conf.ifaces
    print("\n--- Network Interfaces (Scapy conf.ifaces) ---")
    default_dev = getattr(conf, "iface", None)
    default_name = getattr(default_dev, "name", None)
    default_net_name = getattr(default_dev, "network_name", None)
    default_guid = getattr(default_dev, "guid", None)

    virtual_keywords = [
        "virtual", "loopback", "miniport", "bluetooth",
        "wifi direct", "wi-fi direct", "kernel debug",
        "vmware", "virtualbox", "tap"
    ]

    header_fmt = "{:<5} {:<24} {:<34} {:<16} {:<18} {:<12} {:<8}"
    row_fmt = "{:<5} {:<24} {:<34} {:<16} {:<18} {:<12} {:<8}"
    print(header_fmt.format("Idx", "Name", "Description", "IPv4", "MAC", "RECOMMENDED", "DEFAULT"))
    print("-" * 125)

    iface_objects = []
    chosen_dev = None

    for idx, (iface_key, dev) in enumerate(conf.ifaces.items(), start=1):
        name = getattr(dev, "name", "") or str(iface_key)
        desc = getattr(dev, "description", "") or name
        ip = getattr(dev, "ip", "") or ""
        mac = getattr(dev, "mac", "") or ""
        guid = getattr(dev, "guid", "") or ""
        net_name = getattr(dev, "network_name", "") or ""

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

        rec_str = "YES" if recommended else "NO"
        def_str = "DEFAULT" if is_def else ""

        trunc_name = (clean_name[:22] + "..") if len(clean_name) > 24 else clean_name
        trunc_desc = (clean_desc[:32] + "..") if len(clean_desc) > 34 else clean_desc

        print(row_fmt.format(idx, trunc_name, trunc_desc, ip, mac, rec_str, def_str))
        iface_objects.append((clean_name, clean_desc, dev, is_def, recommended))

    # Resolve chosen interface
    from sniffer import resolve_iface
    if args.iface:
        try:
            chosen_dev = resolve_iface(args.iface)
            print(f"\nTarget interface specified: '{args.iface}' -> Resolved to: {getattr(chosen_dev, 'description', chosen_dev)}")
        except Exception as e:
            print(f"\n[FAIL] Interface resolution for '{args.iface}': {e}")
            has_failures = True
            chosen_dev = default_dev
    else:
        chosen_dev = default_dev
        print(f"\nTarget interface (default route): {getattr(chosen_dev, 'description', chosen_dev)}")

    # Check e: Live sniff for --seconds on chosen interface
    print(f"\n--- Live Sniff Test ({args.seconds}s on {getattr(chosen_dev, 'name', chosen_dev)}) ---")
    stop_event = threading.Event()
    traffic_thread = threading.Thread(target=bg_traffic_generator, args=(stop_event,), daemon=True)
    traffic_thread.start()

    from scapy.all import sniff
    from scapy.layers.l2 import Ether, ARP
    from scapy.layers.inet import IP, TCP, UDP, ICMP
    from scapy.layers.inet6 import IPv6
    from scapy.layers.dns import DNS
    from features import extract_features

    captured_packets = []
    try:
        captured_packets = sniff(iface=chosen_dev, timeout=float(args.seconds), store=True)
    except Exception as e:
        print(f"[FAIL] Live sniff encountered error: {e}")
        has_failures = True
    finally:
        stop_event.set()

    total_pkts = len(captured_packets)
    proto_counts = Counter()

    for p in captured_packets:
        if DNS in p or (UDP in p and (p[UDP].sport == 53 or p[UDP].dport == 53)) or (TCP in p and (p[TCP].sport == 53 or p[TCP].dport == 53)):
            proto_counts["DNS"] += 1
        elif TCP in p:
            proto_counts["TCP"] += 1
        elif UDP in p:
            proto_counts["UDP"] += 1
        elif ICMP in p or any(l.__name__.startswith("ICMPv6") for l in p.layers()):
            proto_counts["ICMP"] += 1
        elif IPv6 in p:
            proto_counts["IPv6"] += 1
        elif ARP in p:
            proto_counts["ARP"] += 1
        else:
            proto_counts["other"] += 1

    if total_pkts > 0:
        print(f"[PASS] Captured {total_pkts} packets during live sniff.")
    else:
        print(f"[FAIL] Captured 0 packets. Advice: check if adapter is connected, VPN active, or missing Administrator privileges.")
        has_failures = True

    print("Protocol distribution:")
    for proto in ["TCP", "UDP", "ICMP", "DNS", "IPv6", "ARP", "other"]:
        print(f"  - {proto:<6}: {proto_counts[proto]}")

    print("\nFirst 5 packet summaries:")
    for idx, p in enumerate(captured_packets[:5], start=1):
        print(f"  {idx}. {p.summary()}")

    # Check f: Run extract_features on every captured packet
    print("\n--- Feature Extraction Analysis ---")
    parsed_count = 0
    none_count = 0
    none_reasons = Counter()

    for p in captured_packets:
        feat = extract_features(p)
        if feat is not None:
            parsed_count += 1
        else:
            none_count += 1
            if ARP in p:
                none_reasons["ARP"] += 1
            elif IP not in p and IPv6 not in p:
                none_reasons["no IP layer"] += 1
            else:
                none_reasons["unsupported / malformed"] += 1

    print(f"Total packets processed: {total_pkts}")
    print(f"Parsed successfully:    {parsed_count}")
    print(f"Returned None:          {none_count}")
    if none_count > 0:
        print(f"Top reasons for None:   {', '.join(f'{k}: {v}' for k, v in none_reasons.most_common(3))}")
    else:
        print("Top reasons for None:   None (100% of packets were valid IP traffic)")

    # Final summary line
    print("\n" + "=" * 70)
    if not has_failures:
        print("DIAGNOSIS: READY")
        return 0
    else:
        print("DIAGNOSIS: NOT READY")
        return 1

if __name__ == "__main__":
    sys.exit(main())
