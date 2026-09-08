// Mounted at /api/customer. requireAuth guards the whole router, so every
// controller can rely on req.customer.

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
router.post('/tickets', raiseTicket);

export default router;
