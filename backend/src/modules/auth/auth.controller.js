const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../core/database/models/user.model");
const logger = require("../../core/utils/logger");

/**
 * Login user and generate JWT token matching HubManage authentication specifications
 */
const login = async (req, res) => {
  try {
    const email = (req.body.email || req.body.user_email || "").trim().toLowerCase();
    const password = (req.body.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      where: { user_email: email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact administrator.",
      });
    }

    if (!user.password) {
      logger.warn(`User ${email} has no password set in database.`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const secretKey = (process.env.SECRET_KEY || process.env.JWT_SECRET || "").trim();
    if (!secretKey) {
      logger.error("SECRET_KEY is not defined in environment variables");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Authentication key missing.",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        user_email: user.user_email,
        role_name: user.role_name || "user",
      },
      secretKey,
      {
        expiresIn: "1d",
      }
    );

    const userData = {
      user_id: user.user_id,
      user_email: user.user_email,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.user_email,
      role_name: (user.role_name || "user").toLowerCase().trim(),
      status: user.status,
    };

    logger.info(`User authenticated successfully: ${user.user_email} (${user.role_name})`);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: userData,
    });
  } catch (error) {
    logger.error("Login controller error", { error: error.message });
    return res.status(500).json({
      success: false,
      message: "Authentication failed. Please try again.",
    });
  }
};

/**
 * Get current authenticated user profile
 */
const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

module.exports = {
  login,
  me,
};
