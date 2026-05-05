/**
 * ============================================================
 * CRON MANAGEMENT CONTROLLER
 * ============================================================
 * APIs to manually trigger, manage, and monitor cron jobs
 * Use for testing and admin purposes
 */

import logger from '../config/logger.js';
import {
  initializeFormulaCron,
  stopCronJob,
  stopAllCronJobs,
  getActiveCrons,
  getCronLogs,
  getCronLogsByJob,
  getLastCronExecution,
  validateCronExpression
} from '../crons/cronUtils.js';

/**
 * GET - Active cron jobs
 */
export const getActiveJobs = async (req, res) => {
  try {
    const result = getActiveCrons();
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Retrieved active cron jobs'
    });
  } catch (error) {
    console.error('❌ Error getting active jobs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get active jobs',
      error: error.message
    });
  }
};

/**
 * POST - Get cron logs
 */
export const getCronJobLogs = async (req, res) => {
  try {
    const { limit = 10, job_name } = req.body;

    let result;
    if (job_name) {
      result = await getCronLogsByJob(job_name, limit);
    } else {
      result = await getCronLogs(limit);
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch logs',
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      count: result.data.length,
      message: 'Retrieved cron logs'
    });
  } catch (error) {
    console.error('❌ Error fetching logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message
    });
  }
};

/**
 * GET - Last execution of a cron job
 */
export const getLastExecution = async (req, res) => {
  try {
    const { job_name } = req.query;

    if (!job_name) {
      return res.status(400).json({
        success: false,
        message: 'job_name is required'
      });
    }

    const result = await getLastCronExecution(job_name);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch last execution',
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Retrieved last execution'
    });
  } catch (error) {
    console.error('❌ Error fetching last execution:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch last execution',
      error: error.message
    });
  }
};

/**
 * POST - Start formula cron job manually
 */
export const startFormulaCronManual = async (req, res) => {
  try {
    const result = initializeFormulaCron();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    logger.info('Formula cron started manually');

    return res.status(200).json({
      success: true,
      message: result.message,
      data: getActiveCrons()
    });
  } catch (error) {
    console.error('❌ Error starting formula cron:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start cron',
      error: error.message
    });
  }
};

/**
 * POST - Stop a specific cron job
 */
export const stopCronJobManual = async (req, res) => {
  try {
    const { job_name } = req.body;

    if (!job_name) {
      return res.status(400).json({
        success: false,
        message: 'job_name is required in request body'
      });
    }

    const result = stopCronJob(job_name);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    logger.info(`Cron job stopped: ${job_name}`);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: getActiveCrons()
    });
  } catch (error) {
    console.error('❌ Error stopping cron:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop cron',
      error: error.message
    });
  }
};

/**
 * POST - Stop all cron jobs
 */
export const stopAllCronsManual = async (req, res) => {
  try {
    const result = stopAllCronJobs();

    logger.warn('All cron jobs stopped manually');

    return res.status(200).json({
      success: true,
      message: result.message,
      data: getActiveCrons()
    });
  } catch (error) {
    console.error('❌ Error stopping all crons:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop all crons',
      error: error.message
    });
  }
};

/**
 * POST - Validate cron expression
 */
export const validateCron = async (req, res) => {
  try {
    const { expression } = req.body;

    if (!expression) {
      return res.status(400).json({
        success: false,
        message: 'Cron expression is required'
      });
    }

    const isValid = validateCronExpression(expression);

    return res.status(200).json({
      success: true,
      valid: isValid,
      expression: expression,
      message: isValid ? 'Valid cron expression' : 'Invalid cron expression'
    });
  } catch (error) {
    console.error('❌ Error validating cron:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate cron',
      error: error.message
    });
  }
};
