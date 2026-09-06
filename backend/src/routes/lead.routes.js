// -----------------------------------------------------------------------------
// lead.routes.js
//
// URL -> controller. Mounted at /api/leads in server.js.
//
// Public and unauthenticated: a visitor submits an enquiry. Rate limiting
// (leadsLimiter) is applied at the mount point in server.js.
// -----------------------------------------------------------------------------

import { Router } from 'express';
import { submitLead } from '../controllers/lead.controller.js';

const router = Router();

router.post('/', submitLead);

export default router;
