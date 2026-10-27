import time
import random
import string
import datetime
import threading

INTERNAL_HOSTS = [
    {"ip": "192.168.1.10", "mac": "aa:bb:cc:00:01:0a"},
    {"ip": "192.168.1.15", "mac": "aa:bb:cc:00:01:0f"},
    {"ip": "192.168.1.20", "mac": "aa:bb:cc:00:01:14"},
    {"ip": "192.168.1.25", "mac": "aa:bb:cc:00:01:19"},
    {"ip": "192.168.1.30", "mac": "aa:bb:cc:00:01:1e"},
]

EXTERNAL_SERVERS = [
    "142.250.190.46",
    "151.101.65.140",
    "104.16.249.249",
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
]

COMMON_TCP_PORTS = [443, 80, 22, 3306, 5000, 8080]
COMMON_DOMAINS = [
    "www.google.com",
    "api.github.com",
    "cdn.example.org",
    "registry.npmjs.org",
    "aws.amazon.com",
    "en.wikipedia.org",
]

ATTACK_PAYLOADS = [
    "GET /index.php?id=1' OR 1=1 -- HTTP/1.1\r\nHost: target\r\n",
    "POST /comment HTTP/1.1\r\nHost: target\r\n\r\n<script>alert(1)</script>",
    "GET /../../etc/passwd HTTP/1.1\r\nHost: target\r\n",
    "GET /search?q=UNION+SELECT+username,password+FROM+users HTTP/1.1\r\n",
]

class Simulator:
    """
    Synthetic network traffic simulator running in a background thread.
    Emits feature dictionaries matching extract_features format without sending real network packets.
    """

    def __init__(self, packet_queue, simulate_attacks=True):
        self.queue = packet_queue
        self.simulate_attacks = simulate_attacks
        self.stop_event = threading.Event()
        self.thread = None
        self.attack_thread = None

    def start(self):
        """Starts the simulator thread."""
        self.stop_event.clear()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print(f"[Simulator] Traffic simulator started (simulate_attacks={self.simulate_attacks})")

    def _get_timestamp(self):
        dt = datetime.datetime.now(datetime.timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    def _generate_normal_packet(self):
        """Generates a realistic benign network packet feature dict."""
        host = random.choice(INTERNAL_HOSTS)
        ext_ip = random.choice(EXTERNAL_SERVERS)
        is_outbound = random.random() > 0.45

        src_ip = host["ip"] if is_outbound else ext_ip
        dst_ip = ext_ip if is_outbound else host["ip"]
        src_mac = host["mac"] if is_outbound else None

        roll = random.random()
        if roll < 0.55:  # 55% TCP
            protocol = "TCP"
            src_port = random.randint(49152, 65535) if is_outbound else random.choice(COMMON_TCP_PORTS)
            dst_port = random.choice(COMMON_TCP_PORTS) if is_outbound else random.randint(49152, 65535)
            tcp_flags = random.choices(["PA", "A", "S", "SA", "FA"], weights=[0.60, 0.25, 0.05, 0.05, 0.05])[0]
            packet_size = random.randint(64, 1460)
            dns_query = None
            payload_preview = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n" if not is_outbound else ""
        elif roll < 0.80:  # 25% DNS
            protocol = "DNS"
            src_port = random.randint(49152, 65535) if is_outbound else 53
            dst_port = 53 if is_outbound else random.randint(49152, 65535)
            tcp_flags = None
            dns_query = random.choice(COMMON_DOMAINS)
            packet_size = random.randint(60, 180)
            payload_preview = ""
        elif roll < 0.92:  # 12% UDP
            protocol = "UDP"
            src_port = random.randint(49152, 65535)
            dst_port = random.choice([123, 5353, random.randint(10000, 60000)])
            tcp_flags = None
            dns_query = None
            packet_size = random.randint(60, 512)
            payload_preview = ""
        else:  # 8% ICMP
            protocol = "ICMP"
            src_port = None
            dst_port = None
            tcp_flags = None
            dns_query = None
            packet_size = 84
            payload_preview = ""

        return {
            "timestamp": self._get_timestamp(),
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
            "malformed_reason": None,
            "status": "normal",
        }

    def trigger_attack(self, name):
        """Triggers a specific attack sequence in a separate thread."""
        threading.Thread(target=self._execute_attack, args=(name,), daemon=True).start()

    def _execute_attack(self, name):
        """Generates realistic attack traffic sequences matching rule patterns."""
        target_host = random.choice(INTERNAL_HOSTS)
        target_ip = target_host["ip"]

        if name == "syn_flood":
            count = random.randint(150, 250)
            attacker_ip = f"10.10.10.{random.randint(2, 250)}"
            print(f"[Simulator] Executing SYN flood ({count} packets from {attacker_ip} -> {target_ip}:80)")
            for _ in range(count):
                if self.stop_event.is_set():
                    break
                pkt = {
                    "timestamp": self._get_timestamp(),
                    "src_ip": attacker_ip,
                    "dst_ip": target_ip,
                    "src_port": random.randint(1024, 65535),
                    "dst_port": 80,
                    "protocol": "TCP",
                    "packet_size": 60,
                    "tcp_flags": "S",
                    "src_mac": None,
                    "dns_query": None,
                    "payload_preview": "",
                    "malformed_reason": None,
                    "status": "normal",
                }
                self.queue.put(pkt)
                time.sleep(4.0 / count)

        elif name == "port_scan":
            count = random.randint(25, 40)
            attacker_ip = f"10.10.10.{random.randint(2, 250)}"
            print(f"[Simulator] Executing Port Scan ({count} ports from {attacker_ip} -> {target_ip})")
            ports = random.sample(range(1, 1024), count)
            for port in ports:
                if self.stop_event.is_set():
                    break
                pkt = {
                    "timestamp": self._get_timestamp(),
                    "src_ip": attacker_ip,
                    "dst_ip": target_ip,
                    "src_port": random.randint(49152, 65535),
                    "dst_port": port,
                    "protocol": "TCP",
                    "packet_size": 60,
                    "tcp_flags": "S",
                    "src_mac": None,
                    "dns_query": None,
                    "payload_preview": "",
                    "malformed_reason": None,
                    "status": "normal",
                }
                self.queue.put(pkt)
                time.sleep(4.0 / count)

        elif name == "icmp_flood":
            count = random.randint(150, 250)
            attacker_ip = f"10.10.10.{random.randint(2, 250)}"
            print(f"[Simulator] Executing ICMP flood ({count} packets from {attacker_ip} -> {target_ip})")
            for _ in range(count):
                if self.stop_event.is_set():
                    break
                pkt = {
                    "timestamp": self._get_timestamp(),
                    "src_ip": attacker_ip,
                    "dst_ip": target_ip,
                    "src_port": None,
                    "dst_port": None,
                    "protocol": "ICMP",
                    "packet_size": 84,
                    "tcp_flags": None,
                    "src_mac": None,
                    "dns_query": None,
                    "payload_preview": "",
                    "malformed_reason": None,
                    "status": "normal",
                }
                self.queue.put(pkt)
                time.sleep(4.0 / count)

        elif name == "dns_abuse":
            count = random.randint(60, 80)
            src_host = random.choice(INTERNAL_HOSTS)
            print(f"[Simulator] Executing DNS Abuse ({count} queries from {src_host['ip']})")
            for _ in range(count):
                if self.stop_event.is_set():
                    break
                is_tunnel = random.random() < 0.35
                if is_tunnel:
                    random_prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=68))
                    dns_q = f"{random_prefix}.tunnel.exfil-data.net"
                else:
                    dns_q = random.choice(COMMON_DOMAINS)

                pkt = {
                    "timestamp": self._get_timestamp(),
                    "src_ip": src_host["ip"],
                    "dst_ip": "8.8.8.8",
                    "src_port": random.randint(49152, 65535),
                    "dst_port": 53,
                    "protocol": "DNS",
                    "packet_size": 120,
                    "tcp_flags": None,
                    "src_mac": src_host["mac"],
                    "dns_query": dns_q,
                    "payload_preview": "",
                    "malformed_reason": None,
                    "status": "normal",
                }
                self.queue.put(pkt)
                time.sleep(10.0 / count)

        elif name == "payload":
            count = random.randint(1, 3)
            attacker_ip = f"203.0.113.{random.randint(10, 200)}"
            print(f"[Simulator] Executing Suspicious Payload ({count} packets from {attacker_ip} -> {target_ip}:80)")
            for _ in range(count):
                if self.stop_event.is_set():
                    break
                payload = random.choice(ATTACK_PAYLOADS)
                pkt = {
                    "timestamp": self._get_timestamp(),
                    "src_ip": attacker_ip,
                    "dst_ip": target_ip,
                    "src_port": random.randint(1024, 65535),
                    "dst_port": 80,
                    "protocol": "TCP",
                    "packet_size": 250,
                    "tcp_flags": "PA",
                    "src_mac": None,
                    "dns_query": None,
                    "payload_preview": payload[:300],
                    "malformed_reason": None,
                    "status": "normal",
                }
                self.queue.put(pkt)
                time.sleep(0.5)

        elif name == "malformed":
            count = random.randint(1, 3)
            attacker_ip = f"203.0.113.{random.randint(10, 200)}"
            print(f"[Simulator] Executing Malformed Packet ({count} packets from {attacker_ip} -> {target_ip})")
            for _ in range(count):
                if self.stop_event.is_set():
                    break
                pkt = {
                    "timestamp": self._get_timestamp(),
                    "src_ip": attacker_ip,
                    "dst_ip": target_ip,
                    "src_port": random.randint(1024, 65535),
                    "dst_port": random.choice(COMMON_TCP_PORTS),
                    "protocol": "TCP",
                    "packet_size": 60,
                    "tcp_flags": "FPU",
                    "src_mac": None,
                    "dns_query": None,
                    "payload_preview": "",
                    "malformed_reason": "TCP XMAS flags",
                    "status": "normal",
                }
                self.queue.put(pkt)
                time.sleep(0.5)

    def _run_loop(self):
        """Main simulation loop generating packets and scheduling attacks."""
        attack_types = ["syn_flood", "port_scan", "icmp_flood", "dns_abuse", "payload", "malformed"]
        next_attack_time = time.time() + 4.0

        while not self.stop_event.is_set():
            # Target 20-30 packets/second
            target_pps = random.randint(18, 35)
            delay = 1.0 / target_pps

            pkt = self._generate_normal_packet()
            self.queue.put(pkt)

            # Attack generation if enabled
            if self.simulate_attacks and time.time() >= next_attack_time:
                chosen_attack = random.choice(attack_types)
                self.trigger_attack(chosen_attack)
                next_attack_time = time.time() + random.uniform(8.0, 14.0)

            time.sleep(delay)

    def stop(self):
        """Stops the simulator."""
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        print("[Simulator] Stopped traffic simulator.")
