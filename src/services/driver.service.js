import * as driver_model from "../models/driver.model.js";
import * as user_model from "../models/user.model.js";
import { ApiError } from "../utils/api_error.util.js";
import { emit_to_user } from "../socket/socket.server.js";

export const register_driver = async (user_id, payload) => {
  const { license_number, make, model, plate_number, color, vehicle_category = "standard" } = payload;

  if (!license_number || !make || !model || !plate_number || !color) {
    throw ApiError.bad_request(
      "Missing required driver or vehicle attributes (license_number, make, model, plate_number, color)."
    );
  }

  const existing_driver = await driver_model.find_driver_by_user_id(user_id);
  if (existing_driver) {
    throw ApiError.conflict("User is already registered as a driver.");
  }

  return await driver_model.register_driver_transactional({
    user_id,
    license_number,
    make,
    model,
    plate_number,
    color,
    vehicle_category,
  });
};

export const get_driver_profile = async (user_id) => {
  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.not_found("Driver profile not found for this account.");
  }
  return driver;
};

export const update_status = async (user_id, { is_online, current_latitude, current_longitude }) => {
  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.not_found("Driver profile not found.");
  }

  if (is_online === true && !driver.is_verified) {
    throw ApiError.forbidden("Cannot toggle online status until driver profile has been verified by administration.");
  }

  const updated = await driver_model.update_driver_status(driver.driver_id, {
    is_online,
    current_latitude,
    current_longitude,
  });

  return updated;
};

export const list_drivers_admin = async ({ is_verified, search, page = 1, limit = 10 }) => {
  const parsed_page = Math.max(parseInt(page, 10) || 1, 1);
  const parsed_limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const offset = (parsed_page - 1) * parsed_limit;

  let verified_filter;
  if (is_verified !== undefined && is_verified !== null && is_verified !== "" && is_verified !== "all") {
    if (typeof is_verified === "boolean") {
      verified_filter = is_verified;
    } else {
      const lower = String(is_verified).toLowerCase();
      if (lower === "true" || lower === "verified") {
        verified_filter = true;
      } else if (lower === "false" || lower === "pending" || lower === "unverified") {
        verified_filter = false;
      }
    }
  }

  const { drivers, total } = await driver_model.list_drivers({
    is_verified: verified_filter,
    search,
    limit: parsed_limit,
    offset,
  });

  return {
    drivers,
    meta: {
      page: parsed_page,
      limit: parsed_limit,
      total,
      total_pages: Math.ceil(total / parsed_limit) || 1,
    },
  };
};

export const get_driver_details_admin = async (driver_id) => {
  let driver = await driver_model.find_driver_by_id(driver_id);
  if (!driver) {
    driver = await driver_model.find_driver_by_user_id(driver_id);
  }
  if (!driver) {
    throw ApiError.not_found("Driver profile not found.");
  }
  return driver;
};

export const verify_driver = async (driver_id, payload = {}) => {
  let driver = await driver_model.find_driver_by_id(driver_id);
  if (!driver) {
    driver = await driver_model.find_driver_by_user_id(driver_id);
  }
  if (!driver) {
    throw ApiError.not_found("Driver profile not found.");
  }

  let target_status = true;
  if (payload && payload.is_verified !== undefined) {
    target_status = typeof payload.is_verified === "string"
      ? payload.is_verified.toLowerCase() === "true"
      : Boolean(payload.is_verified);
  } else if (payload && payload.verified !== undefined) {
    target_status = typeof payload.verified === "string"
      ? payload.verified.toLowerCase() === "true"
      : Boolean(payload.verified);
  } else if (payload && payload.status !== undefined) {
    target_status = ["approved", "verified", "active"].includes(String(payload.status).toLowerCase());
  }

  await driver_model.update_driver_verification(driver.driver_id, target_status);

  // Notify driver via WebSocket
  emit_to_user(driver.user_id, "driver:verification_updated", {
    driver_id: driver.driver_id,
    is_verified: target_status,
    message: target_status
      ? "Congratulations! Your driver account has been verified by the administrator."
      : "Your driver verification status has been updated by the administrator.",
    timestamp: new Date().toISOString(),
  });

  return await driver_model.find_driver_by_id(driver.driver_id);
};