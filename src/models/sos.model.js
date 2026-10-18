import { query } from "../config/db.config.js";

export const create_sos_record = async ({ ride_id, user_id, latitude, longitude }) => {
  const sql = `
    INSERT INTO sos_alerts (ride_id, user_id, latitude, longitude, status)
    VALUES ($1, $2, $3, $4, 'triggered')
    RETURNING id, ride_id, user_id, latitude, longitude, status, created_at;
  `;
  const result = await query(sql, [ride_id, user_id, latitude, longitude]);
  return result.rows[0];
};

export const find_active_sos_alerts = async () => {
  const sql = `
    SELECT 
      s.id, s.ride_id, s.user_id, s.latitude, s.longitude, s.status, s.created_at,
      u.full_name AS user_name, u.phone_number AS user_phone, u.role AS user_role,
      r.pickup_address, r.dropoff_address
    FROM sos_alerts s
    INNER JOIN users u ON u.id = s.user_id
    INNER JOIN rides r ON r.id = s.ride_id
    WHERE s.status IN ('triggered', 'acknowledged')
    ORDER BY s.created_at DESC;
  `;
  const result = await query(sql);
  return result.rows;
};

export const update_sos_status = async (alert_id, { status, notes = null }) => {
  const sql = `
    UPDATE sos_alerts
    SET status = $1::text,
        notes = COALESCE($2::text, notes),
        resolved_at = CASE WHEN $1::text = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, ride_id, user_id, status, notes, resolved_at, updated_at;
  `;
  const result = await query(sql, [status, notes, alert_id]);
  return result.rows[0] || null;
};