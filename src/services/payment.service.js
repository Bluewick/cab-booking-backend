import crypto from "crypto";
import { razorpay_client } from "../config/razorpay.config.js";
import { env_config } from "../config/env.config.js";
import * as payment_model from "../models/payment.model.js";
import * as ride_model from "../models/ride.model.js";
import * as driver_model from "../models/driver.model.js";
import { ApiError } from "../utils/api_error.util.js";
import { emit_to_ride, emit_to_user } from "../socket/socket.server.js";

export const create_order = async (rider_id, ride_id) => {
  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Ride not found.");
  }

  if (ride.rider_id !== rider_id) {
    throw ApiError.forbidden("Unauthorized: You are not the passenger of this trip.");
  }

  if (ride.status !== "completed") {
    throw ApiError.bad_request(
      `Cannot initiate payment for a ride that is not completed. Current status: '${ride.status}'.`
    );
  }

  const existing_payment = await payment_model.find_payment_by_ride_id(ride_id);
  if (existing_payment && existing_payment.payment_status === "captured") {
    throw ApiError.conflict("Payment for this ride has already been captured successfully.");
  }

  const fare_amount = parseFloat(ride.final_fare || ride.estimated_fare);
  // Razorpay requires amounts to be formatted in smallest currency subunit (paise for INR)
  const amount_in_subunits = Math.round(fare_amount * 100);

  // Receipt reference length limit in Razorpay is 40 characters
  const receipt_id = `rcpt_${ride.id.replace(/-/g, "").slice(0, 16)}`;

  const razorpay_order = await razorpay_client.orders.create({
    amount: amount_in_subunits,
    currency: "INR",
    receipt: receipt_id,
    notes: {
      ride_id: ride.id,
      rider_id: ride.rider_id,
      driver_id: ride.driver_id,
    },
  });

  const payment_record = await payment_model.create_payment_order_record({
    ride_id: ride.id,
    rider_id: ride.rider_id,
    order_id: razorpay_order.id,
    amount: fare_amount,
    currency: "INR",
  });

  return {
    order_id: razorpay_order.id,
    amount: fare_amount,
    currency: "INR",
    razorpay_key_id: env_config.razorpay_key_id,
    ride_id: ride.id,
  };
};

export const verify_payment = async (rider_id, { order_id, payment_id, signature, ride_id }) => {
  if (!order_id || !payment_id || !signature || !ride_id) {
    throw ApiError.bad_request(
      "Missing mandatory verification payload attributes: order_id, payment_id, signature, ride_id."
    );
  }

  const payment_record = await payment_model.find_payment_by_order_id(order_id);
  if (!payment_record) {
    throw ApiError.not_found(`Payment order record '${order_id}' not found.`);
  }

  if (payment_record.payment_status === "captured") {
    return {
      status: "already_captured",
      message: "Payment was already verified and captured.",
      payment_id: payment_record.payment_id,
    };
  }

  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Associated ride not found.");
  }

  // Official Razorpay HMAC-SHA256 signature verification protocol
  const verification_payload = `${order_id}|${payment_id}`;
  const generated_signature = crypto
    .createHmac("sha256", env_config.razorpay_key_secret)
    .update(verification_payload)
    .digest("hex");

  const is_signature_valid = generated_signature === signature;

  if (!is_signature_valid) {
    throw ApiError.bad_request("Payment signature verification failed. Untrusted transaction.");
  }

  // 20% platform commission, 80% driver payout calculation
  const gross_amount = parseFloat(payment_record.amount);
  const platform_commission = Math.round(gross_amount * 0.20 * 100) / 100;
  const net_driver_earnings = Math.round((gross_amount - platform_commission) * 100) / 100;

  const result = await payment_model.capture_payment_transactional({
    payment_record_id: payment_record.id,
    ride_id: ride.id,
    driver_id: ride.driver_id,
    payment_id,
    signature,
    gross_amount,
    platform_commission,
    net_driver_earnings,
  });

  // Real-time settlement broadcast to ride room
  emit_to_ride(ride.id, "payment:successful", {
    ride_id: ride.id,
    payment_id,
    amount: gross_amount,
    currency: "INR",
  });

  return result;
};

export const get_driver_earnings = async (user_id) => {
  const driver = await driver_model.find_driver_by_user_id(user_id);
  if (!driver) {
    throw ApiError.not_found("Driver profile not found.");
  }

  return await payment_model.get_driver_earnings_summary(driver.driver_id);
};