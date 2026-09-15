const { parsePhoneNumber } = require("libphonenumber-js");
const logger = require("./logger");

/**
 * Normalizes a raw phone string into E.164 international format.
 * Defaults to parsing with 'IN' country code (+91) if raw phone lacks international prefix (+).
 *
 * @param {string} rawPhone
 * @param {string} [defaultCountry="IN"]
 * @returns {string|null} E.164 formatted phone number or null
 */
function normalizeToE164(rawPhone, defaultCountry = "IN") {
  if (!rawPhone || typeof rawPhone !== "string") {
    return null;
  }

  try {
    const phoneNumber = parsePhoneNumber(rawPhone, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format("E.164");
    }
  } catch (err) {
    logger.warn(`libphonenumber-js parsing error for raw phone "${rawPhone}": ${err.message}`);
  }

  // Fallback E.164 normalization
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;
  return rawPhone.startsWith("+") ? rawPhone : `+${digits}`;
}

/**
 * Normalize phone number to last 10 digits for lookup / matching.
 */
function normPhone(p) {
  return (p || "").replace(/\D/g, "").slice(-10);
}

module.exports = {
  normalizeToE164,
  normPhone,
};
