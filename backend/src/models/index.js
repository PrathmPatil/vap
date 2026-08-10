import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import {
  resolveAnnouncementDbName,
  resolveBhavcopyDbName,
  resolveNseDynamicDbName,
  resolveScreenerDbName,
  resolveStockDbName,
  resolveYFinanceDbName,
  validateDbEnv,
} from '../config/dbEnv.js';

dotenv.config();
validateDbEnv();

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
   SEQUELIZE CONNECTIONS
--------------------------------------------- */
export const sequelizeStockMarket = new Sequelize(
  resolveStockDbName(),
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
  resolveBhavcopyDbName(),
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
  resolveScreenerDbName(),
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
  resolveYFinanceDbName(),
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

export const sequelizeIPO = sequelizeStockMarket;

export const sequelizeAnnouncement = new Sequelize(
  resolveAnnouncementDbName(),
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
  resolveNseDynamicDbName(),
  baseDBConfig.user,
  baseDBConfig.password,
  {
    host: baseDBConfig.host,
    port: baseDBConfig.port,
    dialect: 'mysql',
    logging: false,
  }
);

// Formula tables are stored in the consolidated stock market database.
export const sequelizeFormula = sequelizeStockMarket;

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
import AllIndicesModel from './all_indices.js';
// User
import UserModel from './user.js';

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
import CronJobLog from './cronLog.js';
import MarketHoliday from './marketHoliday.js';
import {
  BuyDay,
  FollowThroughDay,
  RallyAttemptDay,
  StrongBullishCandle,
  TweezerBottom,
  VolumeBreakout,
  BearishCandle,
  GapUpDay,
  GapDownDay,
  FiftyTwoWeekHigh,
  TopGainerDay,
  BandHit52w,
  TopLoserDay,
  FiftyTwoWeekLow,
  DailyMoverUp,
  DailyMoverDown
} from './formulaModel.js';
// Watchlist
import WatchlistModel from './watchlist.js';
import UserFormulaModel from './user_formula.js';
import UserScanModel from './user_scan.js';
import UserScanAlertModel from './user_scan_alert.js';

/* ---------------------------------------------
   INITIALIZE MODELS
--------------------------------------------- */

// Stock Market
const AllCompaniesData = AllCompaniesDataModel(sequelizeStockMarket, DataTypes);
const CompaniesData = CompaniesDataModel(sequelizeStockMarket, DataTypes);
const FailedSymbols = FailedSymbolsModel(sequelizeStockMarket, DataTypes);
const ListedCompanies = ListedCompaniesModel(sequelizeStockMarket, DataTypes);
const AllIndices = AllIndicesModel(sequelizeStockMarket, DataTypes);

// user
const User = UserModel(sequelizeStockMarket, DataTypes);

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

// IPO (consolidated into stock market DB)
const MainboardData = MainboardDataModel(sequelizeStockMarket, DataTypes);
const SmeData = SmeDataModel(sequelizeStockMarket, DataTypes);

// Announcement
const AnnouncementsModel = Announcements(sequelizeAnnouncement, DataTypes);

// NSE Dynamic
const nseModel = NseDynamic(sequelizeNseDynamic, DataTypes);

// Formula (consolidated into stock market DB)
const RallyAttemptDayModel = RallyAttemptDay(sequelizeStockMarket, DataTypes);
const FollowThroughDayModel = FollowThroughDay(sequelizeStockMarket, DataTypes);
const BuyDayModel = BuyDay(sequelizeStockMarket, DataTypes);
const StrongBullishCandleModel = StrongBullishCandle(sequelizeStockMarket, DataTypes);
const VolumeBreakoutModel = VolumeBreakout(sequelizeStockMarket, DataTypes);
const TweezerBottomModel = TweezerBottom(sequelizeStockMarket, DataTypes);
const BearishCandleModel = BearishCandle(sequelizeStockMarket, DataTypes);
const GapUpDayModel = GapUpDay(sequelizeStockMarket, DataTypes);
const GapDownDayModel = GapDownDay(sequelizeStockMarket, DataTypes);
const FiftyTwoWeekHighModel = FiftyTwoWeekHigh(sequelizeStockMarket, DataTypes);
const TopGainerDayModel = TopGainerDay(sequelizeStockMarket, DataTypes);
const BandHit52wModel = BandHit52w(sequelizeStockMarket, DataTypes);
const TopLoserDayModel = TopLoserDay(sequelizeStockMarket, DataTypes);
const FiftyTwoWeekLowModel = FiftyTwoWeekLow(sequelizeStockMarket, DataTypes);
const DailyMoverUpModel = DailyMoverUp(sequelizeStockMarket, DataTypes);
const DailyMoverDownModel = DailyMoverDown(sequelizeStockMarket, DataTypes);

// logs
const CronLogModel = CronJobLog(sequelizeStockMarket, DataTypes);
const MarketHolidayModel = MarketHoliday(sequelizeStockMarket, DataTypes);

// Watchlist (user-specific saved symbols)
const Watchlist = WatchlistModel(sequelizeStockMarket, DataTypes);
const UserFormula = UserFormulaModel(sequelizeStockMarket, DataTypes);
const UserScan = UserScanModel(sequelizeStockMarket, DataTypes);
const UserScanAlert = UserScanAlertModel(sequelizeStockMarket, DataTypes);

/* ---------------------------------------------
   EXPORT EVERYTHING
--------------------------------------------- */
export {
  AllCompaniesData,
  CompaniesData,
  FailedSymbols,
  ListedCompanies,
  AllIndices,

  User,

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

  CronLogModel,
  MarketHolidayModel,

  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
  StrongBullishCandleModel,
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
  Watchlist,
  UserFormula,
  UserScan,
  UserScanAlert
};

/* Mapping for dynamic routes */
export const dbModels = {
  mainboard_data: MainboardData,
  sme_data: SmeData,
};