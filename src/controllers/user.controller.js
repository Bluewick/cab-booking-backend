import * as user_service from "../services/user.service.js";
import { send_success_response } from "../utils/response.util.js";

export const get_current_user_profile = async (req, res, next) => {
  try {
    const user = await user_service.get_user_profile(req.user.id);
    return send_success_response(res, {
      status_code: 200,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const update_current_user_profile = async (req, res, next) => {
  try {
    const { full_name, phone_number, avatar_url } = req.body;
    const updated = await user_service.update_profile(req.user.id, {
      full_name,
      phone_number,
      avatar_url,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "User profile updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const list_emergency_contacts = async (req, res, next) => {
  try {
    const contacts = await user_service.get_emergency_contacts(req.user.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Emergency contacts fetched successfully",
      data: { contacts },
    });
  } catch (error) {
    next(error);
  }
};

export const create_emergency_contact = async (req, res, next) => {
  try {
    const contact = await user_service.add_emergency_contact(req.user.id, req.body);
    return send_success_response(res, {
      status_code: 201,
      message: "Emergency contact registered successfully",
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const delete_emergency_contact = async (req, res, next) => {
  try {
    const result = await user_service.remove_emergency_contact(req.params.id, req.user.id);
    return send_success_response(res, {
      status_code: 200,
      message: "Emergency contact deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};