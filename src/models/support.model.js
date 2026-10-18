import { query } from "../config/db.config.js";

export const create_support_ticket = async ({
  user_id,
  ride_id = null,
  category,
  subject,
  description,
}) => {
  const sql = `
    INSERT INTO support_tickets (user_id, ride_id, category, subject, description, status)
    VALUES ($1, $2, $3, $4, $5, 'open')
    RETURNING id, user_id, ride_id, category, subject, description, status, created_at;
  `;
  const result = await query(sql, [user_id, ride_id, category, subject.trim(), description.trim()]);
  return result.rows[0];
};

export const find_tickets_by_user_id = async (user_id) => {
  const sql = `
    SELECT id, user_id, ride_id, category, subject, description, status, admin_response, created_at, updated_at
    FROM support_tickets
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await query(sql, [user_id]);
  return result.rows;
};

export const find_ticket_by_id = async (ticket_id) => {
  const sql = `
    SELECT 
      t.id, t.user_id, t.ride_id, t.category, t.subject, t.description, t.status, t.admin_response,
      t.created_at, t.updated_at,
      u.full_name AS user_name, u.email AS user_email, u.phone_number AS user_phone
    FROM support_tickets t
    INNER JOIN users u ON u.id = t.user_id
    WHERE t.id = $1;
  `;
  const result = await query(sql, [ticket_id]);
  return result.rows[0] || null;
};

export const update_ticket_status = async (ticket_id, { status, admin_response }) => {
  const sql = `
    UPDATE support_tickets
    SET status = COALESCE($1, status),
        admin_response = COALESCE($2, admin_response),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, user_id, ride_id, category, subject, description, status, admin_response, updated_at;
  `;
  const result = await query(sql, [status, admin_response, ticket_id]);
  return result.rows[0] || null;
};