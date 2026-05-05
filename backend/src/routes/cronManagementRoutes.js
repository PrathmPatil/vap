import express from 'express';
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

/**
 * ============================================================
 * CRON MANAGEMENT ROUTES
 * ============================================================
 * Admin endpoints to manage and monitor cron jobs
 * 
 * Note: Consider adding authentication middleware before
 * deploying to production
 */

// Get active cron jobs
router.get('/active-jobs', getActiveJobs);

// Get cron logs
router.post('/logs', getCronJobLogs);

// Get last execution of a cron job
router.get('/last-execution', getLastExecution);

// Start formula cron manually
router.post('/start-formula-cron', startFormulaCronManual);

// Stop a specific cron job
router.post('/stop-cron', stopCronJobManual);

// Stop all cron jobs
router.post('/stop-all-crons', stopAllCronsManual);

// Validate cron expression
router.post('/validate-expression', validateCron);

export default router;
