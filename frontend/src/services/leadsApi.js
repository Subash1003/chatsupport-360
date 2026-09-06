// -----------------------------------------------------------------------------
// leadsApi.js
//
// Wraps POST /api/leads (Phase 11). Public — no auth needed. Optional fields
// (project_type / budget / timeline) are omitted when blank.
// -----------------------------------------------------------------------------

import apiClient from './apiClient.js';

export async function submitLead({ name, email, description, projectType, budget, timeline }) {
  const payload = { name, email, description };
  if (projectType) payload.project_type = projectType;
  if (budget) payload.budget = budget;
  if (timeline) payload.timeline = timeline;

  const { data } = await apiClient.post('/leads', payload);
  return data.data; // { lead_id, status }
}
