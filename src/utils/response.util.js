export const send_success_response = (
  res,
  { status_code = 200, message = "Resource processed successfully", data = {}, meta = null }
) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== null && typeof meta === "object") {
    payload.meta = meta;
  }

  return res.status(status_code).json(payload);
};

export const send_error_response = (
  res,
  {
    status_code = 500,
    error_code = "INTERNAL_SERVER_ERROR",
    message = "An unexpected error occurred.",
    details = [],
  }
) => {
  return res.status(status_code).json({
    success: false,
    error: {
      code: error_code,
      message,
      details: Array.isArray(details) ? details : [details],
    },
  });
};