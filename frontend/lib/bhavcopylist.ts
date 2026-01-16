import {
  TrendingUp,
  BarChart3,
  Building2,
  PieChart,
  Banknote,
  Target,
  Activity,
  LineChart,
  DollarSign,
  FileText
} from "lucide-react";

// =================== Categories ===================
const bhavcopyCategories = [
  {
    id: "bc",
    title: "BC - Equity Bhavcopy",
    description: "Daily equity market data including open, high, low, close prices and volumes",
    icon: TrendingUp,
    color: "bg-blue-500",
    count: "2,000+ records"
  },
  {
    id: "bh",
    title: "BH - Index Data",
    description: "Index and benchmark data with performance metrics",
    icon: BarChart3,
    color: "bg-green-500",
    count: "50+ indices"
  },
  {
    id: "corpbond",
    title: "Corporate Bonds",
    description: "Corporate bond trading data with yields and ratings",
    icon: Building2,
    color: "bg-purple-500",
    count: "500+ bonds"
  },
  {
    id: "etf",
    title: "ETF Data",
    description: "Exchange Traded Fund prices and NAV information",
    icon: PieChart,
    color: "bg-orange-500",
    count: "100+ ETFs"
  },
  {
    id: "ffix",
    title: "FFIX - Fixed Income",
    description: "Fixed income securities with yield and duration data",
    icon: Banknote,
    color: "bg-teal-500",
    count: "300+ securities"
  },
  {
    id: "gl",
    title: "GL - Government Securities",
    description: "Government bond data with maturity and coupon information",
    icon: Target,
    color: "bg-indigo-500",
    count: "200+ securities"
  },
  {
    id: "hl",
    title: "HL - High/Low Data",
    description: "52-week high and low prices for all securities",
    icon: Activity,
    color: "bg-red-500",
    count: "2,000+ records"
  },
  {
    id: "ix",
    title: "IX - Index Constituents",
    description: "Index composition and weightage data",
    icon: LineChart,
    color: "bg-cyan-500",
    count: "1,000+ constituents"
  },
  {
    id: "mcap",
    title: "MCAP - Market Capitalization",
    description: "Market cap data with categorization (Large/Mid/Small cap)",
    icon: DollarSign,
    color: "bg-yellow-500",
    count: "2,000+ companies"
  },
  {
    id: "pd",
    title: "PD - Price Data",
    description: "Comprehensive price data with sector classification",
    icon: BarChart3,
    color: "bg-pink-500",
    count: "2,000+ records"
  },
  {
    id: "pr",
    title: "PR - Price Records",
    description: "Historical price records with industry classification",
    icon: FileText,
    color: "bg-slate-500",
    count: "2,000+ records"
  }
];

// =================== Columns ===================
const pdColumns = [
  { key: "SYMBOL", label: "Symbol", type: "text" },
  { key: "SECURITY", label: "Security", type: "text" },
  { key: "SERIES", label: "Series", type: "text" },
  { key: "OPEN_PRICE", label: "Open", type: "currency" },
  { key: "HIGH_PRICE", label: "High", type: "currency" },
  { key: "LOW_PRICE", label: "Low", type: "currency" },
  { key: "CLOSE_PRICE", label: "Close", type: "currency" },
  { key: "PREV_CL_PR", label: "Prev Close", type: "currency" },
  { key: "NET_TRDQTY", label: "Volume", type: "number" },
  { key: "NET_TRDVAL", label: "Turnover", type: "currency" },
  { key: "IND_SEC", label: "Sector", type: "text" },
  { key: "CORP_IND", label: "Industry", type: "text" },
  { key: "TRADES", label: "Trades", type: "number" },
  { key: "HI_52_WK", label: "52W High", type: "currency" },
  { key: "LO_52_WK", label: "52W Low", type: "currency" },
  { key: "source_date", label: "Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const mcapColumns = [
  { key: "Symbol", label: "Symbol", type: "text" },
  { key: "Security_Name", label: "Security Name", type: "text" },
  { key: "Series", label: "Series", type: "text" },
  { key: "Category", label: "Category", type: "text" },
  { key: "Close_Price_Paid_up_valueRs", label: "Close Price", type: "currency" },
  { key: "Face_ValueRs", label: "Face Value", type: "currency" },
  { key: "Issue_Size", label: "Issue Size", type: "number" },
  { key: "Market_CapRs", label: "Market Cap", type: "currency" },
  { key: "Trade_Date", label: "Trade Date", type: "text" },
  { key: "Last_Trade_Date", label: "Last Trade Date", type: "text" },
  { key: "status", label: "Status", type: "text" }
];

const ixColumns = [
  { key: "INDEX_FLG", label: "Index Flag", type: "text" },
  { key: "SYMBOL", label: "Symbol", type: "text" },
  { key: "SECURITY", label: "Security Name", type: "text" },
  { key: "SERIES", label: "Series", type: "text" },
  { key: "ISSUE_CAP", label: "Issue Cap", type: "currency" },
  { key: "CLOSE_PRIC", label: "Close Price", type: "currency" },
  { key: "MKT_CAP", label: "Market Cap", type: "currency" },
  { key: "WEIGHTAGE", label: "Weightage", type: "percentage" },
  { key: "source_date", label: "Source Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const hlColumns = [
  { key: "SECURITY", label: "Security Name", type: "text" },
  { key: "NEW", label: "New", type: "currency" },
  { key: "PREVIOUS", label: "Previous", type: "currency" },
  { key: "NEW_STATUS", label: "New Status", type: "text" },
  { key: "source_date", label: "Source Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const glColumns = [
  { key: "GAIN_LOSS", label: "Gain/Loss", type: "text" },
  { key: "SECURITY", label: "Security Name", type: "text" },
  { key: "CLOSE_PRIC", label: "Close Price", type: "currency" },
  { key: "PREV_CL_PR", label: "Previous Close Price", type: "currency" },
  { key: "PERCENT_CG", label: "Percentage Change", type: "percentage" },
  { key: "source_date", label: "Source Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const ffixColumns = [
  { key: "INDEX_FLG", label: "Index Flag", type: "text" },
  { key: "SYMBOL", label: "Symbol", type: "text" },
  { key: "SECURITY", label: "Security Name", type: "text" },
  { key: "SERIES", label: "Series", type: "text" },
  { key: "ISSUE_CAP", label: "Issue Cap", type: "currency" },
  { key: "INVESTIBLE_FACTOR", label: "Investible Factor", type: "percentage" },
  { key: "CLOSE_PRIC", label: "Close Price", type: "currency" },
  { key: "FF_MKT_CAP", label: "FF Market Cap", type: "currency" },
  { key: "WEIGHTAGE", label: "Weightage", type: "percentage" },
  { key: "source_date", label: "Source Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const etfColumns = [
  { key: "MARKET", label: "Market", type: "text" },
  { key: "SERIES", label: "Series", type: "text" },
  { key: "SYMBOL", label: "Symbol", type: "text" },
  { key: "SECURITY", label: "Security", type: "text" },
  { key: "previous_close_price", label: "Prev Close", type: "currency" },
  { key: "open_price", label: "Open Price", type: "currency" },
  { key: "high_price", label: "High Price", type: "currency" },
  { key: "low_price", label: "Low Price", type: "currency" },
  { key: "close_price", label: "Close Price", type: "currency" },
  { key: "net_traded_value", label: "Net Turnover", type: "currency" },
  { key: "net_traded_qty", label: "Net Volume", type: "number" },
  { key: "trades", label: "Trades", type: "number" },
  { key: "week_52_high", label: "52W High", type: "currency" },
  { key: "week_52_low", label: "52W Low", type: "currency" },
  { key: "UNDERLYING", label: "Underlying", type: "text" },
  { key: "source_date", label: "Date", type: "date" }
];

const corpbondColumns = [
  { key: "MARKET", label: "Market", type: "text" },
  { key: "SERIES", label: "Series", type: "text" },
  { key: "SYMBOL", label: "Symbol", type: "text" },
  { key: "SECURITY", label: "Security", type: "text" },
  { key: "PREV_CL_PR", label: "Prev Close", type: "currency" },
  { key: "OPEN_PRICE", label: "Open Price", type: "currency" },
  { key: "HIGH_PRICE", label: "High Price", type: "currency" },
  { key: "LOW_PRICE", label: "Low Price", type: "currency" },
  { key: "CLOSE_PRICE", label: "Close Price", type: "currency" },
  { key: "NET_TRDVAL", label: "Net Turnover", type: "currency" },
  { key: "NET_TRDQTY", label: "Net Volume", type: "number" },
  { key: "CORP_IND", label: "Industry", type: "text" },
  { key: "TRADES", label: "Trades", type: "number" },
  { key: "HI_52_WK", label: "52W High", type: "currency" },
  { key: "LO_52_WK", label: "52W Low", type: "currency" },
  { key: "source_date", label: "Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const bhColumns = [
  { key: "SYMBOL", label: "Symbol", type: "text" },
  { key: "SERIES", label: "Series", type: "text" },
  { key: "SECURITY", label: "Security", type: "text" },
  { key: "high_low", label: "High/Low", type: "text" },
  { key: "index_flag", label: "Index Flag", type: "number" },
  { key: "source_date", label: "Date", type: "date" },
  { key: "status", label: "Status", type: "text" }
];

const bcColumns = [
  { key: 'SYMBOL', label: 'Symbol', type: 'text' as const },
  { key: 'SERIES', label: 'Series', type: 'text' as const },
  { key: 'SECURITY', label: 'Security', type: 'text' as const },
  { key: 'RECORD_DT', label: 'RECORD DT', type: 'text' as const },
  { key: 'BC_STRT_DT', label: 'BC START DT', type: 'text' as const },
  { key: 'BC_END_DT', label: 'BC END DT', type: 'text' as const },
  { key: 'EX_DT', label: 'EX DT', type: 'text' as const },
  { key: 'ND_STRT_DT', label: 'ND START DT', type: 'text' as const },
  { key: 'ND_END_DT', label: 'ND END DT', type: 'text' as const },
  { key: 'PURPOSE', label: 'PURPOSE', type: 'text' as const },
  { key: 'source_date', label: 'Source Date', type: 'text' as const },
  { key: 'status', label: 'Status', type: 'text' as const }
];
const prColumns = [
  { key: 'MKT', label: 'Market', type: 'text' as const },
  { key: 'SECURITY', label: 'Security', type: 'text' as const },
  { key: 'PREV_CL_PR', label: 'Prev Close', type: 'currency' as const },
  { key: 'OPEN_PRICE', label: 'Open', type: 'currency' as const },
  { key: 'HIGH_PRICE', label: 'High', type: 'currency' as const },
  { key: 'LOW_PRICE', label: 'Low', type: 'currency' as const },
  { key: 'CLOSE_PRICE', label: 'Close', type: 'currency' as const },
  { key: 'NET_TRDVAL', label: 'Turnover', type: 'currency' as const },
  { key: 'NET_TRDQTY', label: 'Volume', type: 'number' as const },
  { key: 'IND_SEC', label: 'Sector', type: 'text' as const },
  { key: 'CORP_IND', label: 'Industry', type: 'text' as const },
  { key: 'TRADES', label: 'Trades', type: 'number' as const },
  { key: 'HI_52_WK', label: '52W High', type: 'currency' as const },
  { key: 'LO_52_WK', label: '52W Low', type: 'currency' as const }
];

// =================== Lookup Object ===================
const bhavcopyColumns = {
  pd: pdColumns,
  mcap: mcapColumns,
  ix: ixColumns,
  hl: hlColumns,
  gl: glColumns,
  ffix: ffixColumns,
  etf: etfColumns,
  corpbond: corpbondColumns,
  bh: bhColumns,
  bc: bcColumns,
  pr: prColumns
};

export {
  bhavcopyCategories,
  bhavcopyColumns,
  pdColumns,
  mcapColumns,
  ixColumns,
  hlColumns,
  glColumns,
  ffixColumns,
  etfColumns,
  corpbondColumns,
  bhColumns,
  bcColumns,
  prColumns
};
