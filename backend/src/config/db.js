// -----------------------------------------------------------------------------
// db.js
// The single MySQL connection point for the whole backend.
//
// We use a CONNECTION POOL, not a single connection.
// A single connection handles one query at a time and dies if the network
// blips. A pool keeps a set of reusable connections, hands one to each request
// and takes it back afterwards. With an API serving many users at once this is
// the only sane choice.
//
// mysql2/promise gives us async/await instead of callbacks.
// -----------------------------------------------------------------------------

import mysql from 'mysql2/promise';
import env from './env.js';

export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,

  // Pool behaviour
  waitForConnections: true, // queue requests instead of failing when busy
  connectionLimit: 10,      // max simultaneous connections
  queueLimit: 0,            // 0 = unlimited queue

  // Return DATE columns as 'YYYY-MM-DD' strings instead of JavaScript Date
  // objects. Without this, a start_date of 2026-03-01 stored in MySQL can come
  // back as 2026-02-28T18:30:00Z in IST and confuse everything downstream.
  dateStrings: ['DATE'],

  // Treat DATETIME/TIMESTAMP values as UTC.
  timezone: 'Z',
});

/**
 * Run a query safely.
 *
 * ALWAYS pass values as the second argument, never build SQL with string
 * concatenation:
 *
 *   GOOD: query('SELECT * FROM projects WHERE customer_id = ?', [customerId])
 *   BAD:  query(`SELECT * FROM projects WHERE customer_id = '${customerId}'`)
 *
 * `pool.execute` sends the SQL and the values separately as a prepared
 * statement, so a value can never be interpreted as SQL. That is our primary
 * defence against SQL injection, and it matters even more here because in
 * Phase 7 some of these values will originate from LLM-adjacent input.
 *
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>} rows
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Same as query() but returns the first row, or null.
 * Convenient for lookups like "find the customer with this email".
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Run several statements as one all-or-nothing unit.
 *
 * Phase 3 needs this: reserving the next customer_id and inserting the customer
 * row must either both happen or neither happen.
 *
 * Usage:
 *   const id = await withTransaction(async (conn) => {
 *     await conn.execute('UPDATE ...');
 *     const [rows] = await conn.execute('SELECT ...');
 *     return rows[0].value;
 *   });
 */
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
    // Returns the connection to the pool. Forgetting this leaks connections
    // until the pool is exhausted and the app hangs.
    connection.release();
  }
}

/**
 * Verify at startup that the database is actually reachable and seeded.
 * Returns a plain object rather than throwing, so the caller decides what to do.
 */
export async function testConnection() {
  try {
    const rows = await query(
      'SELECT DATABASE() AS db, VERSION() AS version, NOW() AS server_time'
    );
    return { ok: true, ...rows[0] };
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'UNKNOWN',
      message: error.message,
    };
  }
}

/** Close every pooled connection. Used on shutdown. */
export async function closePool() {
  await pool.end();
}

export default pool;
