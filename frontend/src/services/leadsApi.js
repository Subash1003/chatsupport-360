// Wraps POST /api/leads. Public — no auth. Optional fields are omitted when blank.

import apiClient from './apiClient.js';

export async function submitLead({ name, email, description, projectType, budget, timeline }) {
  const payload = { name, email, description };
  if (projectType) payload.project_type = projectType;
  if (budget) payload.budget = budget;
  if (timeline) payload.timeline = timeline;

  const { data } = await apiClient.post('/leads', payload);
  return data.data; // { lead_id, status }
}
