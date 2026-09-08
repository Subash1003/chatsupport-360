// Lead capture. Inputs arrive already validated by the controller. Lead text is
// stored via bound parameters and never sent to the LLM, so no prompt
// sanitisation is needed here.

import { insertLead } from '../models/lead.model.js';

export async function createLead(fields) {
  const leadId = await insertLead(fields);
  return { lead_id: leadId, status: 'new' };
}
