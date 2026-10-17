import * as promo_model from "../models/promo.model.js";
import { ApiError } from "../utils/api_error.util.js";

export const validate_and_apply_promo = async ({ code, order_amount }) => {
  if (!code || order_amount === undefined || order_amount === null) {
    throw ApiError.bad_request("Promo code and order_amount are required.");
  }

  const numeric_amount = parseFloat(order_amount);
  if (isNaN(numeric_amount) || numeric_amount <= 0) {
    throw ApiError.bad_request("Invalid order amount provided.");
  }

  const promo = await promo_model.find_promo_by_code(code);
  if (!promo) {
    throw ApiError.not_found(`Promo code '${code}' is invalid or does not exist.`);
  }

  if (!promo.is_active) {
    throw ApiError.bad_request("This promo code has been deactivated.");
  }

  const now = new Date();
  if (new Date(promo.expires_at) < now) {
    throw ApiError.bad_request("This promo code has expired.");
  }

  if (promo.times_used >= promo.usage_limit) {
    throw ApiError.bad_request("This promo code has reached its global redemption limit.");
  }

  const min_order = parseFloat(promo.min_order_amount);
  if (numeric_amount < min_order) {
    throw ApiError.bad_request(
      `Minimum ride fare of INR ${min_order.toFixed(2)} required to apply promo code '${promo.code}'.`
    );
  }

  let discount_amount = 0;
  const discount_val = parseFloat(promo.discount_value);

  if (promo.discount_type === "percentage") {
    discount_amount = (numeric_amount * discount_val) / 100;
    if (promo.max_discount !== null) {
      discount_amount = Math.min(discount_amount, parseFloat(promo.max_discount));
    }
  } else if (promo.discount_type === "flat") {
    discount_amount = Math.min(discount_val, numeric_amount);
  }

  discount_amount = Math.round(discount_amount * 100) / 100;
  const final_fare = Math.max(Math.round((numeric_amount - discount_amount) * 100) / 100, 0);

  return {
    promo_id: promo.id,
    code: promo.code,
    description: promo.description,
    discount_type: promo.discount_type,
    discount_applied: discount_amount,
    original_fare: numeric_amount,
    final_fare,
  };
};