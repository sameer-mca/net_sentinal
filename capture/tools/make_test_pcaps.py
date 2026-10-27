#!/usr/bin/env python3
"""
NetSentinel PCAP Generator Tool
Generates synthetic packet capture (.pcap) files for offline detection rule testing.
Packets are written directly to disk and never transmitted across the network.
"""

import os
import sys
from pathlib import Path

# Add capture directory to sys.path
capture_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(capture_dir))

from scapy.all import wrpcap, Ether, IP, IPv6, TCP, UDP, ICMP, ARP, DNS, DNSQR, Raw

def generate_pcaps(output_dir=None):
    if output_dir is None:
        output_dir = capture_dir / "tests" / "pcaps"
    os.makedirs(output_dir, exist_ok=True)

    base_t = 1710000000.0
    generated_files = []

    # -------------------------------------------------------------------------
    # 1. normal.pcap
    # 600 packets over 60 seconds from 5 private IPs to public servers
    # -------------------------------------------------------------------------
    normal_pkts = []
    src_ips = [f"192.168.1.{10+i}" for i in range(5)]
    dst_ips = ["142.250.190.46", "151.101.65.140", "104.16.249.249", "8.8.8.8", "1.1.1.1"]

    for i in range(560):
        t = base_t + (i * 0.1)
        src = src_ips[i % 5]
        dst = dst_ips[i % 5]
        sport = 40000 + (i % 500)
        dport = 443 if i % 2 == 0 else 80
        flags = ["A", "PA", "SA", "FA"][i % 4]
        pkt = (
            Ether(src="aa:bb:cc:00:01:0a", dst="08:8f:c3:70:58:a1")
            / IP(src=src, dst=dst)
            / TCP(sport=sport, dport=dport, flags=flags)
            / Raw(b"GET /status HTTP/1.1\r\nHost: example.org\r\n\r\n")
        )
        pkt.time = t
        normal_pkts.append(pkt)

    # DNS queries (max 15 queries per source)
    for i in range(10):
        t = base_t + 10.0 + (i * 0.5)
        src = src_ips[i % 5]
        qname = "www.google.com" if i % 2 == 0 else "api.github.com"
        pkt = (
            Ether(src="aa:bb:cc:00:01:0a")
            / IP(src=src, dst="8.8.8.8")
            / UDP(sport=53000 + i, dport=53)
            / DNS(rd=1, qd=DNSQR(qname=qname))
        )
        pkt.time = t
        normal_pkts.append(pkt)

    # UDP 123 (NTP)
    for i in range(5):
        t = base_t + 20.0 + i
        src = src_ips[i % 5]
        pkt = (
            Ether(src="aa:bb:cc:00:01:0a")
            / IP(src=src, dst="216.239.35.0")
            / UDP(sport=123, dport=123)
            / Raw(b"\x1b" + 47 * b"\x00")
        )
        pkt.time = t
        normal_pkts.append(pkt)

    # ICMP Echo
    for i in range(5):
        t = base_t + 30.0 + i
        src = src_ips[i % 5]
        pkt = (
            Ether(src="aa:bb:cc:00:01:0a")
            / IP(src=src, dst="8.8.8.8")
            / ICMP(type=8)
        )
        pkt.time = t
        normal_pkts.append(pkt)

    # 10 ARP frames (ignored by parser)
    for i in range(10):
        t = base_t + 40.0 + i
        pkt = Ether(src="aa:bb:cc:00:01:0a", dst="ff:ff:ff:ff:ff:ff") / ARP(op=1, psrc=src_ips[i % 5], pdst="192.168.1.1")
        pkt.time = t
        normal_pkts.append(pkt)

    # 10 IPv6 TCP packets (parsed)
    for i in range(10):
        t = base_t + 50.0 + i
        pkt = (
            Ether(src="aa:bb:cc:00:01:0a")
            / IPv6(src="2001:db8::10", dst="2001:4860:4860::8888")
            / TCP(sport=50000 + i, dport=443, flags="PA")
            / Raw(b"GET / HTTP/1.1\r\n\r\n")
        )
        pkt.time = t
        normal_pkts.append(pkt)

    normal_pkts.sort(key=lambda p: float(p.time))
    f_normal = output_dir / "normal.pcap"
    wrpcap(str(f_normal), normal_pkts)
    generated_files.append((f_normal, len(normal_pkts)))

    # -------------------------------------------------------------------------
    # 2. syn_flood.pcap
    # 150 TCP SYN packets from 10.20.30.40 to 192.168.1.20:80, one every 20ms
    # -------------------------------------------------------------------------
    syn_pkts = []
    for i in range(150):
        p = Ether() / IP(src="10.20.30.40", dst="192.168.1.20") / TCP(sport=10000 + i, dport=80, flags="S")
        p.time = base_t + (i * 0.02)
        syn_pkts.append(p)
    f_syn = output_dir / "syn_flood.pcap"
    wrpcap(str(f_syn), syn_pkts)
    generated_files.append((f_syn, len(syn_pkts)))

    # -------------------------------------------------------------------------
    # 3. port_scan.pcap
    # 30 TCP SYN packets from 10.20.30.41 to 192.168.1.20, ports 20..49, every 50ms
    # -------------------------------------------------------------------------
    scan_pkts = []
    for i in range(30):
        p = Ether() / IP(src="10.20.30.41", dst="192.168.1.20") / TCP(sport=54321, dport=20 + i, flags="S")
        p.time = base_t + (i * 0.05)
        scan_pkts.append(p)
    f_scan = output_dir / "port_scan.pcap"
    wrpcap(str(f_scan), scan_pkts)
    generated_files.append((f_scan, len(scan_pkts)))

    # -------------------------------------------------------------------------
    # 4. icmp_flood.pcap
    # 120 ICMP echo requests from 10.20.30.42 to 192.168.1.20, every 30ms
    # -------------------------------------------------------------------------
    icmp_pkts = []
    for i in range(120):
        p = Ether() / IP(src="10.20.30.42", dst="192.168.1.20") / ICMP(type=8)
        p.time = base_t + (i * 0.03)
        icmp_pkts.append(p)
    f_icmp = output_dir / "icmp_flood.pcap"
    wrpcap(str(f_icmp), icmp_pkts)
    generated_files.append((f_icmp, len(icmp_pkts)))

    # -------------------------------------------------------------------------
    # 5. dns_abuse.pcap & dns_long.pcap
    # 60 DNS queries from 192.168.1.31 within 20s
    # 4 DNS queries from 192.168.1.32 with 55-char label
    # -------------------------------------------------------------------------
    dns_pkts = []
    for i in range(60):
        p = (
            Ether()
            / IP(src="192.168.1.31", dst="8.8.8.8")
            / UDP(sport=50000 + i, dport=53)
            / DNS(rd=1, qd=DNSQR(qname=f"sub{i}.example.com"))
        )
        p.time = base_t + (i * (20.0 / 60))
        dns_pkts.append(p)
    f_dns = output_dir / "dns_abuse.pcap"
    wrpcap(str(f_dns), dns_pkts)
    generated_files.append((f_dns, len(dns_pkts)))

    dns_long_pkts = []
    for i in range(4):
        label = "a" * 55
        p = (
            Ether()
            / IP(src="192.168.1.32", dst="8.8.8.8")
            / UDP(sport=50000 + i, dport=53)
            / DNS(rd=1, qd=DNSQR(qname=f"{label}.example.com"))
        )
        p.time = base_t + (i * 1.0)
        dns_long_pkts.append(p)
    f_dns_long = output_dir / "dns_long.pcap"
    wrpcap(str(f_dns_long), dns_long_pkts)
    generated_files.append((f_dns_long, len(dns_long_pkts)))

    # -------------------------------------------------------------------------
    # 6. payload.pcap
    # 6 packets with distinct raw payloads from 10.20.30.43 to 10.20.30.48
    # -------------------------------------------------------------------------
    payload_strings = [
        b"GET /index.php?id=1' OR 1=1 -- HTTP/1.1\r\nHost: target\r\n\r\n",
        b"GET /search?q=<script>alert(1)</script> HTTP/1.1\r\nHost: target\r\n\r\n",
        b"GET /../../etc/passwd HTTP/1.1\r\nHost: target\r\n\r\n",
        b"GET /page?id=1 UNION SELECT username,password FROM users HTTP/1.1\r\nHost: target\r\n\r\n",
        b"GET /a?q=%27%20OR%201%3D1%20-- HTTP/1.1\r\nHost: target\r\n\r\n",
        b"POST /run HTTP/1.1\r\nHost: target\r\nContent-Length: 25\r\n\r\ncmd=; cat /etc/passwd\r\n",
    ]
    payload_pkts = []
    for i, pl in enumerate(payload_strings):
        src = f"10.20.30.{43+i}"
        p = Ether() / IP(src=src, dst="192.168.1.20") / TCP(sport=50000 + i, dport=80, flags="PA") / Raw(load=pl)
        p.time = base_t + (i * 5.0)
        payload_pkts.append(p)
    f_payload = output_dir / "payload.pcap"
    wrpcap(str(f_payload), payload_pkts)
    generated_files.append((f_payload, len(payload_pkts)))

    # -------------------------------------------------------------------------
    # 7. benign_payloads.pcap
    # 10 normal HTTP requests
    # -------------------------------------------------------------------------
    benign_strings = [
        b"GET /home HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Mozilla/5.0\r\n\r\n",
        b"GET /images/logo.png HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"POST /login HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\nuser=bob&pass=secret",
        b"GET /about HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"GET /contact HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"GET /css/style.css HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"GET /js/app.js HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"POST /submit HTTP/1.1\r\nHost: example.com\r\nContent-Length: 26\r\n\r\nname=Alice&message=hello",
        b"GET /products?page=2 HTTP/1.1\r\nHost: example.com\r\n\r\n",
        b"GET /api/v1/health HTTP/1.1\r\nHost: example.com\r\n\r\n",
    ]
    benign_pkts = []
    for i, pl in enumerate(benign_strings):
        p = Ether() / IP(src=f"192.168.1.{10+(i%5)}", dst="142.250.190.46") / TCP(sport=50000 + i, dport=80, flags="PA") / Raw(load=pl)
        p.time = base_t + (i * 2.0)
        benign_pkts.append(p)
    f_benign = output_dir / "benign_payloads.pcap"
    wrpcap(str(f_benign), benign_pkts)
    generated_files.append((f_benign, len(benign_pkts)))

    # -------------------------------------------------------------------------
    # 8. malformed.pcap
    # 4 packets: NULL flags, XMAS flags, SYN+FIN flags, source port 0
    # -------------------------------------------------------------------------
    malformed_pkts = [
        Ether() / IP(src="10.20.30.51", dst="192.168.1.20") / TCP(sport=50001, dport=80, flags=0),
        Ether() / IP(src="10.20.30.52", dst="192.168.1.20") / TCP(sport=50002, dport=80, flags="FPU"),
        Ether() / IP(src="10.20.30.53", dst="192.168.1.20") / TCP(sport=50003, dport=80, flags="SF"),
        Ether() / IP(src="10.20.30.54", dst="192.168.1.20") / TCP(sport=0, dport=80, flags="S"),
    ]
    for i, p in enumerate(malformed_pkts):
        p.time = base_t + (i * 2.0)
    f_malformed = output_dir / "malformed.pcap"
    wrpcap(str(f_malformed), malformed_pkts)
    generated_files.append((f_malformed, len(malformed_pkts)))

    return generated_files

def main():
    print("=" * 65)
    print("Generating NetSentinel Test PCAP Files")
    print("=" * 65)
    files = generate_pcaps()
    for fpath, count in files:
        size = fpath.stat().st_size
        print(f"  {fpath.name:<22} : {count:>4} packets, {size:>7} bytes ({fpath})")
    print("=" * 65)
    print("All test PCAP files successfully generated.")

if __name__ == "__main__":
    main()
