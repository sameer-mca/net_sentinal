#!/usr/bin/env python3
"""
NetSentinel PCAP Replay Tool
Reads a .pcap file from disk, runs feature extraction and detection rules,
and optionally transmits extracted features and alerts to the backend.
"""

import os
import sys
import time
import argparse
import datetime
from pathlib import Path
from collections import Counter

# Add capture directory to sys.path
capture_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(capture_dir))

from scapy.all import PcapReader, ARP, IP, IPv6
from features import extract_features
from detector import Detector
from api_client import ApiClient

def default_rules():
    """Returns the 6 hardcoded default detection rules for offline testing."""
    return [
        {
            "id": 1,
            "rule_name": "SYN Flood",
            "attack_type": "syn_flood",
            "threshold_value": 100.0,
            "time_window": 10,
            "severity": "high",
            "is_active": True,
        },
        {
            "id": 2,
            "rule_name": "Port Scan",
            "attack_type": "port_scan",
            "threshold_value": 15.0,
            "time_window": 10,
            "severity": "medium",
            "is_active": True,
        },
        {
            "id": 3,
            "rule_name": "ICMP Flood",
            "attack_type": "icmp_flood",
            "threshold_value": 100.0,
            "time_window": 10,
            "severity": "high",
            "is_active": True,
        },
        {
            "id": 4,
            "rule_name": "Suspicious DNS",
            "attack_type": "suspicious_dns",
            "threshold_value": 50.0,
            "time_window": 60,
            "severity": "medium",
            "is_active": True,
        },
        {
            "id": 5,
            "rule_name": "Suspicious Payload",
            "attack_type": "suspicious_payload",
            "threshold_value": 1.0,
            "time_window": 1,
            "severity": "high",
            "is_active": True,
        },
        {
            "id": 6,
            "rule_name": "Malformed Packet",
            "attack_type": "malformed_packet",
            "threshold_value": 1.0,
            "time_window": 1,
            "severity": "medium",
            "is_active": True,
        },
    ]

def main():
    parser = argparse.ArgumentParser(description="Replay a PCAP file through NetSentinel detector")
    parser.add_argument("pcap_file", type=str, help="Path to .pcap file")
    parser.add_argument("--speed", type=float, default=1.0, help="Replay speed multiplier (default: 1.0)")
    parser.add_argument("--send", action="store_true", help="Post packets and alerts to backend API")
    parser.add_argument("--offline", action="store_true", help="Use hardcoded default detection rules")
    args = parser.parse_args()

    pcap_path = Path(args.pcap_file)
    if not pcap_path.is_absolute():
        # Check relative to current working dir or relative to capture dir
        if not pcap_path.exists() and (capture_dir / pcap_path).exists():
            pcap_path = capture_dir / pcap_path

    if not pcap_path.exists():
        print(f"Error: PCAP file not found: {args.pcap_file}")
        sys.exit(1)

    print("=" * 65)
    print(f"NetSentinel PCAP Replay: {pcap_path.name}")
    print(f"  Speed: {args.speed}x | Send to backend: {args.send} | Offline: {args.offline}")
    print("=" * 65)

    detector = Detector()
    api = None

    if args.offline:
        rules = default_rules()
        detector.update_rules(rules)
        print(f"Loaded {len(rules)} default detection rules (offline mode).")
    else:
        api = ApiClient()
        control_data = api.get_control()
        if control_data and control_data.get("rules"):
            detector.update_rules(control_data["rules"])
            print(f"Fetched {len(control_data['rules'])} rules from backend control API.")
        else:
            print("Notice: Could not fetch backend rules; falling back to default rules.")
            detector.update_rules(default_rules())

    if args.send and not api:
        api = ApiClient()

    packets_read = 0
    packets_parsed = 0
    packets_ignored = 0
    ignore_reasons = Counter()
    alerts_by_type = Counter()

    prev_pkt_time = None
    sent_packets_batch = []
    sent_alerts_batch = []

    try:
        reader = PcapReader(str(pcap_path))
    except Exception as e:
        print(f"Error opening PCAP file: {e}")
        sys.exit(1)

    for pkt in reader:
        packets_read += 1
        pkt_time = float(getattr(pkt, "time", 0.0))

        # Pace packets based on inter-arrival delta and speed multiplier
        if prev_pkt_time is not None and args.speed > 0:
            delta = pkt_time - prev_pkt_time
            if 0 < delta < 60:
                time.sleep(delta / args.speed)
        prev_pkt_time = pkt_time

        features = extract_features(pkt)
        if features is None:
            packets_ignored += 1
            if ARP in pkt:
                ignore_reasons["ARP"] += 1
            elif IP not in pkt and IPv6 not in pkt:
                ignore_reasons["no IP layer"] += 1
            else:
                ignore_reasons["unsupported / malformed"] += 1
            continue

        packets_parsed += 1

        # Evaluate detection rules
        alerts = detector.process(features)

        if alerts:
            features["status"] = "suspicious"
            for alert in alerts:
                atype = alert.get("alert_type")
                alerts_by_type[atype] += 1
                sev = alert.get("severity", "medium").upper()
                desc = alert.get("description", "")
                src = alert.get("source_ip", "")
                print(f"[ALERT] {atype} ({sev}) from {src}: {desc}")

        if args.send and api:
            # When sending live to backend, ensure current timestamp so it renders in dashboard views
            now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
            features["timestamp"] = now_iso
            for al in alerts:
                al["timestamp"] = now_iso

            cleaned_pkt = {
                "timestamp": features.get("timestamp"),
                "src_ip": features.get("src_ip"),
                "dst_ip": features.get("dst_ip"),
                "src_port": features.get("src_port"),
                "dst_port": features.get("dst_port"),
                "protocol": features.get("protocol"),
                "packet_size": features.get("packet_size"),
                "tcp_flags": features.get("tcp_flags"),
                "src_mac": features.get("src_mac"),
                "status": features.get("status", "normal"),
            }
            sent_packets_batch.append(cleaned_pkt)
            if alerts:
                sent_alerts_batch.extend(alerts)

            # Flush in batches
            if len(sent_packets_batch) >= 50:
                api.send_packets(sent_packets_batch)
                sent_packets_batch = []
            if len(sent_alerts_batch) >= 10:
                api.send_alerts(sent_alerts_batch)
                sent_alerts_batch = []

    # Final flush of buffered packets/alerts
    if args.send and api:
        if sent_packets_batch:
            api.send_packets(sent_packets_batch)
        if sent_alerts_batch:
            api.send_alerts(sent_alerts_batch)

    print("\n" + "=" * 65)
    print("REPLAY SUMMARY")
    print("=" * 65)
    print(f"Packets read:    {packets_read}")
    print(f"Packets parsed:  {packets_parsed}")
    print(f"Packets ignored: {packets_ignored}")
    if ignore_reasons:
        print(f"  Ignore breakdown: {dict(ignore_reasons)}")
    print(f"Alerts triggered: {sum(alerts_by_type.values())}")
    for atype, cnt in alerts_by_type.items():
        print(f"  - {atype:<20}: {cnt}")
    print("=" * 65)

if __name__ == "__main__":
    main()
