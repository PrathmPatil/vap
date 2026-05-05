import cron from 'node-cron';
import logger from '../config/logger.js';
import { CronLogModel } from '../models/index.js';
import { startFormulaCron } from './formulaCron.js';

/**
 * ============================================================
 * CRON UTILITIES - FOR TESTING AND MANUAL TRIGGERS
 * ============================================================
 * Use these functions to manage, test, and trigger cron jobs
 */

// Store all active cron jobs
const activeCrons = new Map();

/**
 * Start the formula cron job
 * Can be called manually if needed
 */
export const initializeFormulaCron = () => {
  if (!activeCrons.has('formula_cron')) {
    const job = startFormulaCron();
    activeCrons.set('formula_cron', job);
    return { success: true, message: 'Formula cron started' };
  }
  return { success: false, message: 'Formula cron already running' };
};

/**
 * Stop a specific cron job
 */
export const stopCronJob = (jobName) => {
  const job = activeCrons.get(jobName);
  if (job) {
    job.stop();
    job.destroy();
    activeCrons.delete(jobName);
    logger.info(`✅ Stopped cron job: ${jobName}`);
    return { success: true, message: `Stopped: ${jobName}` };
  }
  return { success: false, message: `Job not found: ${jobName}` };
};

/**
 * Stop all cron jobs
 */
export const stopAllCronJobs = () => {
  for (const [jobName, job] of activeCrons) {
    job.stop();
    job.destroy();
  }
  activeCrons.clear();
  logger.info('✅ All cron jobs stopped');
  return { success: true, message: 'All cron jobs stopped' };
};

/**
 * Get list of all active cron jobs
 */
export const getActiveCrons = () => {
  return {
    active_jobs: Array.from(activeCrons.keys()),
    total: activeCrons.size
  };
};

/**
 * Validate cron expression
 * @param {string} cronExpression - Cron expression to validate
 * @returns {boolean} - true if valid, false otherwise
 */
export const validateCronExpression = (cronExpression) => {
  try {
    const cronFields = cronExpression.split(' ');
    if (cronFields.length < 5) return false;
    
    // Validate each field
    const [minute, hour, day, month, dayOfWeek] = cronFields.slice(0, 5);
    
    if (minute === '*' || minute === '?' || /^\d{1,2}$/.test(minute)) {
      if (hour === '*' || hour === '?' || /^\d{1,2}$/.test(hour)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

// CRON EXPRESSIONS REFERENCE:
//
// ┌───────────── minute (0 - 59)
// │ ┌───────────── hour (0 - 23)
// │ │ ┌───────────── day of month (1 - 31)
// │ │ │ ┌───────────── month (1 - 12)
// │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
// │ │ │ │ │
// │ │ │ │ │
// * * * * * *
//
// COMMON EXAMPLES:
// '*/5 * * * *'   - Every 5 minutes
// '*/30 * * * *'  - Every 30 minutes
// '0 * * * *'     - Every hour at minute 0
// '0 23 * * *'    - 11 PM every day (PRODUCTION)
// '0 9 * * MON'   - 9 AM every Monday
// '0 0 1 * *'     - 12 AM (midnight) on the 1st of every month
// '30 4 * * 5'    - 4:30 AM every Friday

export const CRON_PRESETS = {
  EVERY_5_MINS: '*/5 * * * *',
  EVERY_30_MINS: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  DAILY_11PM: '0 23 * * *',        // PRODUCTION
  DAILY_9AM: '0 9 * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
  MONDAY_9AM: '0 9 * * 1',
  FRIDAY_430AM: '30 4 * * 5',
  MONTHLY_1ST: '0 0 1 * *'
};

/**
 * Get cron logs from database
 */
export const getCronLogs = async (limit = 10) => {
  try {
    const logs = await CronLogModel.findAll({
      order: [['start_time', 'DESC']],
      limit,
      raw: true
    });
    return { success: true, data: logs };
  } catch (error) {
    logger.error('Error fetching cron logs:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get cron logs by job name
 */
export const getCronLogsByJob = async (jobName, limit = 10) => {
  try {
    const logs = await CronLogModel.findAll({
      where: { job_name: jobName },
      order: [['start_time', 'DESC']],
      limit,
      raw: true
    });
    return { success: true, data: logs };
  } catch (error) {
    logger.error(`Error fetching logs for job ${jobName}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get the last execution of a cron job
 */
export const getLastCronExecution = async (jobName) => {
  try {
    const log = await CronLogModel.findOne({
      where: { job_name: jobName },
      order: [['start_time', 'DESC']],
      raw: true
    });
    return { success: true, data: log };
  } catch (error) {
    logger.error(`Error fetching last execution for ${jobName}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default {
  initializeFormulaCron,
  stopCronJob,
  stopAllCronJobs,
  getActiveCrons,
  validateCronExpression,
  getCronLogs,
  getCronLogsByJob,
  getLastCronExecution,
  CRON_PRESETS
};
