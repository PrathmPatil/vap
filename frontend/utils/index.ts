// utils/api.ts
import { callApi } from "./apis";
import { YFinanceResponse } from "@/components/screener/CompanyDashboard";
import { IpoResponse2 } from "@/pages/ipo";
import { BseNewsResponse } from "@/components/news/NewsComponent";
import { MarketSignalsData } from "@/components/MarketSignals";
import { FailedSymbolsResponse, ListedCompaniesResponse, StockData } from "@/lib/screener";
import { GovNewsResponse } from "@/types/api";

// Type for sort order to ensure consistency
export type SortOrder = 'ASC' | 'DESC';

// Helper function to convert any sort order string to uppercase
const normalizeSortOrder = (order: string): SortOrder => {
  const upperOrder = order.toUpperCase();
  return upperOrder === 'ASC' ? 'ASC' : 'DESC';
};

// -----------------------------
// YFinance APIs
// -----------------------------

// In your @/utils file, update the getAllYFinanceData function
export const getAllYFinanceData = async (
  search = '',
  page = 1,
  limit = 20,
  sortField = 'marketCap',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): Promise<PaginatedYFinanceResponse> => {  // Update return type
  return callApi<PaginatedYFinanceResponse>({  // Update generic type
    url: 'company/yfinance',
    method: 'GET',
    params: { search, page, limit, sortField, sortOrder },
  });
};

// Also update the YFinanceResponse type in your types/api.ts file:
export interface PaginatedYFinanceResponse {
  success: boolean;
  data: StockData[];
  pages?: number;
  page?: number;
  message?: string;
  total?: number;
  totalPages?: number;
}

// Get single YFinance company
export const getYFinanceData = async (symbol: string): Promise<YFinanceResponse> => {
  return callApi<YFinanceResponse>({
    url: `company/yfinance/${symbol}`,
    method: 'GET',
  });
};

// Get unique sectors
export const getUniqueSectors = async (): Promise<{ success: boolean; data: string[] }> => {
  return callApi<{ success: boolean; data: string[] }>({
    url: 'company/yfinance/sectors/unique',
    method: 'GET',
  });
};

// -----------------------------
// Screener Data
// -----------------------------
export const getScreenerData = async (symbol: string): Promise<YFinanceResponse> => {
  return callApi<YFinanceResponse>({
    url: `screener/screener_data/${symbol}`,
    method: 'GET',
  });
};

// -----------------------------
// Analyze Companies Data
// -----------------------------
export const getAnalyzeCompaniesData = async (date: string): Promise<MarketSignalsData> => {
  return callApi<MarketSignalsData>({
    url: 'company-data/formula/all-companies',
    method: 'POST',
    data: { date },
  });
};

// -----------------------------
// IPO APIs
// -----------------------------
export const getIpoData = async (
  type: string,
  currentPage: number,
  recordsPerPage: number
): Promise<IpoResponse2> => {
  return callApi<IpoResponse2>({
    url: `ipo/${type}`,
    method: 'GET',
    params: { 
      page: currentPage, 
      limit: recordsPerPage 
    },
  });
};

// -----------------------------
// BSE Announcements
// -----------------------------
export const getBseAnnouncements = async (
  search = '',
  page = 1,
  limit = 20,
  sortField = 'DT_TM',
  sortOrder: string = 'DESC'
): Promise<BseNewsResponse> => {
  const normalizedSortOrder = normalizeSortOrder(sortOrder);
  
  return callApi<BseNewsResponse>({
    url: 'bse-news',
    method: 'GET',
    params: { 
      search, 
      page, 
      limit, 
      sortField, 
      sortOrder: normalizedSortOrder 
    },
  });
};

// -----------------------------
// Government News
// -----------------------------
export const getGovNews = async (
  search = '',
  page = 1,
  limit = 20,
  sortField = 'DT_TM',
  sortOrder: string = 'DESC'
): Promise<GovNewsResponse> => {
  const normalizedSortOrder = normalizeSortOrder(sortOrder);
  
  return callApi<GovNewsResponse>({
    url: 'gov-news/all',
    method: 'GET',
    params: { 
      search, 
      page, 
      limit, 
      sortField, 
      sortOrder: normalizedSortOrder 
    },
  });
};

// http://localhost:8000/vap/company/yfinance/${typeStr}.NS
export const getYFinanceStocksByType = async (
  type: string
): Promise<YFinanceResponse> => {  
  return callApi<YFinanceResponse>({
    url: `company/yfinance/${type}.NS`,
    method: 'GET',
  });
};

// http://localhost:8000/vap/company-data/${companyStr}?page=${currentPage}&limit=${limit}${
        //   searchTerm ? `&search=${searchTerm}` : ""
        // }
// In @/utils
export interface CompanyData {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dividends: number;
  stock_splits: number;
}

export interface CompanyDataResponse {
  success: boolean;
  data: CompanyData[];
  total?: number;
  page?: number;
  pages?: number;
  message?: string;
}

export const getCompanyData = async (
  symbol: string,
  page = 1,
  limit = 10,
  search = ''
): Promise<CompanyDataResponse> => {
  return callApi<CompanyDataResponse>({
    url: `company-data/${symbol}`,
    method: 'GET',
    params: { page, limit, search },
  });
};

// http://localhost:8000/vap/company-data/listed-companies
// In @/utils
export const getListedCompanies = async (): Promise<ListedCompaniesResponse> => {
  return callApi<ListedCompaniesResponse>({
    url: 'company-data/listed-companies',
    method: 'GET',
  });
};



// http://localhost:8000/vap/company-data/failed-symbols
export const getFailedSymbols = async (): Promise<FailedSymbolsResponse> => {
  return callApi<FailedSymbolsResponse>({
    url: 'company-data/failed-symbols',
    method: 'GET',
  });
};

// http://localhost:8000/vap/company-data/failed-symbols
// If your API function returns a raw Response object, update it like this:
// Look for something like this:
export const getFailedSymbolsList = async () => {
  const response = await callApi({
    url: 'company-data/failed-symbols',
    method: 'GET',
  });
  return response; // This should be the parsed JSON
};


// http://localhost:8000/vap/company-data/listed-companies?page=${currentPage}&limit=${limit}${searchTerm ? `&search=${searchTerm}` : ''}
// In your @/utils file, update the getListedCompaniesData function
export const getListedCompaniesData = async (
  page = 1,
  limit = 10,
  search = ''
): Promise<ListedCompaniesApiResponse> => {
  return callApi<ListedCompaniesApiResponse>({
    url: 'company-data/listed-companies',
    method: 'GET',
    params: { page, limit, search },
  });
};

// Add this interface to your types file or in the utils file
export interface ListedCompaniesApiResponse {
  success: boolean;
  data: Array<{
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
  }>;
  pages?: number;
  page?: number;
  total?: number;
  message?: string;
}