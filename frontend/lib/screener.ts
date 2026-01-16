// ✅ Final StockData interface based on API response
export interface StockData {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  currency: string;
  exchange: string;
  marketCap: number;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
  beta: number;
  dividendYield: number;
  forwardPE: number;
  trailingPE: number;
  website: string;
  addedAt: string; // ISO date string
}

// In @/lib/screener.ts
export interface FilterCriteria {
  // Existing properties
  marketCapMin: number;
  marketCapMax: number;
  priceMin: number;
  priceMax: number;
  volumeMin: number;
  dividendYieldMin: number;
  dividendYieldMax: number;
  sector: string;
  onlyDividendPaying: boolean;
  onlyPositiveChange: boolean;
  
  // Add missing properties
  forwardPEMin: number;
  forwardPEMax: number;
  trailingPEMin: number;
  trailingPEMax: number;
  betaMin: number;
  betaMax: number;
}

export const defaultFilters: FilterCriteria = {
  marketCapMin: 0,
  marketCapMax: 1000000000000,
  priceMin: 0,
  priceMax: 10000,
  volumeMin: 0,
  dividendYieldMin: 0,
  dividendYieldMax: 100,
  sector: "all",
  onlyDividendPaying: false,
  onlyPositiveChange: false,
  // Add missing properties with default values
  forwardPEMin: 0,
  forwardPEMax: 100,
  trailingPEMin: 0,
  trailingPEMax: 100,
  betaMin: 0,
  betaMax: 5,
};

// Company type for listed companies
export interface ListedCompany {
  id: number;
  symbol: string;
  company_name: string;
  series: string;
  date_of_listing: string;
  paid_up_value: number;
  market_lot: number;
  isin: string;
  face_value: number;
  created_at: string;
  updated_at?: string;
}

// Response for getListedCompaniesData API - KEEP ONLY ONE VERSION
export interface ListedCompaniesResponse {
  success: boolean;
  data: ListedCompany[];
  total: number;
  page: number;
  pages: number;
  limit?: number;
  message?: string;
  error?: string;
}

// Failed symbol type
export interface FailedSymbol {
  id: number;
  symbol: string;
  reason: string;
  created_at: string;
  updated_at?: string;
  attempted_at?: string;
  retry_count?: number;
  status?: 'pending' | 'retrying' | 'resolved' | 'failed';
}

// Response for getFailedSymbolsList API - KEEP ONLY ONE VERSION
export interface FailedSymbolsResponse {
  success: boolean;
  data: FailedSymbol[];
  total: number;
  page?: number;
  pages?: number;
  limit?: number;
  message?: string;
  error?: string;
}

// For MarketOverview component - USE DIFFERENT NAMES
export interface MarketOverviewCompaniesResponse {
  success: boolean;
  total: number;
  data?: any[];
  message?: string;
}

export interface MarketOverviewFailedSymbolsResponse {
  success: boolean;
  total: number;
  data?: any[];
  message?: string;
}

// For CompaniesTable component specifically - USE DIFFERENT NAME
export interface CompaniesTableResponse {
  success: boolean;
  data: ListedCompany[];
  total: number;
  page: number;
  pages: number;
  message?: string;
}

// Alternative: More flexible versions with all possible properties
export interface FlexibleListedCompaniesResponse {
  success: boolean;
  data?: ListedCompany[];
  total?: number;
  page?: number;
  pages?: number;
  totalPages?: number;
  currentPage?: number;
  count?: number;
  records?: ListedCompany[];
  items?: ListedCompany[];
  companies?: ListedCompany[];
  message?: string;
  error?: string;
}

export interface FlexibleFailedSymbolsResponse {
  success: boolean;
  data?: FailedSymbol[];
  total?: number;
  page?: number;
  pages?: number;
  totalPages?: number;
  currentPage?: number;
  count?: number;
  records?: FailedSymbol[];
  items?: FailedSymbol[];
  symbols?: FailedSymbol[];
  message?: string;
  error?: string;
}

// For paginated responses (generic)
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  message?: string;
}

// Specific type aliases for your use cases
export type ListedCompaniesPaginatedResponse = PaginatedResponse<ListedCompany>;
export type FailedSymbolsPaginatedResponse = PaginatedResponse<FailedSymbol>;

// For API error responses
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}