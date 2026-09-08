// Mounted at /api/chat. optionalAuth runs first — a signed-in customer gets
// req.customer, a visitor doesn't, neither is rejected; retrieval branches on it.

import { Router } from 'express';
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';
import { postChat, getChatHistory } from '../controllers/chat.controller.js';

const router = Router();

router.post('/', optionalAuth, postChat);
// Transcript for the current session, scoped to the caller in the controller.
router.get('/history', optionalAuth, getChatHistory);

export default router;
