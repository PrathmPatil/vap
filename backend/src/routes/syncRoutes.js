import express from 'express';
import { authenticate, requireMaster } from '../middlewares/auth.middleware.js';
import {
  syncMarketHolidays,
  syncIpoData,
  syncReferenceData
} from '../controllers/syncController.js';

const router = express.Router();
const adminOnly = [authenticate, requireMaster];

router.post('/holidays', ...adminOnly, syncMarketHolidays);
router.post('/ipo', ...adminOnly, syncIpoData);
router.post('/all', ...adminOnly, syncReferenceData);

export default router;
