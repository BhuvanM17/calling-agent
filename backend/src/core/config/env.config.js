const dotenv = require("dotenv");

dotenv.config();

function validateEnv() {
  const baseRequired = [
    "DB_NAME",
    "DB_USER",
    "DB_HOST",
    "BOLNA_API_KEY",
    "BOLNA_AGENT_ID",
  ];

  const missing = baseRequired.filter(
    (varName) => !process.env[varName] || process.env[varName].startsWith("your_")
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CALLING_PROVIDER: "bolna",

  // MySQL Database Configuration
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_NAME: process.env.DB_NAME || "hubmanage",
  DB_PORT: process.env.DB_PORT || 3306,
  DB_DIALECT: process.env.DB_DIALECT || "mysql",

  // Meta Webhook & Graph API
  META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,

  // Agent & Company Display Names (Optional)
  ASSISTANT_NAME: process.env.ASSISTANT_NAME || "Sophia",
  COMPANY_NAME: process.env.COMPANY_NAME || "BizzHub",

  // Bolna AI Credentials
  BOLNA_API_KEY: process.env.BOLNA_API_KEY,
  BOLNA_AGENT_ID: process.env.BOLNA_AGENT_ID,
  BOLNA_FROM_NUMBER: process.env.BOLNA_FROM_NUMBER || "",

  // AI Service Credentials
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  YOUR_NAME: process.env.YOUR_NAME || "BizzHub Advisor",
  YOUR_PHONE: process.env.YOUR_PHONE || "+91 96867 65227",
};

module.exports = {
  env,
  validateEnv,
};
