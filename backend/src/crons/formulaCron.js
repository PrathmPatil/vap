import cron from 'node-cron';
import logger from '../config/logger.js';
import { CronLogModel } from '../models/index.js';
import { runFormulaEngineService } from '../services/formulaService.js';

/**
 * ============================================================
 * FORMULA CRON JOB
 * ============================================================
 * Runs formula engine and stores execution logs.
 */

const CRON_STATUS = {
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED'
};

export const startFormulaCron = () => {
  // Every hour at minute 5 (Testing)
  // Production: '0 23 * * *' => 11 PM daily
  const cronExpression = '0 23 * * *'; 
  //  const cronExpression = '5 * * * *';

  const job = cron.schedule(cronExpression, async () => {
    console.log('\n🚀 ============================================');
    console.log('🚀 FORMULA CRON JOB STARTED');
    console.log('🚀 ============================================\n');

    const startTime = new Date();

    let totalProcessed = 0;
    let totalErrors = 0;
    let cronLogId = null;

    const executedFormulas = [];

    try {
      /**
       * ============================================================
       * CREATE INITIAL CRON LOG
       * ============================================================
       */
      const cronLogEntry = await CronLogModel.create({
        job_name: 'formula_calculation_job',
        job_group: 'FORMULA_ENGINE',

        status: CRON_STATUS.RUNNING,

        start_time: startTime,

        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,

        additional_data: {
          message: 'Formula cron job started'
        }
      });

      cronLogId = cronLogEntry.id;

      /**
       * ============================================================
       * RUN FORMULA ENGINE
       * ============================================================
       */
      try {
        console.log('⏳ Running Complete Formula Engine...\n');

        const engineResult = await runFormulaEngineService();

        const processedCount = engineResult?.processed_symbols || 0;

        executedFormulas.push({
          formula: 'Formula Engine',
          status: CRON_STATUS.SUCCESS,
          processed: processedCount,
          duration_ms: engineResult?.duration_ms || 0
        });

        totalProcessed += processedCount;

        console.log(
          `✅ Formula Engine completed: ${processedCount} rows processed`
        );
      } catch (error) {
        console.error('❌ Formula Engine Error:', error.message);

        executedFormulas.push({
          formula: 'Formula Engine',
          status: CRON_STATUS.FAILED,
          error: error.message
        });

        totalErrors++;
      }

      /**
       * ============================================================
       * UPDATE CRON LOG AS SUCCESS
       * ============================================================
       */
      const endTime = new Date();

      const durationSeconds =
        (endTime.getTime() - startTime.getTime()) / 1000;

      await CronLogModel.update(
        {
          status: CRON_STATUS.SUCCESS,

          end_time: endTime,

          duration_seconds: durationSeconds,

          records_processed: totalProcessed,

          additional_data: {
            total_processed: totalProcessed,
            total_errors: totalErrors,
            executed_formulas: executedFormulas
          }
        },
        {
          where: {
            id: cronLogId
          }
        }
      );

      console.log('\n✅ ============================================');
      console.log('✅ FORMULA CRON JOB COMPLETED');
      console.log('✅ Total Records Processed:', totalProcessed);
      console.log('✅ Total Errors:', totalErrors);
      console.log(
        '✅ Duration:',
        `${durationSeconds.toFixed(2)} seconds`
      );
      console.log('✅ ============================================\n');

      logger.info(
        `Formula Cron Job completed successfully. Processed: ${totalProcessed}, Errors: ${totalErrors}, Duration: ${durationSeconds}s`
      );
    } catch (error) {
      console.error('\n❌ ============================================');
      console.error('❌ FORMULA CRON JOB FAILED');
      console.error('❌ Error:', error.message);
      console.error('❌ ============================================\n');

      try {
        /**
         * ============================================================
         * UPDATE EXISTING LOG AS FAILED
         * ============================================================
         */
        if (cronLogId) {
          const endTime = new Date();

          const durationSeconds =
            (endTime.getTime() - startTime.getTime()) / 1000;

          await CronLogModel.update(
            {
              status: CRON_STATUS.FAILED,

              end_time: endTime,

              duration_seconds: durationSeconds,

              error_message: error.message,

              error_traceback: error.stack,

              additional_data: {
                total_processed: totalProcessed,
                total_errors: totalErrors,
                executed_formulas: executedFormulas
              }
            },
            {
              where: {
                id: cronLogId
              }
            }
          );
        } else {
          /**
           * ============================================================
           * CREATE FAILED LOG IF INITIAL INSERT FAILED
           * ============================================================
           */
          await CronLogModel.create({
            job_name: 'formula_calculation_job',

            job_group: 'FORMULA_ENGINE',

            status: CRON_STATUS.FAILED,

            start_time: startTime,

            end_time: new Date(),

            error_message: error.message,

            error_traceback: error.stack,

            additional_data: {
              message: 'Cron job failed before initialization'
            }
          });
        }
      } catch (logError) {
        console.error(
          '❌ Failed to save cron error log:',
          logError.message
        );
      }

      logger.error(`Formula Cron Job failed: ${error.message}`);
    }
  });

  console.log(
    '✨ Formula Cron Job scheduled successfully:',
    cronExpression
  );

  return job;
};