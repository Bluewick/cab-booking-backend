import * as support_model from "../models/support.model.js";
import { ApiError } from "../utils/api_error.util.js";

export const create_ticket = async (user_id, { ride_id, category, subject, description }) => {
  if (!category || !subject || !description) {
    throw ApiError.bad_request("category, subject, and description are required.");
  }

  const valid_categories = [
    "fare_dispute",
    "lost_item",
    "driver_behavior",
    "vehicle_condition",
    "safety",
    "other",
  ];
  if (!valid_categories.includes(category)) {
    throw ApiError.bad_request(
      `Invalid category. Allowed categories: ${valid_categories.join(", ")}`
    );
  }

  return await support_model.create_support_ticket({
    user_id,
    ride_id: ride_id || null,
    category,
    subject,
    description,
  });
};

export const get_user_tickets = async (user_id) => {
  return await support_model.find_tickets_by_user_id(user_id);
};

export const get_ticket_by_id = async (user_id, role, ticket_id) => {
  const ticket = await support_model.find_ticket_by_id(ticket_id);
  if (!ticket) {
    throw ApiError.not_found("Support ticket not found.");
  }

  if (role !== "admin" && ticket.user_id !== user_id) {
    throw ApiError.forbidden("Unauthorized: You do not have permission to view this ticket.");
  }

  return ticket;
};

export const resolve_ticket = async (ticket_id, { status, admin_response }) => {
  if (!status && !admin_response) {
    throw ApiError.bad_request("Either status or admin_response is required to update ticket.");
  }

  if (status && !["open", "in_progress", "resolved", "closed"].includes(status)) {
    throw ApiError.bad_request("Invalid ticket status value.");
  }

  const updated = await support_model.update_ticket_status(ticket_id, {
    status,
    admin_response,
  });

  if (!updated) {
    throw ApiError.not_found("Support ticket not found.");
  }

  return updated;
};