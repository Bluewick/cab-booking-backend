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

export const list_pending_drivers = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const { drivers, meta } = await driver_service.list_drivers_admin({
      is_verified: false,
      search,
      page,
      limit,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Pending driver verifications retrieved successfully.",
      data: { drivers },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

export const list_all_drivers_admin = async (req, res, next) => {
  try {
    const { is_verified, search, page, limit } = req.query;
    const { drivers, meta } = await driver_service.list_drivers_admin({
      is_verified,
      search,
      page,
      limit,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Drivers retrieved successfully.",
      data: { drivers },
      meta,
    });
  } catch (error) {
    next(error);
  }
};

export const get_driver_details_admin = async (req, res, next) => {
  try {
    const driver = await driver_service.get_driver_details_admin(req.params.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Driver profile details retrieved successfully.",
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};

export const verify_driver_admin = async (req, res, next) => {
  try {
    const driver = await driver_service.verify_driver(req.params.id, req.body);
    const action = driver.is_verified ? "verified" : "unverified";
    return send_success_response(res, {
      status_code: 200,
      message: `Driver profile successfully ${action}.`,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
};