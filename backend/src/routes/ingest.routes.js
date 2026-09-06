// -----------------------------------------------------------------------------
// ingest.routes.js
//
// URL -> controller. Mounted at /api/ingest in server.js.
//
// devOnly is applied to the whole router: in production every route here is a
// 404. These endpoints (re)build the Qdrant knowledge base.
// -----------------------------------------------------------------------------

import { Router } from 'express';
import { devOnly } from '../middleware/devOnly.middleware.js';
import {
  runIngest,
  runIngestOffers,
  runIngestCustomer,
  runSearch,
} from '../controllers/ingest.controller.js';

const router = Router();

router.use(devOnly);

router.post('/', runIngest);
router.post('/offers', runIngestOffers);
router.post('/customer', runIngestCustomer);
router.post('/search', runSearch); // Phase 5 test aid; replaced by real retrieval in Phase 7

export default router;
