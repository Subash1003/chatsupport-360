// -----------------------------------------------------------------------------
// lead.service.js
//
// Business logic for lead capture. No req/res here.
//
// Inputs arrive already validated/cleaned by the controller. This layer just
// hands them to the model and shapes the result. Lead text is stored in MySQL
// via bound parameters only — it is never sent to the LLM — so no prompt
// sanitisation is needed here.
// -----------------------------------------------------------------------------

import { insertLead } from '../models/lead.model.js';

export async function createLead(fields) {
  const leadId = await insertLead(fields);
  return { lead_id: leadId, status: 'new' };
}
