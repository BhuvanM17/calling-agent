const crypto = require("crypto");
const { env } = require("../config/env.config");
const logger = require("../utils/logger");

/**
 * Validates Meta (Facebook/Instagram) HMAC-SHA256 signature on incoming webhook POSTs.
 */
function verifyMetaSignature(req, res, next) {
  const signature = req.headers["x-hub-signature-256"];
  const appSecret = env.META_APP_SECRET;

  if (!appSecret || appSecret.startsWith("your_")) {
    return next();
  }

  if (!signature) {
    logger.warn("Meta Webhook: Missing X-Hub-Signature-256 header");
    return res.status(401).json({ error: "Missing signature header" });
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.warn("Meta Webhook: rawBody unavailable for signature check");
    return res.status(400).json({ error: "Raw body unavailable" });
  }

  const expectedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );

    if (!valid) {
      logger.warn("Meta Webhook: Invalid HMAC signature match");
      return res.status(403).json({ error: "Invalid signature" });
    }
  } catch (err) {
    logger.warn("Meta Webhook: Error during signature comparison", { error: err.message });
    return res.status(403).json({ error: "Signature verification failed" });
  }

  next();
}

module.exports = {
  verifyMetaSignature,
};
