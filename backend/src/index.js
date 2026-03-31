
import dotenv from 'dotenv';
dotenv.config();
// import passport from "passport";
// import "./config/passport.js";

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger, { logStream } from './config/logger.js';

import { appErrorHandler, genericErrorHandler, notFound } from './middlewares/error.middleware.js';

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

import {
  sequelizeStockMarket,
  sequelizeBhavcopy,
  sequelizeYFinanceDB,
  sequelizeScreener,
  sequelizeIPO,
  sequelizeAnnouncement,
  StrongBullishCandleModel
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
      'https://trendtraders.in',
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
(async () => {
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

    // sequenilize formula tables.
    await StrongBullishCandleModel.sync();

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
})();

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
app.use("/vap/formula", formulaRoutes);
app.use('/vap/user', userRoutes);


app.get('/vap/welcome', (req, res) => {
  res.send('📂 Welcome to the Corporate Events Ingestion API.');
});

// Error Handlers
app.use(appErrorHandler);
app.use(errorHandler);
app.use(genericErrorHandler);
app.use(notFound);

export default app;

