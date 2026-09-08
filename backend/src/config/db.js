// Single MySQL entry point for the backend. A pool (not one connection) so
// concurrent requests each get a reusable connection and a network blip doesn't
// take the app down.

import mysql from 'mysql2/promise';
import env from './env.js';

export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Return DATE columns as 'YYYY-MM-DD' strings. Otherwise a stored 2026-03-01
  // comes back as a Date that renders as 2026-02-28 in IST.
  dateStrings: ['DATE'],
  timezone: 'Z',
});

// Always pass values as params, never string-concatenate them into `sql` —
// pool.execute sends them as a prepared statement, which is the SQL-injection
// defence that matters once LLM-adjacent input reaches these calls.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// query() but returns the first row, or null.
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Run several statements as one all-or-nothing unit, e.g. reserving the next
// customer_id and inserting the customer row.
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Startup probe: returns { ok, ... } rather than throwing, so the caller decides.
export async function testConnection() {
  try {
    const rows = await query(
      'SELECT DATABASE() AS db, VERSION() AS version, NOW() AS server_time'
    );
    return { ok: true, ...rows[0] };
  } catch (error) {
    return { ok: false, code: error.code || 'UNKNOWN', message: error.message };
  }
}

export async function closePool() {
  await pool.end();
}

export default pool;
