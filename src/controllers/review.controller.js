import * as review_service from "../services/review.service.js";
import { send_success_response } from "../utils/response.util.js";

export const submit_review = async (req, res, next) => {
  try {
    const { ride_id, rating, comment } = req.body;
    const result = await review_service.submit_driver_review(req.user.id, {
      ride_id,
      rating,
      comment,
    });
    return send_success_response(res, {
      status_code: 201,
      message: "Driver review submitted successfully. Rating updated.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const list_driver_reviews = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { reviews, meta } = await review_service.get_driver_reviews(req.params.driver_id, {
      page,
      limit,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Driver reviews fetched successfully.",
      data: { reviews },
      meta,
    });
  } catch (error) {
    next(error);
  }
};