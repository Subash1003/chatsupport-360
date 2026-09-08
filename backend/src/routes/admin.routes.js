// Mounted at /api/admin.

import { Router } from 'express';

import { requireAdmin } from '../middleware/admin.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import {
  adminLogin,
  adminListTickets,
  adminResolveTicket,
} from '../controllers/admin.controller.js';

const router = Router();

router.post('/login', authLimiter, adminLogin);
router.get('/tickets', requireAdmin, adminListTickets);
router.patch('/tickets/:id/resolve', requireAdmin, adminResolveTicket);

export default router;
