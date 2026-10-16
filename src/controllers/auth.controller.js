import * as auth_service from "../services/auth.service.js";
import { send_success_response } from "../utils/response.util.js";

export const register = async (req, res, next) => {
  try {
    const { email, password, full_name, phone_number, role } = req.body;
    const result = await auth_service.register_user({
      email,
      password,
      full_name,
      phone_number,
      role,
    });
    return send_success_response(res, {
      status_code: 201,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await auth_service.login_user({ email, password });
    return send_success_response(res, {
      status_code: 200,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const sync_clerk = async (req, res, next) => {
  try {
    const { clerk_id, email, full_name, phone_number, avatar_url, role } = req.body;
    const result = await auth_service.sync_clerk_identity({
      clerk_id,
      email,
      full_name,
      phone_number,
      avatar_url,
      role,
    });
    return send_success_response(res, {
      status_code: 200,
      message: "Clerk user synchronized successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};