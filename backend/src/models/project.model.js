// SQL for `projects` and `project_tasks`. project_tasks has no customer_id
// column by design, so task queries JOIN projects and filter on
// projects.customer_id.

import { query, queryOne } from '../config/db.js';

const PROJECT_COLUMNS = `
  project_id, project_name, description, status,
  start_date, expected_end_date, technology, created_at, updated_at
`;

export function listProjectsByCustomer(customerId) {
  return query(
    `SELECT ${PROJECT_COLUMNS}
       FROM projects
      WHERE customer_id = ?
      ORDER BY created_at DESC, project_id DESC`,
    [customerId]
  );
}

// null when the id doesn't exist OR belongs to someone else — the caller turns
// both into a 404 so the client can't tell them apart.
export function findProjectForCustomer(projectId, customerId) {
  return queryOne(
    `SELECT ${PROJECT_COLUMNS}
       FROM projects
      WHERE project_id = ? AND customer_id = ?`,
    [projectId, customerId]
  );
}

export function listTasksForProject(projectId, customerId) {
  return query(
    `SELECT t.task_id, t.title, t.description, t.status,
            t.completed_at, t.created_at
       FROM project_tasks t
       JOIN projects p ON p.project_id = t.project_id
      WHERE t.project_id = ? AND p.customer_id = ?
      ORDER BY t.task_id`,
    [projectId, customerId]
  );
}
