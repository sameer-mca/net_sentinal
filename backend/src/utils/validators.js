/**
 * Validation helpers for NetSentinel
 */

function isEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function isStrongPassword(password) {
  if (typeof password !== 'string') return false;
  // Min 8 characters with at least one letter and one number
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

function isIn(value, allowedArray) {
  if (!Array.isArray(allowedArray)) return false;
  return allowedArray.includes(value);
}

module.exports = {
  isEmail,
  isStrongPassword,
  isIn
};
