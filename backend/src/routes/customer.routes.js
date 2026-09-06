// -----------------------------------------------------------------------------
// customer.routes.js
//
// URL -> controller. Mounted at /api/customer in server.js.
//
// requireAuth is applied to the whole router, so every endpoint here needs a
// valid Bearer token and every controller can rely on req.customer being set.
// -----------------------------------------------------------------------------

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getProfile,
  listProjects,
  getProject,
  listSubscriptions,
  listTickets,
  raiseTicket,
} from '../controllers/customer.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.get('/projects', listProjects);
router.get('/projects/:id', getProject);
router.get('/subscription', listSubscriptions);
router.get('/tickets', listTickets);
router.post('/tickets', raiseTicket); // raise a new support ticket

export default router;
