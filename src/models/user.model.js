import { query } from "../config/db.config.js";

export const create_user = async ({
  email,
  password_hash = null,
  full_name,
  phone_number = null,
  role = "rider",
  clerk_id = null,
  avatar_url = null,
}) => {
  const sql = `
    INSERT INTO users (email, password_hash, full_name, phone_number, role, clerk_id, avatar_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, clerk_id, email, phone_number, full_name, role, avatar_url, is_active, created_at, updated_at;
  `;
  const result = await query(sql, [
    email.toLowerCase().trim(),
    password_hash,
    full_name.trim(),
    phone_number,
    role,
    clerk_id,
    avatar_url,
  ]);
  return result.rows[0];
};

export const find_user_by_email = async (email) => {
  const sql = `
    SELECT id, clerk_id, email, password_hash, phone_number, full_name, role, avatar_url, is_active, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1);
  `;
  const result = await query(sql, [email.trim()]);
  return result.rows[0] || null;
};

export const find_user_by_id = async (id) => {
  const sql = `
    SELECT id, clerk_id, email, phone_number, full_name, role, avatar_url, is_active, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

export const find_user_by_clerk_id = async (clerk_id) => {
  const sql = `
    SELECT id, clerk_id, email, phone_number, full_name, role, avatar_url, is_active, created_at, updated_at
    FROM users
    WHERE clerk_id = $1;
  `;
  const result = await query(sql, [clerk_id]);
  return result.rows[0] || null;
};

export const update_user_profile = async (id, { full_name, phone_number, avatar_url }) => {
  const sql = `
    UPDATE users
    SET full_name = COALESCE($1, full_name),
        phone_number = COALESCE($2, phone_number),
        avatar_url = COALESCE($3, avatar_url)
    WHERE id = $4
    RETURNING id, clerk_id, email, phone_number, full_name, role, avatar_url, is_active, updated_at;
  `;
  const result = await query(sql, [full_name, phone_number, avatar_url, id]);
  return result.rows[0] || null;
};

export const create_emergency_contact = async ({ user_id, contact_name, phone_number, relationship }) => {
  const sql = `
    INSERT INTO emergency_contacts (user_id, contact_name, phone_number, relationship)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, contact_name, phone_number, relationship, created_at;
  `;
  const result = await query(sql, [user_id, contact_name, phone_number, relationship]);
  return result.rows[0];
};

export const find_emergency_contacts_by_user_id = async (user_id) => {
  const sql = `
    SELECT id, user_id, contact_name, phone_number, relationship, created_at
    FROM emergency_contacts
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await query(sql, [user_id]);
  return result.rows;
};

export const delete_emergency_contact = async (id, user_id) => {
  const sql = `
    DELETE FROM emergency_contacts
    WHERE id = $1 AND user_id = $2
    RETURNING id;
  `;
  const result = await query(sql, [id, user_id]);
  return result.rows[0] || null;
};