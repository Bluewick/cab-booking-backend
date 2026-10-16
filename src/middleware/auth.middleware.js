import jwt from "jsonwebtoken";
import { env_config } from "../config/env.config.js";
import { send_error_response } from "../utils/response.util.js";

export const authenticate_user = (req, res, next) => {
  try {
    const auth_header = req.headers.authorization;

    if (!auth_header) {
      return send_error_response(res, {
        status_code: 401,
        error_code: "UNAUTHORIZED_ACCESS",
        message: "Authorization header missing.",
      });
    }

    if (!auth_header.startsWith("Bearer ")) {
      return send_error_response(res, {
        status_code: 401,
        error_code: "INVALID_TOKEN_FORMAT",
        message: "Invalid authorization format. Must be Bearer token.",
      });
    }

    const token = auth_header.split(" ")[1];

    if (!token) {
      return send_error_response(res, {
        status_code: 401,
        error_code: "TOKEN_MISSING",
        message: "Authentication token missing.",
      });
    }

    const decoded = jwt.verify(token, env_config.jwt_secret);
    req.user = decoded;

    next();
  } catch (error) {
    return send_error_response(res, {
      status_code: 401,
      error_code: "UNAUTHORIZED_ACCESS",
      message: "Invalid or expired token.",
      details: [error.message],
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return send_error_response(res, {
        status_code: 401,
        error_code: "UNAUTHORIZED_ACCESS",
        message: "Unauthorized. Authentication is required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return send_error_response(res, {
        status_code: 403,
        error_code: "FORBIDDEN",
        message: `Forbidden. Role '${req.user.role}' lacks permission for this action.`,
      });
    }

    next();
  };
};