import * as ride_model from "../models/ride.model.js";
import * as driver_model from "../models/driver.model.js";
import * as fare_service from "./fare.service.js";
import * as promo_service from "./promo.service.js";
import { ApiError } from "../utils/api_error.util.js";

const generate_otp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const request_ride = async (rider_id, payload) => {
  const { pickup, dropoff, stops = [], vehicle_category = "standard", promo_code = null } = payload;

  const active_ride = await ride_model.find_active_ride_by_rider_id(rider_id);
  if (active_ride) {
    throw ApiError.conflict(
      `You already have an active ride request (${active_ride.id}) with status '${active_ride.status}'.`
    );
  }

  // Calculate fare and metrics
  const fare_estimate = await fare_service.estimate_fare({
    pickup,
    dropoff,
    stops,
    vehicle_category,
  });

  const selected_estimate = fare_estimate.estimates[0];
  let final_calculated_fare = selected_estimate.estimated_fare;
  let promo_code_id = null;

  if (promo_code) {
    const promo_result = await promo_service.validate_and_apply_promo({
      code: promo_code,
      order_amount: final_calculated_fare,
    });
    final_calculated_fare = promo_result.final_fare;
    promo_code_id = promo_result.promo_id;
  }

  const otp_code = generate_otp();

  const new_ride = await ride_model.create_ride_transactional({
    rider_id,
    vehicle_category,
    pickup,
    dropoff,
    stops,
    total_distance_km: fare_estimate.route.distance_km,
    total_duration_minutes: fare_estimate.route.duration_minutes,
    estimated_fare: final_calculated_fare,
    promo_code_id,
    otp_code,
  });

  // Query candidate nearby drivers within 10 km
  const nearby_drivers = await driver_model.find_nearby_available_drivers({
    latitude: pickup.latitude,
    longitude: pickup.longitude,
    radius_km: 10,
    vehicle_category,
    limit: 5,
  });

  return {
    ride: new_ride,
    nearby_drivers_count: nearby_drivers.length,
    dispatch_candidates: nearby_drivers.map((d) => ({
      driver_id: d.driver_id,
      distance_km: d.distance_km,
    })),
  };
};

export const accept_ride = async (user_id, ride_id) => {
  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.forbidden("Only registered drivers can accept ride requests.");
  }

  if (!driver.is_verified) {
    throw ApiError.forbidden("Your driver profile is pending verification.");
  }

  if (!driver.is_online) {
    throw ApiError.bad_request("You must be online to accept ride requests.");
  }

  const active_driver_ride = await ride_model.find_active_ride_by_driver_id(driver.driver_id);
  if (active_driver_ride) {
    throw ApiError.conflict("You are already engaged in an active ride.");
  }

  const updated_ride = await ride_model.assign_driver_atomic(ride_id, driver.driver_id);
  if (!updated_ride) {
    throw ApiError.conflict("This ride is no longer available or was already accepted by another driver.");
  }

  return await ride_model.find_ride_by_id(ride_id);
};

export const mark_arrived = async (user_id, ride_id) => {
  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.forbidden("Access denied.");
  }

  const updated = await ride_model.mark_driver_arrived(ride_id, driver.driver_id);
  if (!updated) {
    throw ApiError.bad_request("Ride not found or invalid status transition to 'arrived'.");
  }

  return await ride_model.find_ride_by_id(ride_id);
};

export const start_ride = async (user_id, ride_id, otp_code) => {
  if (!otp_code) {
    throw ApiError.bad_request("4-digit OTP code is required to initiate the trip.");
  }

  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.forbidden("Access denied.");
  }

  const updated = await ride_model.start_ride_atomic(ride_id, driver.driver_id, otp_code);
  if (!updated) {
    throw ApiError.bad_request(
      "Invalid OTP or ride is not in 'arrived' state. Ensure driver has arrived at pickup."
    );
  }

  return await ride_model.find_ride_by_id(ride_id);
};

export const complete_ride = async (user_id, ride_id) => {
  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.forbidden("Access denied.");
  }

  const updated = await ride_model.complete_ride_atomic(ride_id, driver.driver_id);
  if (!updated) {
    throw ApiError.bad_request("Ride is not currently in progress or cannot be completed.");
  }

  await driver_model.increment_driver_rides(driver.driver_id);

  return await ride_model.find_ride_by_id(ride_id);
};

export const cancel_ride = async (user_id, role, ride_id, reason) => {
  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Ride not found.");
  }

  if (["completed", "cancelled"].includes(ride.status)) {
    throw ApiError.bad_request(`Ride is already ${ride.status}.`);
  }

  if (ride.status === "in_progress") {
    throw ApiError.bad_request("Ride is in progress and cannot be cancelled directly. Please contact support.");
  }

  let cancellation_fee = 0.00;

  // Cancellation penalty logic: if rider cancels after driver arrived
  if (role === "rider" && ride.status === "arrived") {
    cancellation_fee = 50.00; // Flat fee or based on category
  }

  const cancelled_ride = await ride_model.cancel_ride_atomic({
    ride_id,
    cancelled_by: role,
    cancellation_reason: reason || "User opted to cancel",
    cancellation_fee,
  });

  return cancelled_ride;
};

export const get_ride_by_id = async (user_id, role, ride_id) => {
  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Ride not found.");
  }

  // Authorization check: User must be the rider, the assigned driver, or an administrator
  if (role === "rider" && ride.rider_id !== user_id) {
    throw ApiError.forbidden("Unauthorized to access this ride details.");
  }

  return ride;
};

export const get_history = async (user_id, role, { page = 1, limit = 10 }) => {
  const parsed_page = Math.max(parseInt(page, 10) || 1, 1);
  const parsed_limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const offset = (parsed_page - 1) * parsed_limit;

  if (role === "driver") {
    const driver = await driver_model.find_driver_by_user_id(user_id);
    if (!driver) {
      throw ApiError.not_found("Driver profile not found.");
    }
    const { rides, total } = await ride_model.list_rides_by_driver(driver.driver_id, {
      limit: parsed_limit,
      offset,
    });
    return {
      rides,
      meta: { page: parsed_page, limit: parsed_limit, total },
    };
  }

  const { rides, total } = await ride_model.list_rides_by_rider(user_id, {
    limit: parsed_limit,
    offset,
  });

  return {
    rides,
    meta: { page: parsed_page, limit: parsed_limit, total },
  };
};