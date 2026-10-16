import { ApiError } from "../utils/api_error.util.js";
import { send_error_response } from "../utils/response.util.js";
import { env_config } from "../config/env.config.js";

export const not_found_handler = (req, res, next) => {
  next(
    ApiError.not_found(`Route not found on this server: ${req.method} ${req.originalUrl}`)
  );
};

export const global_error_handler = (err, req, res, next) => {
  let status_code = err.status_code || 500;
  let error_code = err.error_code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred.";
  let details = err.details || [];

  // PostgreSQL Unique Key Constraint Violation
  if (err.code === "23505") {
    status_code = 409;
    error_code = "DUPLICATE_RESOURCE";
    message = "A resource with identical unique attributes already exists.";
    details = [{ constraint: err.constraint, detail: err.detail }];
  }

  // PostgreSQL Foreign Key Violation
  if (err.code === "23503") {
    status_code = 400;
    error_code = "FOREIGN_KEY_VIOLATION";
    message = "Related dependent entity does not exist.";
    details = [{ constraint: err.constraint, detail: err.detail }];
  }

  // PostgreSQL Invalid Input Syntax (e.g., malformed UUID)
  if (err.code === "22P02") {
    status_code = 400;
    error_code = "INVALID_DATA_TYPE";
    message = "Malformed parameter or invalid UUID syntax.";
    details = [{ detail: err.message }];
  }

  // JSON Web Token Parsing Errors
  if (err.name === "JsonWebTokenError") {
    status_code = 401;
    error_code = "INVALID_TOKEN";
    message = "Invalid authentication token signature.";
  }

  if (err.name === "TokenExpiredError") {
    status_code = 401;
    error_code = "TOKEN_EXPIRED";
    message = "Authentication token has expired.";
  }

  if (env_config.node_env !== "production" && status_code === 500) {
    console.error("[INTERNAL EXCEPTION]", err);
  }

  return send_error_response(res, {
    status_code,
    error_code,
    message,
    details,
  });
};