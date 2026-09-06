// -----------------------------------------------------------------------------
// chat.routes.js
//
// URL -> controller. Mounted at /api/chat in server.js.
//
// optionalAuth runs first: a signed-in customer gets req.customer set, a
// visitor does not, and neither is rejected. Phase 6 answers are the same for
// both; later phases branch on req.customer for retrieval.
// -----------------------------------------------------------------------------

import { Router } from 'express';
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';
import { postChat, getChatHistory } from '../controllers/chat.controller.js';

const router = Router();

router.post('/', optionalAuth, postChat);

// Phase 10: transcript for the current session, scoped to the caller in the
// controller (own customer row, or the anonymous row for that session_id).
router.get('/history', optionalAuth, getChatHistory);

export default router;
