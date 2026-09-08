// Mounted at /api/leads. Public and unauthenticated; leadsLimiter is applied at
// the mount point in server.js.

import { Router } from 'express';
import { submitLead } from '../controllers/lead.controller.js';

const router = Router();

router.post('/', submitLead);

export default router;
