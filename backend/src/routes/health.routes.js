// -----------------------------------------------------------------------------
// health.routes.js
//
// A route file maps URLs to controller functions. It should contain no logic.
// Keeping routes and controllers separate means you can look at one small file
// and immediately see every URL this part of the API exposes.
// -----------------------------------------------------------------------------

import { Router } from 'express';
import { getHealth, ping, getDbHealth } from '../controllers/health.controller.js';

const router = Router();

// These become /api/health, /api/health/ping and /api/health/db once mounted
// in server.js
router.get('/', getHealth);
router.get('/ping', ping);
router.get('/db', getDbHealth);

export default router;
