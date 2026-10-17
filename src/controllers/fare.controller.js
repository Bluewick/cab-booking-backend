import * as fare_service from "../services/fare.service.js";
import * as promo_service from "../services/promo.service.js";
import { send_success_response } from "../utils/response.util.js";

export const estimate_trip_fare = async (req, res, next) => {
  try {
    const { pickup, dropoff, stops, vehicle_category } = req.body;
    const result = await fare_service.estimate_fare({
      pickup,
      dropoff,
      stops: Array.isArray(stops) ? stops : [],
      vehicle_category,
    });

    return send_success_response(res, {
      status_code: 200,
      message: "Fare estimate calculated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const apply_trip_promo = async (req, res, next) => {
  try {
    const { code, order_amount } = req.body;
    const result = await promo_service.validate_and_apply_promo({
      code,
      order_amount,
    });

    return send_success_response(res, {
      status_code: 200,
      message: "Promo code validated and applied successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};