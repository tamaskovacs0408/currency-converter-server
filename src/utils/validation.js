/**
 * Validate currency code format
 * @param {string} code - Currency code to validate
 * @returns {boolean}
 */
export function validateCurrencyCode(code) {
  return /^[A-Z]{3}$/.test(code);
}

/**
 * Validate amount
 * @param {number} amount - Amount to validate
 * @returns {boolean}
 */
export function validateAmount(amount) {
  return !isNaN(amount) && amount > 0 && amount < 1000000000;
}
