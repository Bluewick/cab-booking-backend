import { query, get_client } from "../config/db.config.js";

export const create_review_transactional = async ({
  ride_id,
  rider_id,
  driver_id,
  rating,
  comment,
}) => {
  const client = await get_client();
  try {
    await client.query("BEGIN");

    // 1. Insert review record
    const review_insert_sql = `
      INSERT INTO reviews (ride_id, rider_id, driver_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, ride_id, rider_id, driver_id, rating, comment, created_at;
    `;
    const review_res = await client.query(review_insert_sql, [
      ride_id,
      rider_id,
      driver_id,
      rating,
      comment,
    ]);
    const review = review_res.rows[0];

    // 2. Atomically calculate and update driver running average
    const update_driver_rating_sql = `
      UPDATE driver_profiles
      SET rating_average = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM reviews
        WHERE driver_id = $1
      )
      WHERE id = $1
      RETURNING id, rating_average;
    `;
    const driver_res = await client.query(update_driver_rating_sql, [driver_id]);

    await client.query("COMMIT");

    return {
      review,
      updated_driver_rating: driver_res.rows[0]?.rating_average || 5.0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const find_review_by_ride_id = async (ride_id) => {
  const sql = `
    SELECT id, ride_id, rider_id, driver_id, rating, comment, created_at
    FROM reviews
    WHERE ride_id = $1;
  `;
  const result = await query(sql, [ride_id]);
  return result.rows[0] || null;
};

export const find_reviews_by_driver_id = async (driver_id, { limit = 10, offset = 0 }) => {
  const count_sql = `SELECT COUNT(*)::int AS total FROM reviews WHERE driver_id = $1;`;
  const count_res = await query(count_sql, [driver_id]);
  const total = count_res.rows[0].total;

  const data_sql = `
    SELECT 
      rv.id, rv.rating, rv.comment, rv.created_at,
      u.full_name AS rider_name,
      u.avatar_url AS rider_avatar
    FROM reviews rv
    INNER JOIN users u ON u.id = rv.rider_id
    WHERE rv.driver_id = $1
    ORDER BY rv.created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const data_res = await query(data_sql, [driver_id, limit, offset]);

  return {
    reviews: data_res.rows,
    total,
  };
};