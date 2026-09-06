// -----------------------------------------------------------------------------
// admin.routes.js
//
// URL -> controller. Mounted at /api/admin in server.js.
//   POST  /login                  public, brute-force limited
//   GET   /tickets                requireAdmin
//   PATCH /tickets/:id/resolve    requireAdmin
// -----------------------------------------------------------------------------

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
