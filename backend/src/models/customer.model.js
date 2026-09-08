// SQL for `customers` and `id_counters`.

import { query, queryOne, withTransaction } from '../config/db.js';

// Public-safe fields only — never the password hash.
export function getProfileById(customerId) {
  return queryOne(
    `SELECT customer_id, name, email, is_active, created_at, updated_at
       FROM customers
      WHERE customer_id = ?`,
    [customerId]
  );
}

// Full row for the login lookup, or null.
export function findCustomerByEmail(email) {
  return queryOne(
    `SELECT customer_id, name, email, password_hash, is_active
       FROM customers
      WHERE email = ?`,
    [email]
  );
}

export async function emailExists(email) {
  const row = await queryOne('SELECT 1 AS found FROM customers WHERE email = ?', [email]);
  return row !== null;
}

// Reserve the next id and insert the row in one transaction. The
// LAST_INSERT_ID(expr) trick makes the increment atomic and connection-local, so
// two concurrent signups can't collide. Returns e.g. "CUST1004".
export function createCustomer({ name, email, passwordHash }) {
  return withTransaction(async (conn) => {
    const [updateResult] = await conn.execute(
      `UPDATE id_counters
          SET next_value = LAST_INSERT_ID(next_value + 1)
        WHERE entity = 'customer'`
    );

    if (updateResult.affectedRows !== 1) {
      const err = new Error(
        "id_counters has no 'customer' row. Re-run backend/database/seed.sql."
      );
      err.statusCode = 500;
      err.code = 'ID_COUNTER_MISSING';
      throw err;
    }

    const [rows] = await conn.execute('SELECT LAST_INSERT_ID() AS next_value');
    const customerId = `CUST${rows[0].next_value}`;

    await conn.execute(
      `INSERT INTO customers (customer_id, name, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [customerId, name, email, passwordHash]
    );

    return customerId;
  });
}

export function updateCustomerPassword(email, passwordHash) {
  return query('UPDATE customers SET password_hash = ? WHERE email = ?', [
    passwordHash,
    email,
  ]);
}
