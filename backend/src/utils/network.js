/**
 * Network and datetime utility functions
 */

/**
 * Checks whether an IPv4 address belongs to RFC 1918 private, loopback, or link-local ranges.
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  if (typeof ip !== 'string') return false;

  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;

  const nums = [];
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255 || parts[i].trim() !== String(n)) {
      return false;
    }
    nums.push(n);
  }

  const [a, b] = nums;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local)
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Converts an ISO timestamp string or Date object to MySQL DATETIME(3) string in local time:
 * "YYYY-MM-DD HH:MM:SS.mmm"
 * @param {string|Date} isoString
 * @returns {string}
 */
function toMysqlDateTime(isoString) {
  let d = isoString instanceof Date ? isoString : new Date(isoString);
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

module.exports = {
  isPrivateIp,
  toMysqlDateTime,
};
