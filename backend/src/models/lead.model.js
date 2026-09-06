// -----------------------------------------------------------------------------
// lead.model.js
//
// SQL for `leads` (spec §6). No req/res here.
//
// A lead is a prospect who is NOT a customer: no FK to `customers`, no
// customer_id. `status` is left to the column default ('new') so a row can
// never be inserted in any other state.
// -----------------------------------------------------------------------------

import { query } from '../config/db.js';

/**
 * Insert one lead. `project_type` / `budget` / `timeline` may be null.
 * @returns {Promise<number>} the new lead_id
 */
export async function insertLead({
  name,
  email,
  description,
  projectType = null,
  budget = null,
  timeline = null,
}) {
  const result = await query(
    `INSERT INTO leads (name, email, project_type, description, budget, timeline)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, projectType, description, budget, timeline]
  );
  return result.insertId;
}
