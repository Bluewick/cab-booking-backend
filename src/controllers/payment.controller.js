import * as payment_service from "../services/payment.service.js";
import * as receipt_service from "../services/receipt.service.js";
import { send_success_response } from "../utils/response.util.js";

export const create_payment_order = async (req, res, next) => {
  try {
    const { ride_id } = req.body;
    const order_data = await payment_service.create_order(req.user.id, ride_id);
    return send_success_response(res, {
      status_code: 201,
      message: "Razorpay payment order created successfully.",
      data: order_data,
    });
  } catch (error) {
    next(error);
  }
};

export const verify_payment = async (req, res, next) => {
  try {
    const { order_id, payment_id, signature, ride_id } = req.body;
    const result = await payment_service.verify_payment(req.user.id, {
      order_id,
      payment_id,
      signature,
      ride_id,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Payment verified, captured, and settled successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const get_ride_receipt = async (req, res, next) => {
  try {
    const receipt = await receipt_service.generate_ride_receipt(
      req.user.id,
      req.user.role,
      req.params.ride_id
    );
    return send_success_response(res, {
      status_code: 200,
      message: "Digital receipt generated successfully.",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

export const get_driver_earnings = async (req, res, next) => {
  try {
    const earnings = await payment_service.get_driver_earnings(req.user.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Driver earnings and trip settlement ledger fetched successfully.",
      data: earnings,
    });
  } catch (error) {
    next(error);
  }
};