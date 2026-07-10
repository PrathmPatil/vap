import dotenv from 'dotenv';
dotenv.config();
// import passport from "passport";
// import "./config/passport.js";

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger, { logStream } from './config/logger.js';

import {
  appErrorHandler,
  genericErrorHandler,
  notFound
} from './middlewares/error.middleware.js';

import { errorHandler } from './middlewares/errorHandler.middleware.js';

// Routes
import stockDataRoutes from './routes/stockData.routes.js';
import companyDataRoutes from './routes/companyData.routes.js';
import bhavcopyDataRoutes from './routes/bhavcopyDataRoutes.js';
import financialDataRoutes from './routes/financialData.routes.js';
import yFinanceRoutes from './routes/yfinance.routes.js';
import screenerDataRoutes from './routes/screenerData.routes.js';
import ipoRoutes from './routes/ipoDataRoutes.js';
import announcementsRoutes from './routes/announcementsRoutes.js';
import govNewsRouter from './routes/govNewsRouter.js';
import indicesRoute from './routes/ingestRoutes.js';
import finnhubRoute from './routes/finnhubRoutes.js';
import formulaRoutes from './routes/formulaRoutes.js';
import userRoutes from './routes/userRoutes.js';
import holidayRoutes from './routes/marketHolidayRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import logRoutes from './routes/cronLogRoutes.js';
import cronManagementRoutes from './routes/cronManagementRoutes.js';
import { startFormulaCron } from './crons/formulaCron.js';
import { ensureMasterUser } from './config/ensureMasterUser.js';
import { ensureIpoColumns } from './config/ensureIpoColumns.js';
import { runStartupMigrations } from './config/startupMigrations.js';
import { resolveBhavcopyDbName, resolveStockDbName } from './config/dbEnv.js';
import { bootstrapReferenceData } from './services/pythonSyncService.js';

import {
  sequelizeStockMarket,
  sequelizeBhavcopy,
  sequelizeYFinanceDB,
  MainboardData,
  SmeData,
  StrongBullishCandleModel,
  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
  VolumeBreakoutModel,
  TweezerBottomModel,
  BearishCandleModel,
  GapUpDayModel,
  GapDownDayModel,
  FiftyTwoWeekHighModel,
  TopGainerDayModel,
  BandHit52wModel,
  TopLoserDayModel,
  FiftyTwoWeekLowModel,
  DailyMoverUpModel,
  DailyMoverDownModel,
  MarketHolidayModel,
  CronLogModel
} from './models/index.js';

// Init app
const app = express();

// ==========================================
// CORS (FIXED)
// ==========================================
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://44.199.57.0:3000',
      'http://44.199.57.0',
      'http://trendtraders.in',
      'https://trendtraders.in'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  })
);

app.use(helmet());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(morgan('combined', { stream: logStream }));
// app.use(passport.initialize());
// DB connections
export const startServer = async () => {
  try {
    console.log('Starting DB connections...');

    // await sequelizeStockMarket.authenticate();
    // logger.info('✅ Connected to stock_market database.');
    // await sequelizeStockMarket.sync();
    // logger.info('✅ stock_market database synced.');

    // await sequelizeBhavcopy.authenticate();
    // logger.info('✅ Connected to bhavcopy database.');
    // await sequelizeBhavcopy.sync();
    // logger.info('✅ bhavcopy database synced.');

    // await sequelizeScreener.authenticate();
    // logger.info('✅ Connected to screener_data database.');
    // await sequelizeScreener.sync();
    // logger.info('✅ screener_data database synced.');

    // await sequelizeYFinanceDB.authenticate();
    // logger.info('✅ Connected to third_db database.');
    // await sequelizeYFinanceDB.sync();
    // logger.info('✅ third_db database synced.');

    // await sequelizeIPO.authenticate();
    // logger.info('✅ Connected to ipo_data_fastapi database.');
    // await sequelizeIPO.sync();
    // logger.info('✅ ipo_data_fastapi database synced.');

    // await sequelizeAnnouncement.authenticate();
    // logger.info('✅ Connected to bse_data database.');
    // await sequelizeAnnouncement.sync();
    // logger.info('✅ bse_data database synced.');

    // ============================================================
    // AUTHENTICATE & SYNC FORMULA TABLES (stock market DB)
    // ============================================================
    try {
      await sequelizeBhavcopy.authenticate();
      logger.info(`✅ Connected to bhavcopy database (${resolveBhavcopyDbName()}).`);

      await sequelizeStockMarket.authenticate();
      logger.info(
        `✅ Connected to stock market database (${resolveStockDbName()}).`
      );
      console.log(
        `✅ Connected to stock market database (${resolveStockDbName()}).`
      );

      await runStartupMigrations({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      });

      await ensureIpoColumns({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      });

      await RallyAttemptDayModel.sync();
      logger.info('✅ RallyAttemptDay table synced.');
      console.log('✅ RallyAttemptDay table synced.');

      await FollowThroughDayModel.sync();
      logger.info('✅ FollowThroughDay table synced.');
      console.log('✅ FollowThroughDay table synced.');

      await BuyDayModel.sync();
      logger.info('✅ BuyDay table synced.');
      console.log('✅ BuyDay table synced.');

      await StrongBullishCandleModel.sync();
      logger.info('✅ StrongBullishCandle table synced.');
      console.log('✅ StrongBullishCandle table synced.');

      await VolumeBreakoutModel.sync();
      logger.info('✅ VolumeBreakout table synced.');
      console.log('✅ VolumeBreakout table synced.');

      await TweezerBottomModel.sync();
      logger.info('✅ TweezerBottom table synced.');
      console.log('✅ TweezerBottom table synced.');

      await BearishCandleModel.sync();
      await GapUpDayModel.sync();
      await GapDownDayModel.sync();
      await FiftyTwoWeekHighModel.sync();
      await TopGainerDayModel.sync();
      await BandHit52wModel.sync();
      await TopLoserDayModel.sync();
      await FiftyTwoWeekLowModel.sync();
      await DailyMoverUpModel.sync();
      await DailyMoverDownModel.sync();
      logger.info('✅ Extended formula tables synced.');
      console.log('✅ Extended formula tables synced.');

      await CronLogModel.sync();
      logger.info('✅ CronLog table synced.');
      console.log('✅ CronLog table synced.');

      await MainboardData.sync();
      logger.info('✅ MainboardData table synced.');
      console.log('✅ MainboardData table synced.');

      await SmeData.sync();
      logger.info('✅ SmeData table synced.');
      console.log('✅ SmeData table synced.');

      await MarketHolidayModel.sync();
      logger.info('✅ MarketHoliday table synced.');
      console.log('✅ MarketHoliday table synced.');

      const [holidayCount, nseMainboardCount, nseSmeCount] = await Promise.all([
        MarketHolidayModel.count({ where: { is_active: 1 } }),
        MainboardData.count({ where: { data_source: 'nse' } }),
        SmeData.count({ where: { data_source: 'nse' } }),
      ]);

      if (holidayCount === 0 || (nseMainboardCount === 0 && nseSmeCount === 0)) {
        logger.info(
          `📥 Bootstrapping reference data (holidays=${holidayCount}, nse_mainboard=${nseMainboardCount}, nse_sme=${nseSmeCount})`
        );
        bootstrapReferenceData().catch((syncError) => {
          logger.warn(`⚠️ Reference data bootstrap failed: ${syncError.message}`);
        });
      }

      await ensureMasterUser();

      logger.info('✅ Formula tables synced in stock market database.');
      console.log('✅ Formula tables synced in stock market database.');
    } catch (formulaDbError) {
      logger.error('⚠️ Formula database connection failed', {
        message: formulaDbError.message,
        name: formulaDbError.name,
        parent: formulaDbError.parent,
        original: formulaDbError.original,
        stack: formulaDbError.stack
      });

      console.error('\n❌ ====================================');
      console.error('❌ FORMULA DB ERROR');
      console.error('====================================');

      console.error('NAME:', formulaDbError.name);

      console.error('MESSAGE:', formulaDbError.message);

      console.error('STACK:', formulaDbError.stack);

      if (formulaDbError.errors) {
        console.error(
          'ERRORS:',
          JSON.stringify(formulaDbError.errors, null, 2)
        );
      }

      if (formulaDbError.parent) {
        console.error('SQL ERROR:', formulaDbError.parent.sqlMessage);

        console.error('SQL:', formulaDbError.parent.sql);
      }

      console.error('====================================\n');
    }

    // ============================================================
    // START FORMULA CRON JOB
    // ============================================================
    startFormulaCron();

    const PORT = process.env.APP_PORT || 8000;
    const HOST = process.env.APP_HOST || 'localhost';

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on ${HOST}:${PORT}/vap/`);
      console.log(`🚀 Server running on ${HOST}:${PORT}/vap/`);
    });
  } catch (error) {
    logger.error('❌ Database connection or sync failed:', error);
    console.error('❌ Database connection or sync failed:', error);
    process.exit(1);
  }
};

// Routes
app.use('/vap/stocks', stockDataRoutes);
app.use('/vap/company-data', stockDataRoutes);
app.use('/vap/bhavcopy', bhavcopyDataRoutes);
app.use('/vap/financial-data', financialDataRoutes);
app.use('/vap/company', yFinanceRoutes);
app.use('/vap/screener', screenerDataRoutes);
app.use('/vap/ipo', ipoRoutes);
app.use('/vap/bse-news', announcementsRoutes);
app.use('/vap/gov-news', govNewsRouter);
app.use('/vap/indices', indicesRoute);
app.use('/vap/finnhub', finnhubRoute);
app.use('/vap/formula', formulaRoutes);
app.use('/vap/user', userRoutes);
app.use('/vap/holiday', holidayRoutes);
app.use('/vap/sync', syncRoutes);
app.use('/vap/logs', logRoutes);
app.use('/vap/cron-management', cronManagementRoutes);

app.get('/vap/welcome', (req, res) => {
  res.send('📂 Welcome to the Corporate Events Ingestion API.');
});

// Error Handlers
app.use(appErrorHandler);
app.use(errorHandler);
app.use(genericErrorHandler);
app.use(notFound);

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
