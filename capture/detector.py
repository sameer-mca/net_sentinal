import re
import time
import urllib.parse
import datetime
from collections import defaultdict, deque

# Compiled signature patterns for payload inspection
PAYLOAD_SIGNATURES = [
    ("SQL Injection", [
        re.compile(r"(\bunion\b.+\bselect\b)", re.IGNORECASE),
        re.compile(r"(\bor\b\s+1\s*=\s*1)", re.IGNORECASE),
        re.compile(r"('\s*or\s*'1'\s*=\s*'1)", re.IGNORECASE),
        re.compile(r"(;\s*drop\s+table)", re.IGNORECASE),
        re.compile(r"(--\s*$|--\s+)", re.IGNORECASE),
    ]),
    ("XSS", [
        re.compile(r"<script", re.IGNORECASE),
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"onerror\s*=", re.IGNORECASE),
    ]),
    ("Path Traversal", [
        re.compile(r"\.\./\.\./", re.IGNORECASE),
        re.compile(r"/etc/passwd", re.IGNORECASE),
        re.compile(r"\\windows\\system32", re.IGNORECASE),
    ]),
    ("Command Injection", [
        re.compile(r"(;|\|\||&&)\s*(cat|ls|wget|curl|nc|bash|powershell|cmd)\b", re.IGNORECASE),
        re.compile(r"cmd\.exe", re.IGNORECASE),
    ]),
]

class Detector:
    """
    Rule-based intrusion detection engine.
    Maintains sliding time windows and cooldown trackers to evaluate packets
    against detection rules retrieved dynamically from the backend.
    """

    def __init__(self, now_fn=time.time):
        self.now_fn = now_fn
        self.rules = {}  # attack_type -> rule dict
        self.cooldowns = {}  # (attack_type, src_ip) -> last_alert_time
        self.windows = {
            "syn_flood": defaultdict(deque),
            "port_scan": defaultdict(deque),
            "icmp_flood": defaultdict(deque),
            "dns_query": defaultdict(deque),
            "dns_long": defaultdict(deque),
        }
        self.last_cleanup_time = self.now_fn()
        self.logged_errors = set()

    def update_rules(self, rules_list):
        """
        Replaces the active rules dictionary keyed by attack_type.
        Only active rules are loaded.
        """
        new_rules = {}
        for r in rules_list:
            if not r or not isinstance(r, dict):
                continue
            if not r.get("is_active", True):
                continue
            attack_type = r.get("attack_type")
            if not attack_type:
                continue

            new_rules[attack_type] = {
                "id": int(r.get("id")),
                "rule_name": r.get("rule_name", attack_type),
                "attack_type": attack_type,
                "threshold_value": float(r.get("threshold_value", 1)),
                "time_window": int(r.get("time_window", 10)),
                "severity": str(r.get("severity", "medium")).lower(),
                "is_active": True,
                "description": r.get("description", ""),
            }

        # Only log when rules actually change or initial load
        if new_rules != self.rules:
            rule_summaries = [f"{k}(thr={v['threshold_value']}, win={v['time_window']}s)" for k, v in new_rules.items()]
            print(f"[Detector] Detection rules updated ({len(new_rules)} active): {', '.join(rule_summaries)}")
            self.rules = new_rules

    def _prune(self, window_deque, cutoff_time):
        """Removes entries older than cutoff_time from the left of the deque."""
        while window_deque and window_deque[0][0] < cutoff_time:
            window_deque.popleft()

    def _check_cooldown(self, attack_type, src_ip, now):
        """
        Checks if cooldown of 30 seconds has elapsed for (attack_type, src_ip).
        Returns True if alert is allowed to fire, False if in cooldown.
        """
        key = (attack_type, src_ip)
        last_time = self.cooldowns.get(key, 0)
        if now - last_time < 30.0:
            return False
        self.cooldowns[key] = now
        return True

    def _cleanup_old_keys(self, now):
        """Periodically cleans up idle sliding windows and stale cooldowns."""
        for window_dict in self.windows.values():
            keys_to_remove = []
            for k, deq in list(window_dict.items()):
                if not deq or (deq and now - deq[-1][0] > 120.0):
                    keys_to_remove.append(k)
            for k in keys_to_remove:
                window_dict.pop(k, None)

        # Clean cooldowns older than 60s
        stale_cooldowns = [k for k, ts in self.cooldowns.items() if now - ts > 60.0]
        for k in stale_cooldowns:
            self.cooldowns.pop(k, None)

    def process(self, packet):
        """
        Evaluates a single packet feature dictionary against all active rules.
        Returns a list of generated alert dictionaries.
        Sets packet['status'] = 'suspicious' if an alert is triggered.
        """
        alerts = []
        now = self.now_fn()

        # Periodic cleanup every 60 seconds
        if now - self.last_cleanup_time >= 60.0:
            self._cleanup_old_keys(now)
            self.last_cleanup_time = now

        src_ip = packet.get("src_ip")
        dst_ip = packet.get("dst_ip")
        protocol = packet.get("protocol")

        if not src_ip:
            return alerts

        try:
            timestamp_iso = datetime.datetime.fromtimestamp(now, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        except Exception:
            timestamp_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        # ---------------------------------------------------------------------
        # Rule 1: SYN Flood
        # ---------------------------------------------------------------------
        syn_rule = self.rules.get("syn_flood")
        if syn_rule and protocol == "TCP":
            flags = packet.get("tcp_flags") or ""
            if "S" in flags and "A" not in flags:
                win = self.windows["syn_flood"][src_ip]
                win.append((now, 1))
                self._prune(win, now - syn_rule["time_window"])

                if len(win) >= syn_rule["threshold_value"]:
                    if self._check_cooldown("syn_flood", src_ip, now):
                        packet["status"] = "suspicious"
                        alerts.append({
                            "timestamp": timestamp_iso,
                            "rule_id": syn_rule["id"],
                            "alert_type": "syn_flood",
                            "severity": syn_rule["severity"],
                            "source_ip": src_ip,
                            "destination_ip": dst_ip,
                            "description": f"SYN flood suspected: {len(win)} SYN packets from {src_ip} to {dst_ip} in {syn_rule['time_window']}s",
                        })

        # ---------------------------------------------------------------------
        # Rule 2: Port Scan
        # ---------------------------------------------------------------------
        scan_rule = self.rules.get("port_scan")
        if scan_rule and protocol == "TCP":
            flags = packet.get("tcp_flags") or ""
            if "S" in flags and "A" not in flags:
                dst_port = packet.get("dst_port")
                scan_key = (src_ip, dst_ip)
                win = self.windows["port_scan"][scan_key]
                win.append((now, dst_port))
                self._prune(win, now - scan_rule["time_window"])

                distinct_ports = {p for _, p in win if p is not None}
                if len(distinct_ports) >= scan_rule["threshold_value"]:
                    if self._check_cooldown("port_scan", src_ip, now):
                        packet["status"] = "suspicious"
                        alerts.append({
                            "timestamp": timestamp_iso,
                            "rule_id": scan_rule["id"],
                            "alert_type": "port_scan",
                            "severity": scan_rule["severity"],
                            "source_ip": src_ip,
                            "destination_ip": dst_ip,
                            "description": f"Port scan suspected: {src_ip} probed {len(distinct_ports)} distinct ports on {dst_ip} in {scan_rule['time_window']}s",
                        })

        # ---------------------------------------------------------------------
        # Rule 3: ICMP Flood
        # ---------------------------------------------------------------------
        icmp_rule = self.rules.get("icmp_flood")
        if icmp_rule and protocol == "ICMP":
            win = self.windows["icmp_flood"][src_ip]
            win.append((now, 1))
            self._prune(win, now - icmp_rule["time_window"])

            if len(win) >= icmp_rule["threshold_value"]:
                if self._check_cooldown("icmp_flood", src_ip, now):
                    packet["status"] = "suspicious"
                    alerts.append({
                        "timestamp": timestamp_iso,
                        "rule_id": icmp_rule["id"],
                        "alert_type": "icmp_flood",
                        "severity": icmp_rule["severity"],
                        "source_ip": src_ip,
                        "destination_ip": dst_ip,
                        "description": f"ICMP flood suspected: {len(win)} ICMP packets from {src_ip} in {icmp_rule['time_window']}s",
                    })

        # ---------------------------------------------------------------------
        # Rule 4: Suspicious DNS
        # ---------------------------------------------------------------------
        dns_rule = self.rules.get("suspicious_dns")
        if dns_rule and protocol == "DNS" and packet.get("dst_port") == 53:
            # Trigger A: Count of queries in window
            win = self.windows["dns_query"][src_ip]
            win.append((now, 1))
            self._prune(win, now - dns_rule["time_window"])
            trigger_a = len(win) >= dns_rule["threshold_value"]

            # Trigger B: Length or label length anomalies (requires 3 in window)
            dns_query = packet.get("dns_query") or ""
            labels = dns_query.split(".")
            longest_label = max((len(lbl) for lbl in labels), default=0)
            is_anomaly = len(dns_query) > 60 or longest_label > 40

            long_win = self.windows["dns_long"][src_ip]
            if is_anomaly:
                long_win.append((now, dns_query))
            self._prune(long_win, now - dns_rule["time_window"])
            trigger_b = len(long_win) >= 3

            if trigger_a or trigger_b:
                if self._check_cooldown("suspicious_dns", src_ip, now):
                    if trigger_a and trigger_b:
                        desc = f"Suspicious DNS query volume ({len(win)} queries) and long domain names from {src_ip} in {dns_rule['time_window']}s"
                    elif trigger_a:
                        desc = f"Suspicious DNS query volume: {len(win)} queries from {src_ip} in {dns_rule['time_window']}s"
                    else:
                        desc = f"Suspicious DNS tunneling behavior: {len(long_win)} high-length domain queries from {src_ip} in {dns_rule['time_window']}s"

                    packet["status"] = "suspicious"
                    alerts.append({
                        "timestamp": timestamp_iso,
                        "rule_id": dns_rule["id"],
                        "alert_type": "suspicious_dns",
                        "severity": dns_rule["severity"],
                        "source_ip": src_ip,
                        "destination_ip": dst_ip,
                        "description": desc,
                    })

        # ---------------------------------------------------------------------
        # Rule 5: Suspicious Payload
        # ---------------------------------------------------------------------
        payload_rule = self.rules.get("suspicious_payload")
        if payload_rule and protocol in ("TCP", "UDP"):
            raw_payload = packet.get("payload_preview") or ""
            if raw_payload:
                decoded = urllib.parse.unquote(raw_payload)
                lowered = decoded.lower()

                matched_category = None
                for category, patterns in PAYLOAD_SIGNATURES:
                    if any(p.search(lowered) for p in patterns):
                        matched_category = category
                        break

                if matched_category:
                    if self._check_cooldown("suspicious_payload", src_ip, now):
                        # Truncate first 60 chars and replace non-printable with '.'
                        snippet = "".join(c if 32 <= ord(c) < 127 else "." for c in raw_payload[:60])
                        dst_port_str = f":{packet.get('dst_port')}" if packet.get("dst_port") else ""

                        packet["status"] = "suspicious"
                        alerts.append({
                            "timestamp": timestamp_iso,
                            "rule_id": payload_rule["id"],
                            "alert_type": "suspicious_payload",
                            "severity": payload_rule["severity"],
                            "source_ip": src_ip,
                            "destination_ip": dst_ip,
                            "description": f"Suspicious payload ({matched_category}) from {src_ip} to {dst_ip}{dst_port_str}: {snippet}",
                        })

        # ---------------------------------------------------------------------
        # Rule 6: Malformed Packet
        # ---------------------------------------------------------------------
        malformed_rule = self.rules.get("malformed_packet")
        if malformed_rule:
            malformed_reason = packet.get("malformed_reason")
            if malformed_reason:
                if self._check_cooldown("malformed_packet", src_ip, now):
                    packet["status"] = "suspicious"
                    alerts.append({
                        "timestamp": timestamp_iso,
                        "rule_id": malformed_rule["id"],
                        "alert_type": "malformed_packet",
                        "severity": malformed_rule["severity"],
                        "source_ip": src_ip,
                        "destination_ip": dst_ip,
                        "description": f"Malformed packet from {src_ip}: {malformed_reason}",
                    })

        return alerts
