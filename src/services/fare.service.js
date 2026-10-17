import * as fare_model from "../models/fare.model.js";
import * as map_service from "./map.service.js";
import { ApiError } from "../utils/api_error.util.js";

const compute_category_fare = (rule, distance_km, duration_minutes) => {
  const base_fare = parseFloat(rule.base_fare);
  const per_km_rate = parseFloat(rule.per_km_rate);
  const per_minute_rate = parseFloat(rule.per_minute_rate);
  const minimum_fare = parseFloat(rule.minimum_fare);
  const surge_multiplier = parseFloat(rule.surge_multiplier);

  const distance_charge = distance_km * per_km_rate;
  const time_charge = duration_minutes * per_minute_rate;
  const raw_fare = base_fare + distance_charge + time_charge;

  const fare_before_surge = Math.max(raw_fare, minimum_fare);
  const final_estimated_fare = Math.round(fare_before_surge * surge_multiplier * 100) / 100;

  return {
    vehicle_category: rule.vehicle_category,
    base_fare,
    distance_km,
    duration_minutes,
    distance_charge: Math.round(distance_charge * 100) / 100,
    time_charge: Math.round(time_charge * 100) / 100,
    surge_multiplier,
    estimated_fare: final_estimated_fare,
    currency: "INR",
  };
};

export const estimate_fare = async ({ pickup, dropoff, stops = [], vehicle_category = null }) => {
  if (!pickup?.latitude || !pickup?.longitude || !dropoff?.latitude || !dropoff?.longitude) {
    throw ApiError.bad_request("Valid pickup and dropoff coordinates (latitude, longitude) are required.");
  }

  const route_metrics = await map_service.calculate_route_metrics(pickup, dropoff, stops);

  if (vehicle_category) {
    const rule = await fare_model.get_fare_rule_by_category(vehicle_category);
    if (!rule) {
      throw ApiError.not_found(`Fare configuration for category '${vehicle_category}' does not exist.`);
    }

    const estimate = compute_category_fare(rule, route_metrics.distance_km, route_metrics.duration_minutes);
    return {
      route: route_metrics,
      estimates: [estimate],
    };
  }

  const all_rules = await fare_model.get_all_fare_rules();
  const estimates = all_rules.map((rule) =>
    compute_category_fare(rule, route_metrics.distance_km, route_metrics.duration_minutes)
  );

  return {
    route: route_metrics,
    estimates,
  };
};