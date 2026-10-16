import * as driver_model from "../models/driver.model.js";
import * as user_model from "../models/user.model.js";
import { ApiError } from "../utils/api_error.util.js";

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