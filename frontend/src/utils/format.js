export function formatBytes(bytes, decimals = 1) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return (bytes / Math.pow(k, sizes.length - 1)).toFixed(dm) + ' ' + sizes[sizes.length - 1];
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

export function formatTime(date) {
  if (!date) return '--:--:--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--:--';
  return d.toTimeString().split(' ')[0];
}

export function timeAgo(date) {
  if (!date) return 'just now';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'recently';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function prettyAlertType(type) {
  if (!type) return 'Unknown Alert';
  const map = {
    syn_flood: 'SYN Flood',
    port_scan: 'Port Scan',
    icmp_flood: 'ICMP Flood',
    suspicious_dns: 'Suspicious DNS',
    suspicious_payload: 'Suspicious Payload',
    malformed_packet: 'Malformed Packet',
  };
  if (map[type]) return map[type];
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
