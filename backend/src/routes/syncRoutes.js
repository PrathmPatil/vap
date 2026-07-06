import express from 'express';
import {
  syncMarketHolidays,
  syncIpoData,
  syncReferenceData
} from '../controllers/syncController.js';

const router = express.Router();

router.post('/holidays', syncMarketHolidays);
router.post('/ipo', syncIpoData);
router.post('/all', syncReferenceData);

export default router;
