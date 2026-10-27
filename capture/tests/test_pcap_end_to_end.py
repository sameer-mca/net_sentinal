import unittest
import sys
from pathlib import Path

# Add capture directory to sys.path
capture_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(capture_dir))

from scapy.all import rdpcap, ARP, IPv6
from features import extract_features
from detector import Detector
from tools.make_test_pcaps import generate_pcaps

DEFAULT_RULES = [
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

class TestPcapEndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pcaps_dir = capture_dir / "tests" / "pcaps"
        # Ensure pcaps exist
        if not (cls.pcaps_dir / "normal.pcap").exists():
            generate_pcaps(cls.pcaps_dir)

    def _replay(self, pcap_name, rules=None):
        if rules is None:
            rules = DEFAULT_RULES

        pcap_path = self.pcaps_dir / pcap_name
        self.assertTrue(pcap_path.exists(), f"PCAP not found: {pcap_name}")

        packets = rdpcap(str(pcap_path))
        simulated_time = [0.0]

        detector = Detector(now_fn=lambda: simulated_time[0])
        detector.update_rules(rules)

        alerts = []
        parsed = 0
        none_count = 0
        arp_count = 0
        ipv6_count = 0

        for pkt in packets:
            simulated_time[0] = float(getattr(pkt, "time", 0.0))
            feat = extract_features(pkt)
            if feat is None:
                none_count += 1
                if ARP in pkt:
                    arp_count += 1
            else:
                parsed += 1
                if IPv6 in pkt:
                    ipv6_count += 1
                res = detector.process(feat)
                if res:
                    alerts.extend(res)

        return {
            "alerts": alerts,
            "packets": packets,
            "parsed": parsed,
            "none_count": none_count,
            "arp_count": arp_count,
            "ipv6_count": ipv6_count,
        }

    def test_normal_pcap(self):
        res = self._replay("normal.pcap")
        self.assertEqual(len(res["packets"]), 600)
        self.assertEqual(len(res["alerts"]), 0, "normal.pcap should produce 0 alerts")
        self.assertEqual(res["arp_count"], 10, "ARP frames must be ignored (return None)")
        self.assertEqual(res["none_count"], 10, "Only the 10 ARP frames should return None")
        self.assertEqual(res["ipv6_count"], 10, "10 IPv6 frames must be parsed")
        self.assertEqual(res["parsed"], 590, "590 IP packets should be parsed")

    def test_syn_flood_pcap(self):
        res = self._replay("syn_flood.pcap")
        self.assertEqual(len(res["packets"]), 150)
        self.assertEqual(len(res["alerts"]), 1)
        alert = res["alerts"][0]
        self.assertEqual(alert["alert_type"], "syn_flood")
        self.assertEqual(alert["severity"], "high")
        self.assertEqual(alert["source_ip"], "10.20.30.40")

    def test_port_scan_pcap(self):
        res = self._replay("port_scan.pcap")
        self.assertEqual(len(res["packets"]), 30)
        self.assertEqual(len(res["alerts"]), 1)
        alert = res["alerts"][0]
        self.assertEqual(alert["alert_type"], "port_scan")
        self.assertEqual(alert["severity"], "medium")
        self.assertEqual(alert["source_ip"], "10.20.30.41")
        # Ensure no syn_flood alert fired
        syn_alerts = [a for a in res["alerts"] if a["alert_type"] == "syn_flood"]
        self.assertEqual(len(syn_alerts), 0)

    def test_icmp_flood_pcap(self):
        res = self._replay("icmp_flood.pcap")
        self.assertEqual(len(res["packets"]), 120)
        self.assertEqual(len(res["alerts"]), 1)
        alert = res["alerts"][0]
        self.assertEqual(alert["alert_type"], "icmp_flood")
        self.assertEqual(alert["severity"], "high")
        self.assertEqual(alert["source_ip"], "10.20.30.42")

    def test_dns_abuse_pcap(self):
        res = self._replay("dns_abuse.pcap")
        self.assertEqual(len(res["packets"]), 60)
        self.assertEqual(len(res["alerts"]), 1)
        alert = res["alerts"][0]
        self.assertEqual(alert["alert_type"], "suspicious_dns")
        self.assertEqual(alert["severity"], "medium")
        self.assertEqual(alert["source_ip"], "192.168.1.31")

    def test_dns_long_pcap(self):
        res = self._replay("dns_long.pcap")
        self.assertEqual(len(res["packets"]), 4)
        self.assertEqual(len(res["alerts"]), 1)
        alert = res["alerts"][0]
        self.assertEqual(alert["alert_type"], "suspicious_dns")
        self.assertEqual(alert["severity"], "medium")
        self.assertEqual(alert["source_ip"], "192.168.1.32")

    def test_payload_pcap(self):
        res = self._replay("payload.pcap")
        self.assertEqual(len(res["packets"]), 6)
        self.assertEqual(len(res["alerts"]), 6, "Expected exactly 6 payload alerts (1 per packet)")
        for alert in res["alerts"]:
            self.assertEqual(alert["alert_type"], "suspicious_payload")
            self.assertEqual(alert["severity"], "high")

    def test_benign_payloads_pcap(self):
        res = self._replay("benign_payloads.pcap")
        self.assertEqual(len(res["packets"]), 10)
        self.assertEqual(len(res["alerts"]), 0, "benign_payloads.pcap should produce 0 alerts")

    def test_malformed_pcap(self):
        res = self._replay("malformed.pcap")
        self.assertEqual(len(res["packets"]), 4)
        self.assertEqual(len(res["alerts"]), 4, "Expected exactly 4 malformed alerts (1 per packet)")
        for alert in res["alerts"]:
            self.assertEqual(alert["alert_type"], "malformed_packet")
            self.assertEqual(alert["severity"], "medium")

    def test_rule_change_threshold(self):
        # Modifying threshold to 500 should cause syn_flood.pcap (150 pkts) to generate 0 alerts
        custom_rules = [
            dict(r, threshold_value=500.0) if r["attack_type"] == "syn_flood" else r
            for r in DEFAULT_RULES
        ]
        res = self._replay("syn_flood.pcap", rules=custom_rules)
        self.assertEqual(len(res["packets"]), 150)
        self.assertEqual(len(res["alerts"]), 0, "Increasing threshold to 500 should prevent alert from firing")

if __name__ == "__main__":
    unittest.main()
