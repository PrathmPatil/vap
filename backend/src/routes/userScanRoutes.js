import express from 'express';
import { authenticate, requireMaster } from '../middlewares/auth.middleware.js';
import {
  listScans,
  createScan,
  updateScan,
  deleteScan,
  runScan,
} from '../controllers/userScanController.js';

const router = express.Router();
const adminOnly = [authenticate, requireMaster];

router.get('/', ...adminOnly, listScans);
router.post('/', ...adminOnly, createScan);
router.put('/:id', ...adminOnly, updateScan);
router.delete('/:id', ...adminOnly, deleteScan);
router.post('/:id/run', ...adminOnly, runScan);

export default router;
