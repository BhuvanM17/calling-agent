const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const meta = {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
      ip: ip || req.connection.remoteAddress,
    };

    if (statusCode >= 500) {
      logger.error(`[${method}] ${originalUrl} ${statusCode} - ${duration}ms`, meta);
    } else if (statusCode >= 400) {
      logger.warn(`[${method}] ${originalUrl} ${statusCode} - ${duration}ms`, meta);
    } else {
      logger.info(`[${method}] ${originalUrl} ${statusCode} - ${duration}ms`, meta);
    }
  });

  next();
};

module.exports = { requestLogger };
