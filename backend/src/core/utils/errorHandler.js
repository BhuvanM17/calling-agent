const logger = require("./logger");

// ── Custom Error Classes ────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(errors) {
    const message = typeof errors === "string" ? errors : "Validation Error";
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.errors = Array.isArray(errors) ? errors : [];
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
    this.statusCode = 404;
    this.resource = resource;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message || "Access forbidden");
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message || "Unauthorized");
    this.name = "UnauthorizedError";
    this.statusCode = 401;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message || "Resource already exists");
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

class BadRequestError extends Error {
  constructor(message) {
    super(message || "Bad request");
    this.name = "BadRequestError";
    this.statusCode = 400;
  }
}

// ── Detail helper — strip stack in production ──────────────────────────────

const buildDetails = (error) => {
  if (process.env.NODE_ENV === "production") {
    return { type: error.name };
  }
  return { message: error.message, stack: error.stack, name: error.name };
};

// ── Sub-handlers ───────────────────────────────────────────────────────────

const handleValidationErrors = (error, req, res) => {
  const errors = error.errors.map((err) => ({
    field: err.path || err.field,
    message: err.message,
  }));

  let message = error.message || "Validation Error";
  if (errors.length === 1) {
    message = errors[0].message;
  } else if (errors.length > 1) {
    message = `${errors[0].message} (and ${errors.length - 1} more errors)`;
  }

  logger.warn(`[${req.method}] ${req.url} - Validation Error`, { errors });

  res.status(400).json({
    success: false,
    type: "error",
    message,
    errors,
    details: buildDetails(error),
    statusCode: 400,
  });
};

const handleNotFoundError = (error, req, res) => {
  const message = error.message;
  logger.warn(`[${req.method}] ${req.url} - ${message}`);

  res.status(404).json({
    success: false,
    type: "error",
    message,
    details: buildDetails(error),
    statusCode: 404,
  });
};

const handleForbiddenError = (error, req, res) => {
  const message = error.message;
  logger.warn(`[${req.method}] ${req.url} - ${message}`);

  res.status(403).json({
    success: false,
    type: "error",
    message,
    details: buildDetails(error),
    statusCode: 403,
  });
};

const handleUnauthorizedError = (error, req, res) => {
  const message = error.message;
  logger.warn(`[${req.method}] ${req.url} - ${message}`);

  res.status(401).json({
    success: false,
    type: "error",
    message,
    details: buildDetails(error),
    statusCode: 401,
  });
};

// ── Main error handler (Express middleware) ────────────────────────────────

const errorHandler = (error, req, res, next) => {
  if (error instanceof ValidationError) return handleValidationErrors(error, req, res);
  if (error instanceof NotFoundError)   return handleNotFoundError(error, req, res);
  if (error instanceof ForbiddenError)  return handleForbiddenError(error, req, res);
  if (error instanceof UnauthorizedError) return handleUnauthorizedError(error, req, res);

  const statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";

  if (error.name === "SequelizeDatabaseError") {
    message = "A database error occurred. Please try again later.";
  } else if (error.name === "SequelizeForeignKeyConstraintError") {
    message = "Cannot perform this operation due to existing dependencies.";
  } else if (error.name === "SequelizeUniqueConstraintError") {
    message = "A record with this value already exists.";
  }

  logger.error(`[${req.method}] ${req.url} - ${message}`, { error: error.message });

  res.status(statusCode).json({
    success: false,
    type: "error",
    message,
    details: buildDetails(error),
    statusCode,
  });
};

module.exports = {
  errorHandler,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  BadRequestError,
};
