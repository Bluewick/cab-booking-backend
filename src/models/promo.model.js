import { query } from "../config/db.config.js";

export const find_promo_by_code = async (code) => {
  const sql = `
    SELECT id, code, description, discount_type, discount_value, max_discount, min_order_amount, usage_limit, times_used, is_active, expires_at
    FROM promo_codes
    WHERE UPPER(code) = UPPER($1);
  `;
  const result = await query(sql, [code.trim()]);
  return result.rows[0] || null;
};

export const increment_promo_usage = async (promo_id) => {
  const sql = `
    UPDATE promo_codes
    SET times_used = times_used + 1
    WHERE id = $1
    RETURNING id, code, times_used, usage_limit;
  `;
  const result = await query(sql, [promo_id]);
  return result.rows[0] || null;
};

export const create_promo_code = async ({
  code,
  description,
  discount_type,
  discount_value,
  max_discount = null,
  min_order_amount = 0.00,
  usage_limit = 100,
  expires_at,
}) => {
  const sql = `
    INSERT INTO promo_codes (code, description, discount_type, discount_value, max_discount, min_order_amount, usage_limit, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, code, description, discount_type, discount_value, max_discount, min_order_amount, usage_limit, times_used, is_active, expires_at;
  `;
  const result = await query(sql, [
    code.trim().toUpperCase(),
    description,
    discount_type,
    discount_value,
    max_discount,
    min_order_amount,
    usage_limit,
    expires_at,
  ]);
  return result.rows[0];
};