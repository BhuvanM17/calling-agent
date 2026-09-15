/**
 * Standardized response helper matching HubManage backend pattern.
 */
const formatResponse = (
  status,
  success,
  message,
  type,
  userFriendlyMessage,
  data = null,
  details = null
) => {
  const response = {
    success,
    message,
    type,
    userFriendlyMessage,
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  if (details !== null && details !== undefined) {
    response.details = details;
  }

  return { status, response };
};

const handleError = (error, action = "processing request") => {
  if (error.name === "SequelizeValidationError") {
    const validationErrors = error.errors ? error.errors.map((err) => err.message) : [error.message];
    return formatResponse(
      400,
      false,
      "Validation error",
      "error",
      "Please check the input data for errors.",
      null,
      validationErrors
    );
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return formatResponse(
      409,
      false,
      "Duplicate entry",
      "error",
      "A record with this identifier or phone already exists.",
      null,
      error.errors ? error.errors.map((e) => e.message) : [error.message]
    );
  }

  return formatResponse(
    500,
    false,
    error.message || `Error ${action}`,
    "error",
    `An unexpected error occurred while ${action}.`,
    null,
    process.env.NODE_ENV === "production" ? null : error.stack
  );
};

module.exports = {
  formatResponse,
  handleError,
};
