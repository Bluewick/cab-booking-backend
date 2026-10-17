import { query, get_client } from "../config/db.config.js";

export const find_active_ride_by_rider_id = async (rider_id) => {
  const sql = `
    SELECT id, status, pickup_address, dropoff_address, estimated_fare, created_at
    FROM rides
    WHERE rider_id = $1 AND status IN ('requested', 'driver_assigned', 'arrived', 'in_progress')
    LIMIT 1;
  `;
  const result = await query(sql, [rider_id]);
  return result.rows[0] || null;
};

export const find_active_ride_by_driver_id = async (driver_id) => {
  const sql = `
    SELECT id, status, pickup_address, dropoff_address, estimated_fare, created_at
    FROM rides
    WHERE driver_id = $1 AND status IN ('driver_assigned', 'arrived', 'in_progress')
    LIMIT 1;
  `;
  const result = await query(sql, [driver_id]);
  return result.rows[0] || null;
};

export const create_ride_transactional = async ({
  rider_id,
  vehicle_category,
  pickup,
  dropoff,
  stops = [],
  total_distance_km,
  total_duration_minutes,
  estimated_fare,
  promo_code_id = null,
  otp_code,
}) => {
  const client = await get_client();
  try {
    await client.query("BEGIN");

    const ride_insert_sql = `
      INSERT INTO rides (
        rider_id, vehicle_category, status,
        pickup_latitude, pickup_longitude, pickup_address,
        dropoff_latitude, dropoff_longitude, dropoff_address,
        total_distance_km, total_duration_minutes, estimated_fare,
        promo_code_id, otp_code
      )
      VALUES ($1, $2, 'requested', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const ride_res = await client.query(ride_insert_sql, [
      rider_id,
      vehicle_category,
      pickup.latitude,
      pickup.longitude,
      pickup.address,
      dropoff.latitude,
      dropoff.longitude,
      dropoff.address,
      total_distance_km,
      total_duration_minutes,
      estimated_fare,
      promo_code_id,
      otp_code,
    ]);
    const ride = ride_res.rows[0];

    const inserted_stops = [];
    if (stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const stop_insert_sql = `
          INSERT INTO ride_stops (ride_id, stop_order, latitude, longitude, address, status)
          VALUES ($1, $2, $3, $4, $5, 'pending')
          RETURNING *;
        `;
        const stop_res = await client.query(stop_insert_sql, [
          ride.id,
          i + 1,
          stop.latitude,
          stop.longitude,
          stop.address,
        ]);
        inserted_stops.push(stop_res.rows[0]);
      }
    }

    await client.query("COMMIT");
    return {
      ...ride,
      stops: inserted_stops,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const find_ride_by_id = async (ride_id) => {
  const sql = `
    SELECT 
      r.*,
      u.full_name AS rider_name,
      u.phone_number AS rider_phone,
      d_user.full_name AS driver_name,
      d_user.phone_number AS driver_phone,
      dp.rating_average AS driver_rating,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.plate_number AS vehicle_plate,
      v.color AS vehicle_color,
      p.code AS promo_code
    FROM rides r
    INNER JOIN users u ON u.id = r.rider_id
    LEFT JOIN driver_profiles dp ON dp.id = r.driver_id
    LEFT JOIN users d_user ON d_user.id = dp.user_id
    LEFT JOIN vehicle_details v ON v.driver_id = dp.id
    LEFT JOIN promo_codes p ON p.id = r.promo_code_id
    WHERE r.id = $1;
  `;
  const result = await query(sql, [ride_id]);
  if (!result.rows[0]) return null;

  const ride = result.rows[0];

  const stops_sql = `
    SELECT id, stop_order, latitude, longitude, address, status
    FROM ride_stops
    WHERE ride_id = $1
    ORDER BY stop_order ASC;
  `;
  const stops_res = await query(stops_sql, [ride_id]);
  ride.stops = stops_res.rows;

  return ride;
};

export const assign_driver_atomic = async (ride_id, driver_id) => {
  const sql = `
    UPDATE rides
    SET status = 'driver_assigned',
        driver_id = $1
    WHERE id = $2 AND status = 'requested'
    RETURNING *;
  `;
  const result = await query(sql, [driver_id, ride_id]);
  return result.rows[0] || null;
};

export const mark_driver_arrived = async (ride_id, driver_id) => {
  const sql = `
    UPDATE rides
    SET status = 'arrived'
    WHERE id = $1 AND driver_id = $2 AND status = 'driver_assigned'
    RETURNING *;
  `;
  const result = await query(sql, [ride_id, driver_id]);
  return result.rows[0] || null;
};

export const start_ride_atomic = async (ride_id, driver_id, otp_code) => {
  const sql = `
    UPDATE rides
    SET status = 'in_progress',
        started_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND driver_id = $2 AND status = 'arrived' AND otp_code = $3
    RETURNING *;
  `;
  const result = await query(sql, [ride_id, driver_id, otp_code.trim()]);
  return result.rows[0] || null;
};

export const complete_ride_atomic = async (ride_id, driver_id) => {
  const sql = `
    UPDATE rides
    SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        final_fare = estimated_fare
    WHERE id = $1 AND driver_id = $2 AND status = 'in_progress'
    RETURNING *;
  `;
  const result = await query(sql, [ride_id, driver_id]);
  return result.rows[0] || null;
};

export const cancel_ride_atomic = async ({
  ride_id,
  cancelled_by,
  cancellation_reason,
  cancellation_fee = 0.00,
}) => {
  const sql = `
    UPDATE rides
    SET status = 'cancelled',
        cancelled_by = $1,
        cancellation_reason = $2,
        cancellation_fee = $3
    WHERE id = $4 AND status IN ('requested', 'driver_assigned', 'arrived')
    RETURNING *;
  `;
  const result = await query(sql, [cancelled_by, cancellation_reason, cancellation_fee, ride_id]);
  return result.rows[0] || null;
};

export const list_rides_by_rider = async (rider_id, { limit = 10, offset = 0 }) => {
  const count_sql = `SELECT COUNT(*)::int AS total FROM rides WHERE rider_id = $1;`;
  const count_res = await query(count_sql, [rider_id]);
  const total = count_res.rows[0].total;

  const data_sql = `
    SELECT 
      r.id, r.status, r.vehicle_category, r.pickup_address, r.dropoff_address,
      r.total_distance_km, r.total_duration_minutes, r.estimated_fare, r.final_fare,
      r.created_at, r.completed_at,
      u.full_name AS driver_name,
      v.model AS vehicle_model,
      v.plate_number AS vehicle_plate
    FROM rides r
    LEFT JOIN driver_profiles dp ON dp.id = r.driver_id
    LEFT JOIN users u ON u.id = dp.user_id
    LEFT JOIN vehicle_details v ON v.driver_id = dp.id
    WHERE r.rider_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const data_res = await query(data_sql, [rider_id, limit, offset]);

  return {
    rides: data_res.rows,
    total,
  };
};

export const list_rides_by_driver = async (driver_id, { limit = 10, offset = 0 }) => {
  const count_sql = `SELECT COUNT(*)::int AS total FROM rides WHERE driver_id = $1;`;
  const count_res = await query(count_sql, [driver_id]);
  const total = count_res.rows[0].total;

  const data_sql = `
    SELECT 
      r.id, r.status, r.vehicle_category, r.pickup_address, r.dropoff_address,
      r.total_distance_km, r.total_duration_minutes, r.final_fare, r.estimated_fare,
      r.created_at, r.completed_at,
      u.full_name AS rider_name,
      u.phone_number AS rider_phone
    FROM rides r
    INNER JOIN users u ON u.id = r.rider_id
    WHERE r.driver_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const data_res = await query(data_sql, [driver_id, limit, offset]);

  return {
    rides: data_res.rows,
    total,
  };
};