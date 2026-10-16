import * as driver_service from "../services/driver.service.js";
import { send_success_response } from "../utils/response.util.js";

export const register_driver_profile = async (req, res, next) => {
  try {
    const result = await driver_service.register_driver(req.user.id, req.body);
    return send_success_response(res, {
      status_code: 201,
      message: "Driver profile and vehicle registered successfully. Pending verification.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const get_driver_profile = async (req, res, next) => {
  try {
    const driver = await driver_service.get_driver_profile(req.user.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Driver profile retrieved successfully",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

export const update_driver_status = async (req, res, next) => {
  try {
    const { is_online, current_latitude, current_longitude } = req.body;
    const result = await driver_service.update_status(req.user.id, {
      is_online,
      current_latitude,
      current_longitude,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Driver status updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};