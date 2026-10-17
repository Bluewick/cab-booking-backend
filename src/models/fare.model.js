import { query } from "../config/db.config.js";

export const get_all_fare_rules = async () => {
  const sql = `
    SELECT id, vehicle_category, base_fare, per_km_rate, per_minute_rate, minimum_fare, cancellation_fee, surge_multiplier, updated_at
    FROM fare_rules
    ORDER BY base_fare ASC;
  `;
  const result = await query(sql);
  return result.rows;
};

export const get_fare_rule_by_category = async (vehicle_category) => {
  const sql = `
    SELECT id, vehicle_category, base_fare, per_km_rate, per_minute_rate, minimum_fare, cancellation_fee, surge_multiplier, updated_at
    FROM fare_rules
    WHERE vehicle_category = $1;
  `;
  const result = await query(sql, [vehicle_category]);
  return result.rows[0] || null;
};