export class ApiError extends Error {
  constructor(status_code, error_code, message, details = []) {
    super(message);
    this.status_code = status_code;
    this.error_code = error_code;
    this.details = details;
    this.is_operational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static bad_request(message = "Bad request", details = []) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized access", details = []) {
    return new ApiError(401, "UNAUTHORIZED_ACCESS", message, details);
  }

  static forbidden(message = "Forbidden resource", details = []) {
    return new ApiError(403, "FORBIDDEN", message, details);
  }

  static not_found(message = "Resource not found", details = []) {
    return new ApiError(404, "NOT_FOUND", message, details);
  }

  static conflict(message = "Conflict detected", details = []) {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static unprocessable_entity(message = "Unprocessable entity", details = []) {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message, []);
  }
}