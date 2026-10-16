import * as user_model from "../models/user.model.js";
import { ApiError } from "../utils/api_error.util.js";

export const get_user_profile = async (user_id) => {
  const user = await user_model.find_user_by_id(user_id);
  if (!user) {
    throw ApiError.not_found("User account not found.");
  }
  return user;
};

export const update_profile = async (user_id, update_data) => {
  const user = await user_model.find_user_by_id(user_id);
  if (!user) {
    throw ApiError.not_found("User account not found.");
  }

  const updated_user = await user_model.update_user_profile(user_id, update_data);
  return updated_user;
};

export const add_emergency_contact = async (user_id, { contact_name, phone_number, relationship }) => {
  if (!contact_name || !phone_number) {
    throw ApiError.bad_request("Contact name and phone number are required.");
  }

  const contacts = await user_model.find_emergency_contacts_by_user_id(user_id);
  if (contacts.length >= 5) {
    throw ApiError.bad_request("Maximum limit of 5 emergency contacts reached.");
  }

  return await user_model.create_emergency_contact({
    user_id,
    contact_name,
    phone_number,
    relationship: relationship || null,
  });
};

export const get_emergency_contacts = async (user_id) => {
  return await user_model.find_emergency_contacts_by_user_id(user_id);
};

export const remove_emergency_contact = async (contact_id, user_id) => {
  const deleted = await user_model.delete_emergency_contact(contact_id, user_id);
  if (!deleted) {
    throw ApiError.not_found("Emergency contact not found or unauthorized to delete.");
  }
  return { id: contact_id };
};