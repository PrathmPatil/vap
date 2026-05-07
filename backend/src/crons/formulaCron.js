import cron from 'node-cron';
import logger from '../config/logger.js';
import { CronLogModel } from '../models/index.js';
import { runFormulaEngineService } from '../services/formulaService.js';

/**
 * ============================================================
 * FORMULA CRON JOB - RUNS AT 11 PM EVERY DAY
 * ============================================================
 * This cron job executes the formula engine once per day and
 * stores the results in the formula database for the UI to read.
 */

export const startFormulaCron = () => {
  const cronExpression = '5 * * * *'; // Every hour at minute 5 (for testing)

  const job = cron.schedule(cronExpression, async () => {
    console.log('\n🚀 ============================================');
    console.log('🚀 FORMULA CRON JOB STARTED AT 11 PM');
    console.log('🚀 ============================================\n');

    const startTime = new Date();
    let cronStatus = 'in_progress';
    let totalProcessed = 0;
    let totalErrors = 0;
    const executedFormulas = [];

    try {
      const cronLogEntry = await CronLogModel.create({
        job_name: 'formula_calculation_job',
        status: cronStatus,
        start_time: startTime,
        details: 'Started formula calculations at 11 PM'
      });

      const cronLogId = cronLogEntry.id;

      try {
        console.log('⏳ Running Complete Formula Engine...');
        const engineResult = await runFormulaEngineService();

        executedFormulas.push({
          formula: 'Formula Engine',
          status: 'success',
          processed: engineResult.processed_symbols || 0,
          duration_ms: engineResult.duration_ms
        });
        totalProcessed += engineResult.processed_symbols || 0;

        console.log(
          '✅ Formula Engine completed:',
          engineResult.processed_symbols,
          'rows processed'
        );
      } catch (error) {
        console.error('❌ Formula Engine Error:', error.message);
        executedFormulas.push({
          formula: 'Formula Engine',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      const endTime = new Date();
      const duration = endTime - startTime;

      await CronLogModel.update(
        {
          status: 'completed',
          end_time: endTime,
          details: `Successfully executed all formula calculations. Total records processed: ${totalProcessed}. Total errors: ${totalErrors}. Formulas executed: ${JSON.stringify(executedFormulas)}`
        },
        { where: { id: cronLogId } }
      );

      console.log('\n✅ ============================================');
      console.log('✅ FORMULA CRON JOB COMPLETED');
      console.log('✅ Total Records Processed:', totalProcessed);
      console.log('✅ Total Errors:', totalErrors);
      console.log('✅ Duration:', `${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      console.log('✅ ============================================\n');

      logger.info(
        `Formula Cron Job completed. Processed: ${totalProcessed}, Errors: ${totalErrors}, Duration: ${duration}ms`
      );
    } catch (error) {
      console.error('\n❌ ============================================');
      console.error('❌ FORMULA CRON JOB FAILED');
      console.error('❌ Error:', error.message);
      console.error('❌ ============================================\n');

      try {
        await CronLogModel.create({
          job_name: 'formula_calculation_job',
          status: 'failed',
          start_time: startTime,
          end_time: new Date(),
          details: `Cron job failed with error: ${error.message}`
        });
      } catch (logError) {
        console.error('Failed to log error to database:', logError.message);
      }

      logger.error(`Formula Cron Job failed: ${error.message}`);
    }
  });

  console.log('✨ Formula Cron Job scheduled at 11 PM every day (5 * * * *)');

  return job;
};

// ALTERNATIVE CRON EXPRESSIONS FOR TESTING:
// - '*/5 * * * *' = every 5 minutes
// - '*/30 * * * *' = every 30 minutes
// - '0 * * * *' = every hour
// - '0 23 * * *' = 11 PM every day (PRODUCTION)
// - '0 9 * * MON' = 9 AM every Monday
// - '0 23 * * *' = 11 PM every day