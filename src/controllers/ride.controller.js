import * as ride_service from "../services/ride.service.js";
import { send_success_response } from "../utils/response.util.js";

export const request_ride = async (req, res, next) => {
  try {
    const result = await ride_service.request_ride(req.user.id, req.body);
    return send_success_response(res, {
      status_code: 201,
      message: "Ride requested successfully. Searching for nearby drivers.",
      data: result.ride,
      meta: {
        nearby_drivers_contacted: result.nearby_drivers_count,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const accept_ride = async (req, res, next) => {
  try {
    const ride = await ride_service.accept_ride(req.user.id, req.params.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Ride accepted successfully. Proceed to pickup location.",
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const driver_arrived = async (req, res, next) => {
  try {
    const ride = await ride_service.mark_arrived(req.user.id, req.params.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Driver marked as arrived at pickup location.",
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const start_ride = async (req, res, next) => {
  try {
    const { otp_code } = req.body;
    const ride = await ride_service.start_ride(req.user.id, req.params.id, otp_code);
    return send_success_response(res, {
      status_code: 200,
      message: "Trip verified with OTP and started successfully.",
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const complete_ride = async (req, res, next) => {
  try {
    const ride = await ride_service.complete_ride(req.user.id, req.params.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Ride completed successfully. Pending payment settlement.",
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const cancel_ride = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ride = await ride_service.cancel_ride(
      req.user.id,
      req.user.role,
      req.params.id,
      reason
    );
    return send_success_response(res, {
      status_code: 200,
      message: "Ride cancelled successfully.",
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const get_ride_details = async (req, res, next) => {
  try {
    const ride = await ride_service.get_ride_by_id(
      req.user.id,
      req.user.role,
      req.params.id
    );
    return send_success_response(res, {
      status_code: 200,
      message: "Ride details retrieved successfully.",
      data: ride,
    });
  } catch (error) {
    next(error);
  }
};

export const get_ride_history = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { rides, meta } = await ride_service.get_history(
      req.user.id,
      req.user.role,
      { page, limit }
    );
    return send_success_response(res, {
      status_code: 200,
      message: "Ride history fetched successfully.",
      data: { rides },
      meta,
    });
  } catch (error) {
    next(error);
  }
};