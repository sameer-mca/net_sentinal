import unittest
import sys
from pathlib import Path

# Add capture directory to sys.path
capture_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(capture_dir))

from scapy.layers.l2 import Ether, ARP
from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.inet6 import IPv6, ICMPv6EchoRequest
from scapy.layers.dns import DNS, DNSQR
from scapy.packet import Raw

from features import extract_features

class TestFeatures(unittest.TestCase):
    def test_normal_tcp_packet(self):
        pkt = (
            Ether(src="aa:bb:cc:00:01:0a", dst="08:8f:c3:70:58:a1")
            / IP(src="192.168.1.10", dst="142.250.1.1")
            / TCP(sport=51234, dport=443, flags="PA")
            / Raw(load=b"GET /index.html HTTP/1.1\r\nHost: example.com\r\n")
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["src_ip"], "192.168.1.10")
        self.assertEqual(res["dst_ip"], "142.250.1.1")
        self.assertEqual(res["protocol"], "TCP")
        self.assertEqual(res["src_port"], 51234)
        self.assertEqual(res["dst_port"], 443)
        self.assertIn("PA", res["tcp_flags"])
        self.assertEqual(res["src_mac"], "aa:bb:cc:00:01:0a")
        self.assertIsNone(res["malformed_reason"])
        self.assertEqual(res["status"], "normal")
        self.assertIn("GET /index.html", res["payload_preview"])

    def test_syn_fin_malformed_tcp(self):
        pkt = (
            Ether()
            / IP(src="10.10.10.66", dst="192.168.1.20")
            / TCP(sport=50000, dport=80, flags="SF")
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["protocol"], "TCP")
        self.assertEqual(res["malformed_reason"], "TCP SYN+FIN")

    def test_null_flags_malformed_tcp(self):
        pkt = (
            Ether()
            / IP(src="10.10.10.66", dst="192.168.1.20")
            / TCP(sport=50000, dport=80, flags=0)
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["protocol"], "TCP")
        self.assertEqual(res["malformed_reason"], "TCP NULL flags")

    def test_xmas_flags_malformed_tcp(self):
        pkt = (
            Ether()
            / IP(src="10.10.10.66", dst="192.168.1.20")
            / TCP(sport=50000, dport=80, flags="FPU")
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["protocol"], "TCP")
        self.assertEqual(res["malformed_reason"], "TCP XMAS flags")

    def test_dns_query_packet(self):
        pkt = (
            Ether(src="aa:bb:cc:00:01:0e")
            / IP(src="192.168.1.50", dst="8.8.8.8")
            / UDP(sport=53120, dport=53)
            / DNS(rd=1, qd=DNSQR(qname="www.google.com"))
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["protocol"], "DNS")
        self.assertEqual(res["src_port"], 53120)
        self.assertEqual(res["dst_port"], 53)
        self.assertEqual(res["dns_query"], "www.google.com")
        self.assertIsNone(res["malformed_reason"])

    def test_icmp_packet(self):
        pkt = (
            Ether()
            / IP(src="192.168.1.10", dst="8.8.8.8")
            / ICMP()
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["protocol"], "ICMP")
        self.assertIsNone(res["src_port"])
        self.assertIsNone(res["dst_port"])

    def test_non_ip_packet_ignored(self):
        pkt = Ether() / ARP()
        res = extract_features(pkt)
        self.assertIsNone(res)

    def test_ipv6_tcp_packet(self):
        pkt = (
            Ether(src="aa:bb:cc:00:01:aa", dst="08:8f:c3:70:58:a1")
            / IPv6(src="2001:db8:85a3::8a2e:370:7334", dst="2001:db8:85a3::8a2e:370:7335")
            / TCP(sport=54321, dport=443, flags="PA")
            / Raw(load=b"POST /api/test HTTP/1.1\r\nHost: example.org\r\n")
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["src_ip"], "2001:db8:85a3::8a2e:370:7334")
        self.assertEqual(res["dst_ip"], "2001:db8:85a3::8a2e:370:7335")
        self.assertEqual(res["protocol"], "TCP")
        self.assertEqual(res["src_port"], 54321)
        self.assertEqual(res["dst_port"], 443)
        self.assertIn("PA", res["tcp_flags"])
        self.assertEqual(res["src_mac"], "aa:bb:cc:00:01:aa")
        self.assertIsNone(res["malformed_reason"])
        self.assertEqual(res["status"], "normal")
        self.assertIn("POST /api/test", res["payload_preview"])

    def test_ipv6_udp_dns_packet(self):
        pkt = (
            Ether(src="00:11:22:33:44:55")
            / IPv6(src="2001:db8::1", dst="2001:4860:4860::8888")
            / UDP(sport=53120, dport=53)
            / DNS(rd=1, qd=DNSQR(qname="ipv6.google.com"))
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["src_ip"], "2001:db8::1")
        self.assertEqual(res["dst_ip"], "2001:4860:4860::8888")
        self.assertEqual(res["protocol"], "DNS")
        self.assertEqual(res["src_port"], 53120)
        self.assertEqual(res["dst_port"], 53)
        self.assertEqual(res["dns_query"], "ipv6.google.com")
        self.assertIsNone(res["malformed_reason"])

    def test_ipv6_icmp_echo_packet(self):
        pkt = (
            Ether(src="00:11:22:33:44:55")
            / IPv6(src="2001:db8::1", dst="2001:db8::2")
            / ICMPv6EchoRequest()
        )
        res = extract_features(pkt)
        self.assertIsNotNone(res)
        self.assertEqual(res["src_ip"], "2001:db8::1")
        self.assertEqual(res["dst_ip"], "2001:db8::2")
        self.assertEqual(res["protocol"], "ICMP")
        self.assertIsNone(res["src_port"])
        self.assertIsNone(res["dst_port"])

if __name__ == "__main__":
    unittest.main()
