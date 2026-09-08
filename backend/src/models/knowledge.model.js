// SQL reads that feed the ingestion pipeline. `services` and `offers` are
// ingested straight from MySQL as public data; projects/tasks and tickets are
// turned into per-customer private documents by ingestion.service.js.

import { query } from '../config/db.js';

export function getActiveServices() {
  return query(
    `SELECT service_id, name, description, price
       FROM services
      WHERE status = 'active'
      ORDER BY service_id`
  );
}

// Live right now — the same rule the chatbot must apply.
export function getActiveOffers() {
  return query(
    `SELECT offer_id, title, description, discount, valid_from, valid_until
       FROM offers
      WHERE status = 'active'
        AND CURDATE() BETWEEN valid_from AND valid_until
      ORDER BY offer_id`
  );
}

export async function getActiveCustomerIds() {
  const rows = await query(
    `SELECT customer_id FROM customers WHERE is_active = 1 ORDER BY customer_id`
  );
  return rows.map((r) => r.customer_id);
}

// One customer's projects, each with its task list attached.
export async function getProjectsWithTasks(customerId) {
  const projects = await query(
    `SELECT project_id, project_name, description, status,
            start_date, expected_end_date, technology
       FROM projects
      WHERE customer_id = ?
      ORDER BY project_id`,
    [customerId]
  );
  if (!projects.length) return [];

  const ids = projects.map((p) => p.project_id);
  const placeholders = ids.map(() => '?').join(', ');
  const tasks = await query(
    `SELECT t.project_id, t.title, t.description, t.status, t.completed_at
       FROM project_tasks t
      WHERE t.project_id IN (${placeholders})
      ORDER BY t.project_id, t.task_id`,
    ids
  );

  const byProject = new Map(projects.map((p) => [p.project_id, { ...p, tasks: [] }]));
  for (const task of tasks) byProject.get(task.project_id).tasks.push(task);
  return [...byProject.values()];
}

export function getTickets(customerId) {
  return query(
    `SELECT ticket_id, subject, description, status, priority, created_at
       FROM support_tickets
      WHERE customer_id = ?
      ORDER BY ticket_id`,
    [customerId]
  );
}
