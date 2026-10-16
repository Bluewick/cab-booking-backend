import { query, get_client } from "../config/db.config.js";

export const register_driver_transactional = async ({
  user_id,
  license_number,
  make,
  model,
  plate_number,
  color,
  vehicle_category,
}) => {
  const client = await get_client();
  try {
    await client.query("BEGIN");

    // Upgrade user role to 'driver'
    await client.query("UPDATE users SET role = 'driver' WHERE id = $1", [user_id]);

    // Insert driver profile
    const driver_insert_sql = `
      INSERT INTO driver_profiles (user_id, license_number, is_verified, is_online)
      VALUES ($1, $2, false, false)
      RETURNING id, user_id, license_number, is_verified, is_online, rating_average, total_rides, created_at;
    `;
    const driver_res = await client.query(driver_insert_sql, [user_id, license_number.trim()]);
    const driver = driver_res.rows[0];

    // Insert vehicle details
    const vehicle_insert_sql = `
      INSERT INTO vehicle_details (driver_id, make, model, plate_number, color, vehicle_category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, driver_id, make, model, plate_number, color, vehicle_category, created_at;
    `;
    const vehicle_res = await client.query(vehicle_insert_sql, [
      driver.id,
      make.trim(),
      model.trim(),
      plate_number.trim().toUpperCase(),
      color.trim(),
      vehicle_category,
    ]);
    const vehicle = vehicle_res.rows[0];

    await client.query("COMMIT");

    return {
      ...driver,
      vehicle,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const find_driver_by_user_id = async (user_id) => {
  const sql = `
    SELECT 
      d.id AS driver_id,
      d.user_id,
      d.license_number,
      d.is_verified,
      d.is_online,
      d.current_latitude,
      d.current_longitude,
      d.rating_average,
      d.total_rides,
      u.full_name,
      u.email,
      u.phone_number,
      u.avatar_url,
      v.id AS vehicle_id,
      v.make,
      v.model,
      v.plate_number,
      v.color,
      v.vehicle_category
    FROM driver_profiles d
    INNER JOIN users u ON u.id = d.user_id
    LEFT JOIN vehicle_details v ON v.driver_id = d.id
    WHERE d.user_id = $1;
  `;
  const result = await query(sql, [user_id]);
  return result.rows[0] || null;
};

export const update_driver_status = async (driver_id, { is_online, current_latitude, current_longitude }) => {
  const sql = `
    UPDATE driver_profiles
    SET is_online = COALESCE($1, is_online),
        current_latitude = COALESCE($2, current_latitude),
        current_longitude = COALESCE($3, current_longitude)
    WHERE id = $4
    RETURNING id, user_id, is_online, current_latitude, current_longitude, updated_at;
  `;
  const result = await query(sql, [is_online, current_latitude, current_longitude, driver_id]);
  return result.rows[0] || null;
};