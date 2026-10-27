const crypto = require('crypto');

/**
 * Returns the SHA-256 hex digest of the given input string.
 * @param {string} text
 * @returns {string}
 */
function sha256(text) {
  if (typeof text !== 'string') {
    text = String(text || '');
  }
  return crypto.createHash('sha256').update(text).digest('hex');
}

module.exports = {
  sha256
};
