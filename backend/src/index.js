import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import {
  sequelizeStockMarket,
  sequelizeBhavcopy,
  sequelizeScreener,
  sequelizeYFinanceDB,
  sequelizeIPO,
  sequelizeAnnouncement,
  sequelizeNseDynamic,
} from './models/index.js';

const app = express();

/* ---------------------------------------------
   MIDDLEWARES
--------------------------------------------- */
app.use(cors({ origin: '*', credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* ---------------------------------------------
   HEALTH CHECK
--------------------------------------------- */
app.get('/vap/health', (req, res) => {
  res.json({ status: 'OK', service: 'VAP Backend' });
});

/* ---------------------------------------------
   START SERVER + DB CONNECTIONS
--------------------------------------------- */
(async () => {
  try {
    console.log('🔄 Connecting to databases...');

    await sequelizeStockMarket.authenticate();
    await sequelizeStockMarket.sync();
    console.log('✅ stock_market connected');

    await sequelizeBhavcopy.authenticate();
    await sequelizeBhavcopy.sync();
    console.log('✅ bhavcopy connected');

    await sequelizeScreener.authenticate();
    await sequelizeScreener.sync();
    console.log('✅ screener_data connected');

    await sequelizeYFinanceDB.authenticate();
    await sequelizeYFinanceDB.sync();
    console.log('✅ yfinance connected');

    await sequelizeIPO.authenticate();
    await sequelizeIPO.sync();
    console.log('✅ ipo_data connected');

    await sequelizeAnnouncement.authenticate();
    await sequelizeAnnouncement.sync();
    console.log('✅ announcement connected');

    await sequelizeNseDynamic.authenticate();
    await sequelizeNseDynamic.sync();
    console.log('✅ nse_dynamic connected');

    const PORT = process.env.APP_PORT || 8000;
    const HOST = process.env.APP_HOST || 'localhost';

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://${HOST}:${PORT}/vap`);
    });
  } catch (error) {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  }
})();
