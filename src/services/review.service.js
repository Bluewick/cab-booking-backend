import * as review_model from "../models/review.model.js";
import * as ride_model from "../models/ride.model.js";
import { ApiError } from "../utils/api_error.util.js";

export const submit_driver_review = async (rider_id, { ride_id, rating, comment = null }) => {
  if (!ride_id || rating === undefined || rating === null) {
    throw ApiError.bad_request("ride_id and numerical rating (1.0 to 5.0) are mandatory.");
  }

  const numeric_rating = parseFloat(rating);
  if (isNaN(numeric_rating) || numeric_rating < 1.0 || numeric_rating > 5.0) {
    throw ApiError.bad_request("Rating must be a numeric score between 1.0 and 5.0 stars.");
  }

  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Ride not found.");
  }

  if (ride.rider_id !== rider_id) {
    throw ApiError.forbidden("Unauthorized: You were not the passenger of this trip.");
  }

  if (ride.status !== "completed") {
    throw ApiError.bad_request(
      `Cannot review a trip that is not completed. Current ride status: '${ride.status}'.`
    );
  }

  const existing_review = await review_model.find_review_by_ride_id(ride_id);
  if (existing_review) {
    throw ApiError.conflict("Feedback and rating have already been submitted for this trip.");
  }

  return await review_model.create_review_transactional({
    ride_id: ride.id,
    rider_id,
    driver_id: ride.driver_id,
    rating: numeric_rating,
    comment,
  });
};

export const get_driver_reviews = async (driver_id, { page = 1, limit = 10 }) => {
  const parsed_page = Math.max(parseInt(page, 10) || 1, 1);
  const parsed_limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const offset = (parsed_page - 1) * parsed_limit;

  const { reviews, total } = await review_model.find_reviews_by_driver_id(driver_id, {
    limit: parsed_limit,
    offset,
  });

  return {
    reviews,
    meta: { page: parsed_page, limit: parsed_limit, total },
  };
};