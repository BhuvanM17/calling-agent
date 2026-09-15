const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const hpp = require("hpp");
const xss = require("xss-clean");

dotenv.config();

const { sequelize } = require("./core/database");
const mainRouter = require("./routes");
const { webhookRoutes } = require("./modules/webhooks");
const { errorHandler } = require("./core/utils/errorHandler");
const { requestLogger } = require("./core/middlewares/requestLogger");
const logger = require("./core/utils/logger");
const { validateEnv } = require("./core/config/env.config");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// Validate required environment configurations
try {
  validateEnv();
  logger.info("Environment configuration validated successfully");
} catch (envErr) {
  logger.warn(`Environment warning: ${envErr.message}`);
}

// Helmet Security Headers
app.use(
  helmet({
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        }
      : false,
    hsts: IS_PRODUCTION
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  })
);

// CORS configuration (supports local frontend, dashboard, and webhook providers)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Hub-Signature-256",
      "X-Response-Format",
    ],
    maxAge: 86400,
  })
);

// HTTP Compression
app.use(
  compression({
    level: IS_PRODUCTION ? 6 : 1,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

// Serve dashboard static assets from public/ directory
app.use(
  express.static(path.join(__dirname, "../public"), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  })
);

// Body Parser with rawBody preservation for webhook HMAC verification
app.use(
  express.json({
    limit: process.env.JSON_LIMIT || "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URL_ENCODED_LIMIT || "50mb",
    parameterLimit: 1000,
  })
);

// Data sanitization against XSS and parameter pollution
app.use(xss());
app.use(hpp());

// HTTP Request logging middleware
app.use(requestLogger);

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: "connected",
  });
});

// Disable ETag caching on dynamic API routes so clients never receive 304 on stale data
app.set("etag", false);

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Mount Routes
try {
  app.use("/api", mainRouter);
  app.use("/webhooks", webhookRoutes);
  logger.info("API & Webhook routes mounted successfully.");
} catch (routeSetupError) {
  logger.error("Error setting up routes:", { error: routeSetupError.message });
  process.exit(1);
}

// 404 Route Handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Centralized error handler
app.use(errorHandler);

// Database connection with retry mechanism
const connectWithRetry = async (maxRetries = 10, baseDelay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info(`✓ Database connected successfully (attempt ${attempt})`);
      return true;
    } catch (error) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      logger.error(
        `✗ Database connection failed (attempt ${attempt}/${maxRetries}): ${error.message}`
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Database connection failed after ${maxRetries} attempts: ${error.message}`
        );
      }

      logger.info(`Retrying database connection in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Graceful shutdown handler
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    server.close((err) => {
      logger.info("HTTP server closed.");

      sequelize
        .close()
        .then(() => {
          logger.info("Database connection closed.");
          process.exit(err ? 1 : 0);
        })
        .catch((dbErr) => {
          logger.error("Error closing database connection:", { error: dbErr.message });
          process.exit(1);
        });
    });

    setTimeout(() => {
      logger.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

// Start Server & Sync Database
(async () => {
  try {
    await connectWithRetry();

    const { ensureAssignmentColumns } = require("./core/database/initColumns");
    await ensureAssignmentColumns();

    const syncOptions = IS_PRODUCTION ? { alter: false, force: false } : { alter: false };
    await sequelize.sync(syncOptions);
    logger.info("✓ Database models synced successfully");

    const server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Server running on port ${PORT} (${NODE_ENV} mode)`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`📋 Dashboard available at http://localhost:${PORT}/`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else {
        logger.error("❌ Server error:", { error: error.message });
      }
      process.exit(1);
    });

    gracefulShutdown(server);
  } catch (error) {
    logger.error("❌ Critical startup error:", { error: error.message });
    process.exit(1);
  }
})();

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", { reason });
  process.exit(1);
});

module.exports = app;
