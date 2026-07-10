import express from 'express';
import { authenticate, requireMaster } from '../middlewares/auth.middleware.js';
import {
  getActiveJobs,
  getCronJobLogs,
  getLastExecution,
  startFormulaCronManual,
  stopCronJobManual,
  stopAllCronsManual,
  validateCron
} from '../controllers/cronManagementController.js';

const router = express.Router();
const adminOnly = [authenticate, requireMaster];

// Get active cron jobs
router.get('/active-jobs', ...adminOnly, getActiveJobs);

// Get cron logs
router.post('/logs', ...adminOnly, getCronJobLogs);

// Get last execution of a cron job
router.get('/last-execution', ...adminOnly, getLastExecution);

// Start formula cron manually
router.post('/start-formula-cron', ...adminOnly, startFormulaCronManual);

// Stop a specific cron job
router.post('/stop-cron', ...adminOnly, stopCronJobManual);

// Stop all cron jobs
router.post('/stop-all-crons', ...adminOnly, stopAllCronsManual);

// Validate cron expression
router.post('/validate-expression', ...adminOnly, validateCron);

export default router;
