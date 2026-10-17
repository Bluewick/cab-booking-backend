import { query, get_client } from "../config/db.config.js";

export const create_payment_order_record = async ({
  ride_id,
  rider_id,
  order_id,
  amount,
  currency = "INR",
}) => {
  const sql = `
    INSERT INTO payments (ride_id, rider_id, order_id, amount, currency, payment_status)
    VALUES ($1, $2, $3, $4, $5, 'created')
    ON CONFLICT (ride_id) 
    DO UPDATE SET 
      order_id = EXCLUDED.order_id,
      amount = EXCLUDED.amount,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, ride_id, rider_id, order_id, amount, currency, payment_status, created_at;
  `;
  const result = await query(sql, [ride_id, rider_id, order_id, amount, currency]);
  return result.rows[0];
};

export const find_payment_by_order_id = async (order_id) => {
  const sql = `
    SELECT id, ride_id, rider_id, order_id, payment_id, signature, amount, currency, payment_status, created_at, updated_at
    FROM payments
    WHERE order_id = $1;
  `;
  const result = await query(sql, [order_id]);
  return result.rows[0] || null;
};

export const find_payment_by_ride_id = async (ride_id) => {
  const sql = `
    SELECT id, ride_id, rider_id, order_id, payment_id, signature, amount, currency, payment_status, created_at, updated_at
    FROM payments
    WHERE ride_id = $1;
  `;
  const result = await query(sql, [ride_id]);
  return result.rows[0] || null;
};

export const capture_payment_transactional = async ({
  payment_record_id,
  ride_id,
  driver_id,
  payment_id,
  signature,
  gross_amount,
  platform_commission,
  net_driver_earnings,
}) => {
  const client = await get_client();
  try {
    await client.query("BEGIN");

    // 1. Mark payment as captured
    const payment_update_sql = `
      UPDATE payments
      SET payment_id = $1,
          signature = $2,
          payment_status = 'captured',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, ride_id, rider_id, order_id, payment_id, amount, payment_status;
    `;
    const payment_res = await client.query(payment_update_sql, [
      payment_id,
      signature,
      payment_record_id,
    ]);
    const updated_payment = payment_res.rows[0];

    // 2. Ledger insertion for driver earnings
    const earnings_insert_sql = `
      INSERT INTO driver_earnings (
        driver_id, ride_id, payment_id, gross_amount, platform_commission, net_driver_earnings, payout_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      ON CONFLICT (ride_id) DO NOTHING
      RETURNING id, driver_id, ride_id, gross_amount, platform_commission, net_driver_earnings, payout_status;
    `;
    const earnings_res = await client.query(earnings_insert_sql, [
      driver_id,
      ride_id,
      updated_payment.id,
      gross_amount,
      platform_commission,
      net_driver_earnings,
    ]);

    await client.query("COMMIT");

    return {
      payment: updated_payment,
      driver_earnings: earnings_res.rows[0] || null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const get_driver_earnings_summary = async (driver_id) => {
  const summary_sql = `
    SELECT 
      COALESCE(SUM(gross_amount), 0)::numeric(10, 2) AS total_gross,
      COALESCE(SUM(platform_commission), 0)::numeric(10, 2) AS total_commission_deducted,
      COALESCE(SUM(net_driver_earnings), 0)::numeric(10, 2) AS total_net_earnings,
      COUNT(id)::int AS total_completed_trips
    FROM driver_earnings
    WHERE driver_id = $1;
  `;
  const summary_res = await query(summary_sql, [driver_id]);

  const recent_sql = `
    SELECT 
      de.id, de.ride_id, de.gross_amount, de.platform_commission, de.net_driver_earnings,
      de.payout_status, de.created_at,
      r.pickup_address, r.dropoff_address
    FROM driver_earnings de
    INNER JOIN rides r ON r.id = de.ride_id
    WHERE de.driver_id = $1
    ORDER BY de.created_at DESC
    LIMIT 10;
  `;
  const recent_res = await query(recent_sql, [driver_id]);

  return {
    summary: summary_res.rows[0],
    recent_earnings: recent_res.rows,
  };
};