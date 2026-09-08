// POST /api/leads is public (a visitor submitting interest) and rate-limited in
// server.js. Required: name, email, description. Optional free text:
// project_type, budget, timeline (people write "8-12 lakhs", "around 3 months").

import { asyncHandler } from '../utils/asyncHandler.js';
import * as leadService from '../services/lead.service.js';
import {
  requireBody,
  normaliseEmail,
  validateName,
  validateText,
  validateOptionalText,
} from '../utils/validation.js';

export const submitLead = asyncHandler(async (req, res) => {
  requireBody(req.body, ['name', 'email', 'description']);

  const fields = {
    name: validateName(req.body.name),
    email: normaliseEmail(req.body.email),
    description: validateText(req.body.description, { label: 'description', min: 5, max: 5000 }),
    projectType: validateOptionalText(req.body.project_type, { label: 'project_type', max: 100 }),
    budget: validateOptionalText(req.body.budget, { label: 'budget', max: 100 }),
    timeline: validateOptionalText(req.body.timeline, { label: 'timeline', max: 100 }),
  };

  const data = await leadService.createLead(fields);

  res.status(201).json({
    success: true,
    message: 'Thanks — your enquiry has been received. Our team will be in touch.',
    data,
  });
});
