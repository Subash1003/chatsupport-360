// SQL for `leads`. A lead is a prospect, not a customer: no customer_id, no FK.
// `status` is left to its column default ('new') so a row can't start in any
// other state.

import { query } from '../config/db.js';

// project_type / budget / timeline may be null. Returns the new lead_id.
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
