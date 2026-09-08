// Mounted at /api/health → /api/health, /api/health/ping, /api/health/db.

import { Router } from 'express';
import { getHealth, ping, getDbHealth } from '../controllers/health.controller.js';

const router = Router();

router.get('/', getHealth);
router.get('/ping', ping);
router.get('/db', getDbHealth);

export default router;
