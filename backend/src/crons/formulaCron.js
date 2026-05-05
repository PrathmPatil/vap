import cron from 'node-cron';
import logger from '../config/logger.js';
import { CronLogModel } from '../models/index.js';
import {
  runFormulaEngineService,
  generateStrongBullishService,
  generateFollowThroughDayService,
  generateBuyDayService,
  generateRallyAttemptService,
  generateVolumeBreakoutService,
  detectTweezerBottomPatterns
} from '../services/formulaService.js';

/**
 * ============================================================
 * FORMULA CRON JOB - RUNS AT 11 PM EVERY DAY
 * ============================================================
 * This cron job executes all formula calculations and stores
 * the results in the database instead of running them
 * synchronously when the frontend calls the APIs.
 */

export const startFormulaCron = () => {
  // Cron expression: "0 23 * * *" means at 23:00 (11 PM) every day
  const cronExpression = '0 23 * * *';

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
      // Log cron start
      const cronLogEntry = await CronLogModel.create({
        job_name: 'formula_calculation_job',
        status: cronStatus,
        start_time: startTime,
        details: 'Started formula calculations at 11 PM'
      });

      const cronLogId = cronLogEntry.id;

      // ============================================================
      // 1. RUN FORMULA ENGINE (Main Engine)
      // ============================================================
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
          'symbols processed'
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

      // ============================================================
      // 2. GENERATE RALLY ATTEMPT DAY
      // ============================================================
      try {
        console.log('⏳ Generating Rally Attempt Day patterns...');
        const rallyResult = await generateRallyAttemptService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: ''
        });
        if (rallyResult.success) {
          executedFormulas.push({
            formula: 'Rally Attempt Day',
            status: 'success',
            count: rallyResult.count || 0
          });
          totalProcessed += rallyResult.count || 0;
          console.log('✅ Rally Attempt Day completed:', rallyResult.count, 'records');
        } else {
          throw new Error(rallyResult.message);
        }
      } catch (error) {
        console.error('❌ Rally Attempt Error:', error.message);
        executedFormulas.push({
          formula: 'Rally Attempt Day',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      // ============================================================
      // 3. GENERATE FOLLOW THROUGH DAY
      // ============================================================
      try {
        console.log('⏳ Generating Follow Through Day patterns...');
        const ftdResult = await generateFollowThroughDayService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: ''
        });
        if (ftdResult.success) {
          executedFormulas.push({
            formula: 'Follow Through Day',
            status: 'success',
            count: ftdResult.totalItems || 0
          });
          totalProcessed += ftdResult.totalItems || 0;
          console.log('✅ Follow Through Day completed:', ftdResult.totalItems, 'records');
        } else {
          throw new Error(ftdResult.message);
        }
      } catch (error) {
        console.error('❌ Follow Through Day Error:', error.message);
        executedFormulas.push({
          formula: 'Follow Through Day',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      // ============================================================
      // 4. GENERATE BUY DAY
      // ============================================================
      try {
        console.log('⏳ Generating Buy Day patterns...');
        const buyDayResult = await generateBuyDayService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: ''
        });
        if (buyDayResult.success) {
          executedFormulas.push({
            formula: 'Buy Day',
            status: 'success',
            count: buyDayResult.totalItems || 0
          });
          totalProcessed += buyDayResult.totalItems || 0;
          console.log('✅ Buy Day completed:', buyDayResult.totalItems, 'records');
        } else {
          throw new Error(buyDayResult.message);
        }
      } catch (error) {
        console.error('❌ Buy Day Error:', error.message);
        executedFormulas.push({
          formula: 'Buy Day',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      // ============================================================
      // 5. GENERATE STRONG BULLISH CANDLES
      // ============================================================
      try {
        console.log('⏳ Generating Strong Bullish Candles...');
        const bullishResult = await generateStrongBullishService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: '',
          base_percent: 2
        });
        if (bullishResult.success) {
          executedFormulas.push({
            formula: 'Strong Bullish Candles',
            status: 'success',
            count: bullishResult.inserted_rows || 0
          });
          totalProcessed += bullishResult.inserted_rows || 0;
          console.log('✅ Strong Bullish Candles completed:', bullishResult.inserted_rows, 'records');
        } else {
          throw new Error(bullishResult.message);
        }
      } catch (error) {
        console.error('❌ Strong Bullish Error:', error.message);
        executedFormulas.push({
          formula: 'Strong Bullish Candles',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      // ============================================================
      // 6. GENERATE VOLUME BREAKOUTS
      // ============================================================
      try {
        console.log('⏳ Generating Volume Breakouts...');
        const volumeResult = await generateVolumeBreakoutService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: ''
        });
        if (volumeResult.success) {
          executedFormulas.push({
            formula: 'Volume Breakouts',
            status: 'success',
            count: volumeResult.totalItems || 0
          });
          totalProcessed += volumeResult.totalItems || 0;
          console.log('✅ Volume Breakouts completed:', volumeResult.totalItems, 'records');
        } else {
          throw new Error(volumeResult.message);
        }
      } catch (error) {
        console.error('❌ Volume Breakouts Error:', error.message);
        executedFormulas.push({
          formula: 'Volume Breakouts',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      // ============================================================
      // 7. DETECT TWEEZER BOTTOM PATTERNS
      // ============================================================
      try {
        console.log('⏳ Detecting Tweezer Bottom Patterns...');
        const tweezerResult = await detectTweezerBottomPatterns({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: ''
        });
        if (tweezerResult.success) {
          executedFormulas.push({
            formula: 'Tweezer Bottom Patterns',
            status: 'success',
            count: tweezerResult.totalItems || 0
          });
          totalProcessed += tweezerResult.totalItems || 0;
          console.log('✅ Tweezer Bottom Patterns completed:', tweezerResult.totalItems, 'records');
        } else {
          throw new Error(tweezerResult.message);
        }
      } catch (error) {
        console.error('❌ Tweezer Bottom Error:', error.message);
        executedFormulas.push({
          formula: 'Tweezer Bottom Patterns',
          status: 'failed',
          error: error.message
        });
        totalErrors++;
      }

      // ============================================================
      // UPDATE CRON LOG WITH SUCCESS
      // ============================================================
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

      // Log the error
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

  console.log('✨ Formula Cron Job scheduled at 11 PM every day (0 23 * * *)');

  return job;
};

// ALTERNATIVE CRON EXPRESSIONS FOR TESTING:
// - '*/5 * * * *' = every 5 minutes
// - '*/30 * * * *' = every 30 minutes
// - '0 * * * *' = every hour
// - '0 23 * * *' = 11 PM every day (PRODUCTION)
// - '0 9 * * MON' = 9 AM every Monday
