import * as support_service from "../services/support.service.js";
import { send_success_response } from "../utils/response.util.js";

export const create_ticket = async (req, res, next) => {
  try {
    const ticket = await support_service.create_ticket(req.user.id, req.body);
    return send_success_response(res, {
      status_code: 201,
      message: "Customer support ticket submitted successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const list_my_tickets = async (req, res, next) => {
  try {
    const tickets = await support_service.get_user_tickets(req.user.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Support tickets fetched successfully.",
      data: { tickets },
    });
  } catch (error) {
    next(error);
  }
};

export const get_ticket_details = async (req, res, next) => {
  try {
    const ticket = await support_service.get_ticket_by_id(
      req.user.id,
      req.user.role,
      req.params.id
    );
    return send_success_response(res, {
      status_code: 200,
      message: "Ticket details retrieved successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const resolve_ticket = async (req, res, next) => {
  try {
    const { status, admin_response } = req.body;
    const ticket = await support_service.resolve_ticket(req.params.id, {
      status,
      admin_response,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Support ticket updated successfully.",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};