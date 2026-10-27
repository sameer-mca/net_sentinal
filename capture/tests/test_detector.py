import unittest
import sys
import random
from pathlib import Path

# Add capture directory to sys.path
capture_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(capture_dir))

from detector import Detector

DEFAULT_RULES = [
    {
        "id": 1,
        "rule_name": "SYN Flood",
        "attack_type": "syn_flood",
        "threshold_value": 100,
        "time_window": 10,
        "severity": "high",
        "is_active": True,
    },
    {
        "id": 2,
        "rule_name": "Port Scan",
        "attack_type": "port_scan",
        "threshold_value": 15,
        "time_window": 10,
        "severity": "medium",
        "is_active": True,
    },
    {
        "id": 3,
        "rule_name": "ICMP Flood",
        "attack_type": "icmp_flood",
        "threshold_value": 100,
        "time_window": 10,
        "severity": "high",
        "is_active": True,
    },
    {
        "id": 4,
        "rule_name": "Suspicious DNS",
        "attack_type": "suspicious_dns",
        "threshold_value": 50,
        "time_window": 60,
        "severity": "medium",
        "is_active": True,
    },
    {
        "id": 5,
        "rule_name": "Suspicious Payload",
        "attack_type": "suspicious_payload",
        "threshold_value": 1,
        "time_window": 1,
        "severity": "high",
        "is_active": True,
    },
    {
        "id": 6,
        "rule_name": "Malformed Packet",
        "attack_type": "malformed_packet",
        "threshold_value": 1,
        "time_window": 1,
        "severity": "medium",
        "is_active": True,
    },
]

class TestDetector(unittest.TestCase):
    def setUp(self):
        self.detector = Detector()
        self.detector.update_rules(DEFAULT_RULES)

    def test_1_syn_flood_and_cooldown(self):
        # 120 SYN packets from one IP within window triggers exactly ONE syn_flood alert
        alerts = []
        for i in range(120):
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": "10.10.10.1",
                "dst_ip": "192.168.1.10",
                "src_port": 50000 + i,
                "dst_port": 80,
                "protocol": "TCP",
                "packet_size": 60,
                "tcp_flags": "S",
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts.extend(res)

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "syn_flood")
        self.assertEqual(alerts[0]["severity"], "high")
        self.assertEqual(alerts[0]["source_ip"], "10.10.10.1")

    def test_2_port_scan(self):
        # 20 SYN packets to 20 different ports triggers port_scan
        alerts = []
        for port in range(1, 21):
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": "10.10.10.2",
                "dst_ip": "192.168.1.20",
                "src_port": 54000,
                "dst_port": port,
                "protocol": "TCP",
                "packet_size": 60,
                "tcp_flags": "S",
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts.extend(res)

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "port_scan")
        self.assertEqual(alerts[0]["severity"], "medium")
        self.assertEqual(alerts[0]["source_ip"], "10.10.10.2")

    def test_3_icmp_flood(self):
        # 110 ICMP packets triggers icmp_flood
        alerts = []
        for _ in range(110):
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": "10.10.10.3",
                "dst_ip": "192.168.1.10",
                "src_port": None,
                "dst_port": None,
                "protocol": "ICMP",
                "packet_size": 84,
                "tcp_flags": None,
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts.extend(res)

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "icmp_flood")
        self.assertEqual(alerts[0]["severity"], "high")

    def test_4_suspicious_dns(self):
        # 60 DNS queries triggers suspicious_dns
        alerts = []
        for _ in range(60):
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": "10.10.10.4",
                "dst_ip": "8.8.8.8",
                "src_port": 53000,
                "dst_port": 53,
                "protocol": "DNS",
                "packet_size": 75,
                "tcp_flags": None,
                "dns_query": "normal.example.org",
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts.extend(res)

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "suspicious_dns")

    def test_5_suspicious_payload(self):
        # payload "GET /index.php?id=1' OR 1=1 --" triggers suspicious_payload
        pkt = {
            "timestamp": "2026-10-24T17:00:00.000Z",
            "src_ip": "10.10.10.5",
            "dst_ip": "192.168.1.20",
            "src_port": 51234,
            "dst_port": 80,
            "protocol": "TCP",
            "packet_size": 250,
            "tcp_flags": "PA",
            "payload_preview": "GET /index.php?id=1' OR 1=1 -- HTTP/1.1\r\nHost: target\r\n",
            "status": "normal",
        }
        alerts = self.detector.process(pkt)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "suspicious_payload")
        self.assertEqual(pkt["status"], "suspicious")

    def test_6_benign_payload(self):
        # benign payload "GET /home HTTP/1.1" does NOT trigger
        pkt = {
            "timestamp": "2026-10-24T17:00:00.000Z",
            "src_ip": "10.10.10.6",
            "dst_ip": "192.168.1.20",
            "src_port": 51234,
            "dst_port": 80,
            "protocol": "TCP",
            "packet_size": 180,
            "tcp_flags": "PA",
            "payload_preview": "GET /home HTTP/1.1\r\nHost: target.local\r\nAccept: */*\r\n",
            "status": "normal",
        }
        alerts = self.detector.process(pkt)
        self.assertEqual(len(alerts), 0)
        self.assertEqual(pkt["status"], "normal")

    def test_7_malformed_packet(self):
        # malformed_reason set triggers malformed_packet
        pkt = {
            "timestamp": "2026-10-24T17:00:00.000Z",
            "src_ip": "10.10.10.7",
            "dst_ip": "192.168.1.20",
            "src_port": 50000,
            "dst_port": 80,
            "protocol": "TCP",
            "packet_size": 60,
            "tcp_flags": "SF",
            "malformed_reason": "TCP SYN+FIN",
            "status": "normal",
        }
        alerts = self.detector.process(pkt)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["alert_type"], "malformed_packet")
        self.assertEqual(pkt["status"], "suspicious")

    def test_8_normal_traffic_no_alerts(self):
        # normal browsing-like traffic of 500 packets from several IPs triggers NO alerts
        alerts = []
        hosts = [f"192.168.1.{i}" for i in range(10, 16)]
        for i in range(500):
            src = random.choice(hosts)
            proto = random.choice(["TCP", "UDP", "DNS"])
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": src,
                "dst_ip": "142.250.1.1",
                "src_port": 50000 + (i % 500),
                "dst_port": 443 if proto == "TCP" else (53 if proto == "DNS" else 123),
                "protocol": proto,
                "packet_size": random.randint(64, 1400),
                "tcp_flags": "PA" if proto == "TCP" else None,
                "dns_query": "www.google.com" if proto == "DNS" else None,
                "payload_preview": "HTTP/1.1 200 OK\r\n" if proto == "TCP" else "",
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts.extend(res)

        self.assertEqual(len(alerts), 0)

    def test_9_rule_threshold_update_immediate(self):
        # updating a rule threshold (e.g. syn_flood 100 -> 10) changes behavior immediately
        # 15 packets with threshold 100 -> 0 alerts
        alerts_initial = []
        for i in range(15):
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": "10.10.10.9",
                "dst_ip": "192.168.1.10",
                "src_port": 51000 + i,
                "dst_port": 80,
                "protocol": "TCP",
                "tcp_flags": "S",
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts_initial.extend(res)

        self.assertEqual(len(alerts_initial), 0)

        # Update syn_flood threshold to 10
        updated_rules = [dict(r) for r in DEFAULT_RULES]
        for r in updated_rules:
            if r["attack_type"] == "syn_flood":
                r["threshold_value"] = 10
        self.detector.update_rules(updated_rules)

        # Next packet should immediately trigger since window already has > 10 packets
        next_pkt = {
            "timestamp": "2026-10-24T17:00:00.000Z",
            "src_ip": "10.10.10.9",
            "dst_ip": "192.168.1.10",
            "src_port": 52000,
            "dst_port": 80,
            "protocol": "TCP",
            "tcp_flags": "S",
            "status": "normal",
        }
        alerts_after = self.detector.process(next_pkt)
        self.assertEqual(len(alerts_after), 1)
        self.assertEqual(alerts_after[0]["alert_type"], "syn_flood")

    def test_10_rule_absent_disabled(self):
        # a rule absent from update_rules is not evaluated
        only_icmp = [r for r in DEFAULT_RULES if r["attack_type"] == "icmp_flood"]
        self.detector.update_rules(only_icmp)

        # Send 150 SYN packets -> 0 alerts because syn_flood is absent
        alerts = []
        for i in range(150):
            pkt = {
                "timestamp": "2026-10-24T17:00:00.000Z",
                "src_ip": "10.10.10.10",
                "dst_ip": "192.168.1.10",
                "src_port": 50000 + i,
                "dst_port": 80,
                "protocol": "TCP",
                "tcp_flags": "S",
                "status": "normal",
            }
            res = self.detector.process(pkt)
            if res:
                alerts.extend(res)

        self.assertEqual(len(alerts), 0)

if __name__ == "__main__":
    unittest.main()
