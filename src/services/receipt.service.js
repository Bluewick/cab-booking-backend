import * as ride_model from "../models/ride.model.js";
import * as payment_model from "../models/payment.model.js";
import { ApiError } from "../utils/api_error.util.js";

export const generate_ride_receipt = async (user_id, role, ride_id) => {
  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Ride record not found.");
  }

  // Access guard: Rider, Driver, or Admin
  if (role === "rider" && ride.rider_id !== user_id) {
    throw ApiError.forbidden("Access denied: You are not authorized to view this receipt.");
  }

  const payment = await payment_model.find_payment_by_ride_id(ride_id);

  const fare_amount = parseFloat(ride.final_fare || ride.estimated_fare);
  // Estimate GST (5% standard ride-hailing transportation tax)
  const tax_rate = 0.05;
  const net_trip_fare = Math.round((fare_amount / (1 + tax_rate)) * 100) / 100;
  const tax_amount = Math.round((fare_amount - net_trip_fare) * 100) / 100;

  return {
    receipt_number: `RCPT-${ride.id.slice(0, 8).toUpperCase()}`,
    issued_at: ride.completed_at || ride.updated_at,
    ride_info: {
      ride_id: ride.id,
      started_at: ride.started_at,
      completed_at: ride.completed_at,
      total_distance_km: ride.total_distance_km,
      total_duration_minutes: ride.total_duration_minutes,
      vehicle_category: ride.vehicle_category,
    },
    route: {
      pickup: { address: ride.pickup_address, coordinates: [ride.pickup_latitude, ride.pickup_longitude] },
      stops: ride.stops.map((s) => ({ order: s.stop_order, address: s.address })),
      dropoff: { address: ride.dropoff_address, coordinates: [ride.dropoff_latitude, ride.dropoff_longitude] },
    },
    passenger: {
      name: ride.rider_name,
      phone: ride.rider_phone,
    },
    driver: {
      name: ride.driver_name,
      rating: ride.driver_rating,
      vehicle: {
        make: ride.vehicle_make,
        model: ride.vehicle_model,
        plate_number: ride.vehicle_plate,
        color: ride.vehicle_color,
      },
    },
    fare_breakdown: {
      trip_subtotal: net_trip_fare,
      gst_tax: tax_amount,
      promo_discount: ride.promo_code ? "Applied" : "None",
      promo_code: ride.promo_code || null,
      total_amount_paid: fare_amount,
      currency: "INR",
    },
    payment_details: {
      payment_id: payment?.payment_id || "PENDING",
      order_id: payment?.order_id || null,
      payment_method: payment?.payment_method || "Razorpay",
      payment_status: payment?.payment_status || "unpaid",
    },
  };
};