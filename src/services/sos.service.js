import * as sos_model from "../models/sos.model.js";
import * as ride_model from "../models/ride.model.js";
import * as user_model from "../models/user.model.js";
import { ApiError } from "../utils/api_error.util.js";
import { emit_to_ride, get_io } from "../socket/socket.server.js";

export const trigger_emergency_sos = async (user_id, { ride_id, latitude, longitude }) => {
  if (!ride_id || !latitude || !longitude) {
    throw ApiError.bad_request("ride_id, latitude, and longitude are required to trigger an SOS alert.");
  }

  const ride = await ride_model.find_ride_by_id(ride_id);
  if (!ride) {
    throw ApiError.not_found("Associated trip not found.");
  }

  if (ride.rider_id !== user_id && ride.driver_id !== user_id) {
    throw ApiError.forbidden("Unauthorized: You are not a passenger or driver on this ride.");
  }

  // Persist the emergency alert record
  const alert = await sos_model.create_sos_record({
    ride_id,
    user_id,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  });

  // Fetch registered emergency contacts for notification
  const emergency_contacts = await user_model.find_emergency_contacts_by_user_id(user_id);

  const payload = {
    alert_id: alert.id,
    ride_id,
    user_id,
    coordinates: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    },
    triggered_at: alert.created_at,
    contacts_notified_count: emergency_contacts.length,
  };

  // Broadcast immediate safety alert to the ride channel
  emit_to_ride(ride_id, "sos:alert_broadcast", payload);

  // Broadcast to global admin safety monitors
  const io = get_io();
  if (io) {
    io.emit("admin:emergency_alert", {
      ...payload,
      emergency_contacts,
      ride_details: {
        pickup: ride.pickup_address,
        dropoff: ride.dropoff_address,
      },
    });
  }

  return {
    alert,
    emergency_contacts_notified: emergency_contacts,
  };
};

export const resolve_emergency_sos = async (alert_id, { status, notes }) => {
  if (!["acknowledged", "resolved"].includes(status)) {
    throw ApiError.bad_request("Status must be either 'acknowledged' or 'resolved'.");
  }

  const updated = await sos_model.update_sos_status(alert_id, { status, notes });
  if (!updated) {
    throw ApiError.not_found("Emergency SOS alert record not found.");
  }

  return updated;
};

export const get_active_emergency_alerts = async () => {
  return await sos_model.find_active_sos_alerts();
};