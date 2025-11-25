import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// -------------------------
// Sequelize Instances
// -------------------------

// Stock Market DB
const sequelizeStockMarket = new Sequelize(
  process.env.STOCK_DB_NAME,
  process.env.STOCK_DB_USER,
  process.env.STOCK_DB_PASS,
  {
    host: process.env.STOCK_DB_HOST,
    dialect: process.env.STOCK_DB_DIALECT || 'mysql',
    logging: false
  }
);

// Bhavcopy DB
const sequelizeBhavcopy = new Sequelize(
  process.env.BHAVCOPY_DB_NAME,
  process.env.BHAVCOPY_DB_USER,
  process.env.BHAVCOPY_DB_PASS,
  {
    host: process.env.BHAVCOPY_DB_HOST,
    dialect: process.env.BHAVCOPY_DB_DIALECT || 'mysql',
    logging: false
  }
);

// Screener / Financial DB
const sequelizeScreener = new Sequelize(
  process.env.SCREENER_DB_NAME,
  process.env.SCREENER_DB_USER,
  process.env.SCREENER_DB_PASS,
  {
    host: process.env.SCREENER_DB_HOST,
    dialect: process.env.SCREENER_DB_DIALECT || 'mysql',
    logging: false
  }
);

// YFINANCE_DB_NAME=yfinance
// YFINANCE_DB_USER=root
// YFINANCE_DB_PASS=Patil@2000
// YFINANCE_DB_HOST=mysql

// Third DB (e.g., for yfinance or other purposes)
const sequelizeYFinanceDB = new Sequelize(
  process.env.YFINANCE_DB_NAME,
  process.env.YFINANCE_DB_USER,
  process.env.YFINANCE_DB_PASS,
  {
    host: process.env.YFINANCE_DB_HOST,
    dialect: process.env.YFINANCE_DB_DIALECT || 'mysql',
    logging: false
  }
);
// -------------------------
// Import Model Definitions
// -------------------------

// IPO_DB_NAME=ipo_data_fastapi
// IPO_DB_USER=root
// IPO_DB_PASS=Patil@2000
// IPO_DB_HOST=mysql

// IPO DB
const sequelizeIPO = new Sequelize(
  process.env.IPO_DB_NAME,
  process.env.IPO_DB_USER,
  process.env.IPO_DB_PASS,
  {
    host: process.env.IPO_DB_HOST,
    dialect: process.env.IPO_DB_DIALECT || 'mysql',
    logging: false
  }
);

// Announcement DB
const sequelizeAnnouncement = new Sequelize(
  process.env.ANNOUNCEMENT_DB_NAME,
  process.env.ANNOUNCEMENT_DB_USER,
  process.env.ANNOUNCEMENT_DB_PASS,
  {
    host: process.env.ANNOUNCEMENT_DB_HOST,
    dialect: process.env.ANNOUNCEMENT_DB_DIALECT || 'mysql',
    logging: false
  }
);

// Stock Market Models
import AllCompaniesDataModel from './all_companies_data.js';
import CompaniesDataModel from './companies_data.js';
import FailedSymbolsModel from './failed_symbols.js';
import ListedCompaniesModel from './listed_companies.js';

// Bhavcopy Models
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

// Screener / Financial Models
import BalanceSheetModel from './screener/BalanceSheet.js';
import CashFlowModel from './screener/CashFlow.js';
import CompaniesModel from './screener/companies.js';
import CompanyFinancialsModel from './screener/companyFinancials.js';
import RatiosModel from './screener/otherDataRatios.js';
import ProfitLossModel from './screener/profitLoss.js';
import QuarterlyResultsModel from './screener/quarterlyResults.js';
import ShareholdingModel from './screener/shareholdingPattern.js';
import UnknownSectionModel from './screener/otherDataUnknownSection.js';
import YFinanceCompaniesModel from './screener/YFinanceCompanies.js';
import IpoModels from './ipo/ipoModel.js';
import Announcements from './announcements_model.js';

// -------------------------
// Initialize Models
// -------------------------

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
const IX = IXModel(sequelizeBhavcopy, DataTypes);
const MCAP = MCAPModel(sequelizeBhavcopy, DataTypes);
const PD = PDModel(sequelizeBhavcopy, DataTypes);
const PR = PRModel(sequelizeBhavcopy, DataTypes);

// Screener / Financial
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
// sequelizeIPO
const { MainboardData, SmeData } = IpoModels(sequelizeIPO, Sequelize.DataTypes);

// news announcements model can be added here similarly
const AnnouncementsModel = Announcements(sequelizeAnnouncement, DataTypes);
// -------------------------
// Export
// -------------------------
export {
  // Sequelize instances
  sequelizeStockMarket,
  sequelizeBhavcopy,
  sequelizeScreener,
  sequelizeYFinanceDB,
  sequelizeIPO,
  sequelizeAnnouncement,

  // Stock Market Models
  AllCompaniesData,
  CompaniesData,
  FailedSymbols,
  ListedCompanies,

  // Bhavcopy Models
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

  // Screener / Financial Models
  BalanceSheet,
  CashFlow,
  Companies,
  CompanyFinancials,
  Ratios,
  ProfitLoss,
  QuarterlyResults,
  Shareholding,
  UnknownSection,

  // YFinance Models
  YCompanies,
  MainboardData,
  SmeData,
  AnnouncementsModel
};

export const dbModels = {
  mainboard_data: MainboardData,
  sme_data: SmeData
};
