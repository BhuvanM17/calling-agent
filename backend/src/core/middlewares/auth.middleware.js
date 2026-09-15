const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const User = require("../database/models/user.model");

const sendUnauthorized = (res, message) => {
  res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
  return res.status(401).json({
    status: 401,
    success: false,
    message,
    type: "error",
    userFriendlyMessage: message,
  });
};

const sendForbidden = (res, message) => {
  return res.status(403).json({
    status: 403,
    success: false,
    message,
    type: "error",
    userFriendlyMessage: message,
  });
};

/**
 * Authentication Middleware
 * Supports:
 * 1. Server-to-Server communication via `X-Internal-API-Key`
 * 2. Client Single Sign-On (SSO) via JWT `Authorization: Bearer <token>`
 * 3. Graceful development fallback for local dashboard if configured
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Check Server-to-Server Internal API Key
    const internalKey = req.header("X-Internal-API-Key") || req.header("x-internal-api-key");
    const configuredInternalKey = process.env.INTERNAL_SERVICE_KEY;

    if (configuredInternalKey && internalKey && internalKey.trim() === configuredInternalKey.trim()) {
      req.user = {
        user_id: "SYSTEM_INTERNAL",
        user_email: "system@bizzhub.internal",
        role_name: "super-admin",
        name: "System Internal Service",
        is_internal: true,
      };
      return next();
    }

    // 2. Check Bearer JWT Token
    const authHeader = (req.header("Authorization") || "").trim();

    if (!authHeader) {
      // If dev mode and no token provided, grant admin access for local testing if explicitly allowed
      if (process.env.ALLOW_ANONYMOUS_DEV === "true" || (!process.env.SECRET_KEY && process.env.NODE_ENV !== "production")) {
        req.user = {
          user_id: "DEV_ADMIN",
          user_email: "admin@bizzhub.com",
          role_name: "super-admin",
          name: "Dev Admin",
          is_dev: true,
        };
        return next();
      }
      return sendUnauthorized(res, "Access denied. No token provided.");
    }

    const token = authHeader.replace(/^[Bb]earer\s+/i, "").trim();
    if (!token) {
      return sendUnauthorized(res, "Access denied. Invalid token format.");
    }

    const secretKey = (process.env.SECRET_KEY || process.env.JWT_SECRET || "").trim();
    if (!secretKey) {
      logger.error("SECRET_KEY is not defined in environment variables");
      return res.status(500).json({ message: "Server configuration error: Authentication key missing." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return sendUnauthorized(res, "Token has expired. Please login again.");
      }
      return sendUnauthorized(res, "Invalid token. Please login again.");
    }

    if (!decoded || (!decoded.user_id && !decoded.id && !decoded.user_email)) {
      return sendUnauthorized(res, "Invalid token payload.");
    }

    const userId = decoded.user_id || decoded.id;
    const userEmail = decoded.user_email || decoded.email;

    // Fetch user from shared DB if available
    let dbUser = null;
    try {
      if (userId) {
        dbUser = await User.findOne({ where: { user_id: userId } });
      } else if (userEmail) {
        dbUser = await User.findOne({ where: { user_email: userEmail } });
      }
    } catch (dbErr) {
      logger.warn(`Could not query user from database: ${dbErr.message}`);
    }

    if (dbUser) {
      if (dbUser.status && dbUser.status !== "active") {
        return sendForbidden(res, "User account is inactive. Please contact administrator.");
      }

      req.user = {
        user_id: dbUser.user_id,
        user_email: dbUser.user_email,
        role_name: (dbUser.role_name || "user").toLowerCase().trim(),
        first_name: dbUser.first_name || "",
        last_name: dbUser.last_name || "",
        name: `${dbUser.first_name || ""} ${dbUser.last_name || ""}`.trim() || dbUser.user_email,
      };
    } else {
      // Use claims from token directly
      req.user = {
        user_id: userId || "UNKNOWN",
        user_email: userEmail || "",
        role_name: (decoded.role_name || decoded.role || "user").toLowerCase().trim(),
        name: decoded.name || userEmail || "User",
      };
    }

    next();
  } catch (error) {
    logger.error("Authentication middleware error", { error: error.message });
    return res.status(500).json({ message: "Authentication failed." });
  }
};

/**
 * Role Authorization Middleware
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, "Authentication required.");
    }

    const userRole = (req.user.role_name || "").toLowerCase().trim();
    const allowed = roles.map((r) => r.toLowerCase().trim());

    if (!allowed.includes(userRole)) {
      return sendForbidden(
        res,
        `Forbidden: Role '${req.user.role_name}' does not have permission to perform this action.`
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};
