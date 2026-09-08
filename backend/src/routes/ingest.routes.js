// Mounted at /api/ingest. devOnly guards the whole router — every route here is
// a 404 in production. These endpoints (re)build the Qdrant knowledge base.

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
router.post('/search', runSearch); // test aid — real retrieval lives in retrieval.service.js

export default router;
