import { ApiError } from "../utils/api_error.util.js";

export const validate_request = (schema_validator, source = "body") => {
  return (req, res, next) => {
    try {
      const data_to_validate = req[source];

      if (!schema_validator || typeof schema_validator !== "function") {
        return next();
      }

      const { error, value } = schema_validator(data_to_validate);

      if (error) {
        const issues = Array.isArray(error)
          ? error
          : [{ message: error.message || "Validation failed" }];

        return next(
          new ApiError(
            422,
            "VALIDATION_ERROR",
            "Request validation failed. Verify your input parameters.",
            issues
          )
        );
      }

      req[source] = value !== undefined ? value : req[source];
      next();
    } catch (err) {
      next(err);
    }
  };
};