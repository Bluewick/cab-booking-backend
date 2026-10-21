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

    await client.query("UPDATE users SET role = 'driver' WHERE id = $1", [user_id]);

    const driver_insert_sql = `
      INSERT INTO driver_profiles (user_id, license_number, is_verified, is_online)
      VALUES ($1, $2, false, false)
      RETURNING id, user_id, license_number, is_verified, is_online, rating_average, total_rides, created_at;
    `;
    const driver_res = await client.query(driver_insert_sql, [user_id, license_number.trim()]);
    const driver = driver_res.rows[0];

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
      d.bearing,
      d.speed,
      d.last_location_at,
      d.rating_average,
      d.total_rides,
      d.created_at,
      d.updated_at,
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

export const find_driver_by_id = async (driver_id) => {
  const sql = `
    SELECT 
      d.id AS driver_id,
      d.user_id,
      d.license_number,
      d.is_verified,
      d.is_online,
      d.current_latitude,
      d.current_longitude,
      d.bearing,
      d.speed,
      d.last_location_at,
      d.rating_average,
      d.total_rides,
      d.created_at,
      d.updated_at,
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
    WHERE d.id = $1;
  `;
  const result = await query(sql, [driver_id]);
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

export const update_driver_telemetry = async (driver_id, { latitude, longitude, bearing = 0.0, speed = 0.0 }) => {
  const sql = `
    UPDATE driver_profiles
    SET current_latitude = $1,
        current_longitude = $2,
        bearing = $3,
        speed = $4,
        last_location_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, current_latitude, current_longitude, bearing, speed, last_location_at;
  `;
  const result = await query(sql, [latitude, longitude, bearing, speed, driver_id]);
  return result.rows[0] || null;
};

export const find_nearby_available_drivers = async ({
  latitude,
  longitude,
  radius_km = 10,
  vehicle_category = "standard",
  limit = 10,
}) => {
  const sql = `
    SELECT 
      d.id AS driver_id,
      d.user_id,
      d.current_latitude,
      d.current_longitude,
      d.bearing,
      d.rating_average,
      u.full_name,
      u.phone_number,
      v.make,
      v.model,
      v.plate_number,
      v.color,
      v.vehicle_category,
      ROUND(
        (6371 * acos(
          cos(radians($1)) * cos(radians(d.current_latitude)) *
          cos(radians(d.current_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(d.current_latitude))
        ))::numeric, 2
      ) AS distance_km
    FROM driver_profiles d
    INNER JOIN users u ON u.id = d.user_id
    INNER JOIN vehicle_details v ON v.driver_id = d.id
    WHERE d.is_online = true
      AND d.is_verified = true
      AND d.current_latitude IS NOT NULL
      AND d.current_longitude IS NOT NULL
      AND v.vehicle_category = $3
      AND (
        6371 * acos(
          cos(radians($1)) * cos(radians(d.current_latitude)) *
          cos(radians(d.current_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(d.current_latitude))
        )
      ) <= $4
    ORDER BY distance_km ASC
    LIMIT $5;
  `;
  const result = await query(sql, [latitude, longitude, vehicle_category, radius_km, limit]);
  return result.rows;
};

export const increment_driver_rides = async (driver_id) => {
  const sql = `
    UPDATE driver_profiles
    SET total_rides = total_rides + 1
    WHERE id = $1
    RETURNING id, total_rides;
  `;
  const result = await query(sql, [driver_id]);
  return result.rows[0] || null;
};

export const list_drivers = async ({ is_verified, search, limit = 10, offset = 0 }) => {
  const conditions = [];
  const params = [];

  if (typeof is_verified === "boolean") {
    params.push(is_verified);
    conditions.push(`d.is_verified = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const s_idx = params.length;
    conditions.push(`(
      u.full_name ILIKE $${s_idx} OR 
      u.email ILIKE $${s_idx} OR 
      u.phone_number ILIKE $${s_idx} OR 
      d.license_number ILIKE $${s_idx} OR 
      v.plate_number ILIKE $${s_idx}
    )`);
  }

  const where_clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const count_sql = `
    SELECT COUNT(*)::int AS total
    FROM driver_profiles d
    INNER JOIN users u ON u.id = d.user_id
    LEFT JOIN vehicle_details v ON v.driver_id = d.id
    ${where_clause};
  `;
  const count_res = await query(count_sql, params);
  const total = count_res.rows[0]?.total || 0;

  const data_params = [...params];
  data_params.push(limit);
  const limit_idx = data_params.length;
  data_params.push(offset);
  const offset_idx = data_params.length;

  const data_sql = `
    SELECT 
      d.id AS driver_id,
      d.user_id,
      d.license_number,
      d.is_verified,
      d.is_online,
      d.current_latitude,
      d.current_longitude,
      d.bearing,
      d.speed,
      d.last_location_at,
      d.rating_average,
      d.total_rides,
      d.created_at,
      d.updated_at,
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
    ${where_clause}
    ORDER BY d.created_at DESC
    LIMIT $${limit_idx} OFFSET $${offset_idx};
  `;

  const data_res = await query(data_sql, data_params);

  return {
    drivers: data_res.rows,
    total,
  };
};

export const update_driver_verification = async (driver_id, is_verified) => {
  const sql = `
    UPDATE driver_profiles
    SET is_verified = $1,
        is_online = CASE WHEN $1 = false THEN false ELSE is_online END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, user_id, license_number, is_verified, is_online, rating_average, total_rides, created_at, updated_at;
  `;
  const result = await query(sql, [is_verified, driver_id]);
  return result.rows[0] || null;
};