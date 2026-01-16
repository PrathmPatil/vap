import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import { ensureDatabase } from '../config/initDatabase.js';

dotenv.config();

/* ---------------------------------------------
   BASE MYSQL CONFIG (NO DATABASE)
--------------------------------------------- */
const baseDBConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
};

/* ---------------------------------------------
   AUTO-CREATE ALL DATABASES (ON APP BOOT)
--------------------------------------------- */
await Promise.all([
  ensureDatabase(process.env.STOCK_DB_NAME, baseDBConfig),
  ensureDatabase(process.env.BHAVCOPY_DB_NAME, baseDBConfig),
  ensureDatabase(process.env.SCREENER_DB_NAME, baseDBConfig),
  ensureDatabase(process.env.YFINANCE_DB_NAME, baseDBConfig),
  ensureDatabase(process.env.IPO_DB_NAME, baseDBConfig),
  ensureDatabase(process.env.ANNOUNCEMENT_DB_NAME, baseDBConfig),
  ensureDatabase(process.env.NSE_DYNAMIC_DB_NAME, baseDBConfig),
]);

/* ---------------------------------------------
   SEQUELIZE CONNECTIONS
--------------------------------------------- */
export const sequelizeStockMarket = new Sequelize(
  process.env.STOCK_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeBhavcopy = new Sequelize(
  process.env.BHAVCOPY_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeScreener = new Sequelize(
  process.env.SCREENER_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeYFinanceDB = new Sequelize(
  process.env.YFINANCE_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeIPO = new Sequelize(
  process.env.IPO_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeAnnouncement = new Sequelize(
  process.env.ANNOUNCEMENT_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeNseDynamic = new Sequelize(
  process.env.NSE_DYNAMIC_DB_NAME,
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

/* ---------------------------------------------
   EXPORT DATATYPES (FOR MODELS)
--------------------------------------------- */
export { DataTypes };


/* ---------------------------------------------
   IMPORT ALL MODELS
--------------------------------------------- */

// Stock Market
import AllCompaniesDataModel from './all_companies_data.js';
import CompaniesDataModel from './companies_data.js';
import FailedSymbolsModel from './failed_symbols.js';
import ListedCompaniesModel from './listed_companies.js';

// Bhavcopy
import BCModel from './bhavcopy/bc.js';
import BHModel from './bhavcopy/bh.js';
import CorpbondModel from './bhavcopy/corpbond.js';
import ETFModel from './bhavcopy/etf.js';
import FFIXModel from './bhavcopy/ffix.js';
import GLModel from './bhavcopy/gl.js';
import HLModel from './bhavcopy/hl.js';
import PDModel from './bhavcopy/pd.js';
import PRModel from './bhavcopy/pr.js';
import IXModel from './bhavcopy/ix.js';
import MCAPModel from './bhavcopy/mcap.js';

// Screener Models
import BalanceSheetModel from './screener/balanceSheet.js';
import CashFlowModel from './screener/cashFlow.js';
import CompaniesModel from './screener/companies.js';
import CompanyFinancialsModel from './screener/companyFinancials.js';
import RatiosModel from './screener/otherDataRatios.js';
import ProfitLossModel from './screener/profitLoss.js';
import QuarterlyResultsModel from './screener/quarterlyResults.js';
import ShareholdingModel from './screener/shareholdingPattern.js';
import UnknownSectionModel from './screener/otherDataUnknownSection.js';
import YFinanceCompaniesModel from './screener/YFinanceCompanies.js';

// IPO Models
import MainboardDataModel from './ipo/MainboardData.js';
import SmeDataModel from './ipo/SmeData.js';

// Misc models
import Announcements from './announcements_model.js';
import NseDynamic from './ingestModel.js';

/* ---------------------------------------------
   INITIALIZE MODELS
--------------------------------------------- */

// Stock Market
const AllCompaniesData = AllCompaniesDataModel(sequelizeStockMarket, DataTypes);
const CompaniesData = CompaniesDataModel(sequelizeStockMarket, DataTypes);
const FailedSymbols = FailedSymbolsModel(sequelizeStockMarket, DataTypes);
const ListedCompanies = ListedCompaniesModel(sequelizeStockMarket, DataTypes);

// Bhavcopy
const BC = BCModel(sequelizeBhavcopy, DataTypes);
const BH = BHModel(sequelizeBhavcopy, DataTypes);
const Corpbond = CorpbondModel(sequelizeBhavcopy, DataTypes);
const ETF = ETFModel(sequelizeBhavcopy, DataTypes);
const FFIX = FFIXModel(sequelizeBhavcopy, DataTypes);
const GL = GLModel(sequelizeBhavcopy, DataTypes);
const HL = HLModel(sequelizeBhavcopy, DataTypes);
const PD = PDModel(sequelizeBhavcopy, DataTypes);
const PR = PRModel(sequelizeBhavcopy, DataTypes);
const IX = IXModel(sequelizeBhavcopy, DataTypes);
const MCAP = MCAPModel(sequelizeBhavcopy, DataTypes);

// Screener
const BalanceSheet = BalanceSheetModel(sequelizeScreener, DataTypes);
const CashFlow = CashFlowModel(sequelizeScreener, DataTypes);
const Companies = CompaniesModel(sequelizeScreener, DataTypes);
const CompanyFinancials = CompanyFinancialsModel(sequelizeScreener, DataTypes);
const Ratios = RatiosModel(sequelizeScreener, DataTypes);
const ProfitLoss = ProfitLossModel(sequelizeScreener, DataTypes);
const QuarterlyResults = QuarterlyResultsModel(sequelizeScreener, DataTypes);
const Shareholding = ShareholdingModel(sequelizeScreener, DataTypes);
const UnknownSection = UnknownSectionModel(sequelizeScreener, DataTypes);
const YCompanies = YFinanceCompaniesModel(sequelizeYFinanceDB, DataTypes);

// IPO
const MainboardData = MainboardDataModel(sequelizeIPO, DataTypes);
const SmeData = SmeDataModel(sequelizeIPO, DataTypes);

// Announcement
const AnnouncementsModel = Announcements(sequelizeAnnouncement, DataTypes);

// NSE Dynamic
const nseModel = NseDynamic(sequelizeNseDynamic, DataTypes);

/* ---------------------------------------------
   EXPORT EVERYTHING
--------------------------------------------- */
export {
  AllCompaniesData,
  CompaniesData,
  FailedSymbols,
  ListedCompanies,

  BC,
  BH,
  Corpbond,
  ETF,
  FFIX,
  GL,
  HL,
  IX,
  MCAP,
  PD,
  PR,

  BalanceSheet,
  CashFlow,
  Companies,
  CompanyFinancials,
  Ratios,
  ProfitLoss,
  QuarterlyResults,
  Shareholding,
  UnknownSection,

  YCompanies,
  MainboardData,
  SmeData,

  AnnouncementsModel,
  nseModel,
};

/* Mapping for dynamic routes */
export const dbModels = {
  mainboard_data: MainboardData,
  sme_data: SmeData,
};
