import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as user_model from "../models/user.model.js";
import { env_config } from "../config/env.config.js";
import { ApiError } from "../utils/api_error.util.js";

const generate_token = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      clerk_id: user.clerk_id || null,
    },
    env_config.jwt_secret,
    { expiresIn: env_config.jwt_expires_in }
  );
};

export const register_user = async ({ email, password, full_name, phone_number, role = "rider" }) => {
  if (!email || !password || !full_name) {
    throw ApiError.bad_request("Email, password, and full name are required.");
  }

  const existing_user = await user_model.find_user_by_email(email);
  if (existing_user) {
    throw ApiError.conflict("A user with this email address already exists.");
  }

  const salt_rounds = 10;
  const password_hash = await bcrypt.hash(password, salt_rounds);

  const user = await user_model.create_user({
    email,
    password_hash,
    full_name,
    phone_number: phone_number || null,
    role,
  });

  const token = generate_token(user);
  return { user, token };
};

export const login_user = async ({ email, password }) => {
  if (!email || !password) {
    throw ApiError.bad_request("Email and password are required.");
  }

  const user = await user_model.find_user_by_email(email);
  if (!user || !user.password_hash) {
    throw ApiError.unauthorized("Invalid email or password credentials.");
  }

  if (!user.is_active) {
    throw ApiError.forbidden("Your account is currently disabled. Please contact support.");
  }

  const is_password_valid = await bcrypt.compare(password, user.password_hash);
  if (!is_password_valid) {
    throw ApiError.unauthorized("Invalid email or password credentials.");
  }

  delete user.password_hash;
  const token = generate_token(user);
  return { user, token };
};

export const sync_clerk_identity = async ({ clerk_id, email, full_name, phone_number, avatar_url, role = "rider" }) => {
  if (!clerk_id || !email) {
    throw ApiError.bad_request("Clerk ID and email are mandatory for identity synchronization.");
  }

  let user = await user_model.find_user_by_clerk_id(clerk_id);

  if (!user) {
    const existing_by_email = await user_model.find_user_by_email(email);
    if (existing_by_email) {
      // Connect Clerk ID to existing email account
      user = await user_model.update_user_profile(existing_by_email.id, {
        full_name: full_name || existing_by_email.full_name,
        phone_number: phone_number || existing_by_email.phone_number,
        avatar_url: avatar_url || existing_by_email.avatar_url,
      });
    } else {
      user = await user_model.create_user({
        email,
        full_name: full_name || "Clerk User",
        phone_number: phone_number || null,
        clerk_id,
        avatar_url: avatar_url || null,
        role,
      });
    }
  }

  const token = generate_token(user);
  return { user, token };
};