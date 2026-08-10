// utils/api.ts
import { callApi } from "./apis";
import { YFinanceResponse } from "@/components/screener/CompanyDashboard";
import { IpoResponse2 } from "@/pages/ipo/index";
import { BseNewsResponse } from "@/components/news/NewsComponent";
import { MarketSignalsData } from "@/components/MarketSignals";
import { FailedSymbolsResponse, ListedCompaniesResponse, StockData } from "@/lib/screener";

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
  recordsPerPage: number,
  status: string = 'current'
): Promise<IpoResponse2> => {
  return callApi<IpoResponse2>({
    url: `ipo/${type}`,
    method: 'GET',
    params: { 
      page: currentPage, 
      limit: recordsPerPage,
      status,
      source: 'nse',
    },
  });
};

type NseIpoCountsResponse = {
  success: boolean;
  counts: {
    current: number;
    upcoming: number;
    past: number;
    mainboard: number;
    sme: number;
    total: number;
    byStatus?: {
      current: { all: number; mainboard: number; sme: number };
      upcoming: { all: number; mainboard: number; sme: number };
      past: { all: number; mainboard: number; sme: number };
    };
  };
};

export const getNseIpoData = async (
  currentPage: number,
  recordsPerPage: number,
  status: string = 'current',
  board: string = 'all',
): Promise<IpoResponse2> => {
  return callApi<IpoResponse2>({
    url: 'ipo/nse',
    method: 'GET',
    params: {
      page: currentPage,
      limit: recordsPerPage,
      status,
      board,
    },
  });
};

export const getNseIpoCounts = async (): Promise<NseIpoCountsResponse> => {
  return callApi<NseIpoCountsResponse>({
    url: 'ipo/nse/counts',
    method: 'GET',
  });
};

type IpoReportCountResponse = {
  success: boolean;
  counts: {
    mainboard_data: number;
    sme_data: number;
  };
  message?: string;
};
export const getIpoReportsCount = async (
  reportTypes: string[]
): Promise<IpoReportCountResponse> => {
  return callApi<IpoReportCountResponse>({
    url: "ipo/finnhub/reportsCount",
    method: "POST",
    data: { reportTypes },
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
): Promise<any> => {
  const normalizedSortOrder = normalizeSortOrder(sortOrder);
  
  return callApi<any>({
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

// Combined daily listing — stocks date filters listed_companies.date_of_listing by default
export const getListedDailyData = async (
  date = '',
  page = 1,
  limit = 50,
  search = '',
  instrument: 'stocks' | 'etfs' | 'indices' = 'stocks',
  dateField: 'trade' | 'listing' = 'listing'
): Promise<any> => {
  return callApi<any>({
    url: 'company-data/listed-daily',
    method: 'GET',
    params: {
      date: date || undefined,
      page,
      limit,
      search: search || undefined,
      instrument,
      date_field: dateField,
    },
  });
};

// Watchlist APIs
export const addToWatchlist = async (symbol: string): Promise<any> => {
  try {
    return await callApi<any>({ url: 'company-data/watchlist', method: 'POST', data: { symbol } });
  } catch (error: any) {
    if (error?.response?.status === 401) {
      return { success: false, unauthorized: true, message: 'Please login to add stocks to watchlist.' };
    }
    throw error;
  }
};

export const removeFromWatchlist = async (symbol: string): Promise<any> => {
  try {
    return await callApi<any>({ url: `company-data/watchlist/${symbol}`, method: 'DELETE' });
  } catch (error: any) {
    if (error?.response?.status === 401) {
      return { success: false, unauthorized: true, message: 'Please login to manage your watchlist.' };
    }
    throw error;
  }
};

export const getUserWatchlist = async (): Promise<any> => {
  try {
    return await callApi<any>({ url: 'company-data/watchlist', method: 'GET' });
  } catch (error: any) {
    if (error?.response?.status === 401) {
      return { success: false, unauthorized: true, data: [] };
    }
    throw error;
  }
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

// finnhub/
// | earnings_calendar              |
// | ipo_calendar                   |
// | market_holiday                 |
// | market_status

export const getFinnhubData = async (type: string, params?: any): Promise<any> => {
  return callApi<any>({
    url: `finnhub/${type}`,
    method: 'GET',
    params
  });
}

export const getDynamicData = async (
  dynamicURL: string,
  page = 1,
  limit = 10,
  searchTerm = '',
  filters: { date?: string; start_date?: string; end_date?: string } = {}
): Promise<any> => {
  return callApi<any>({
    url: `${dynamicURL}`,
    method: 'GET',
    params: {
      page,
      limit,
      search: searchTerm,
      ...(filters.date ? { date: filters.date } : {}),
      ...(filters.start_date ? { start_date: filters.start_date } : {}),
      ...(filters.end_date ? { end_date: filters.end_date } : {}),
    }
  });
}

// http://localhost:8000/vap/formula/strong-bullish-candle
export const generateStrongBullishData = async (date: string): Promise<any> => {
  return callApi<any>({
    url: 'formula/strong-bullish-candle',
    method: 'POST',
    data: { date }
  });
}

  // "/run-formula-engine",
  // "/strong-bullish",
  // "/rally-attempt",
  // "/follow-through-day",
  // "/buy-day"

export const getFormulaData = async (
  formulaType: string,
  currentPage: number,
  itemsPerPage: number,
  options?: {
    searchTerm?: string;
    basePercent?: number;
    targetDate?: string | null;
    symbol?: string | null;
    changePercentMin?: number | null;
    changePercentMax?: number | null;
    changeSort?: 'asc' | 'desc';
  }
): Promise<any> => {
  return callApi<any>({
    url: 'formula/query',
    method: 'POST',
    data: {
      formulaType,
      currentPage,
      itemsPerPage,
      searchTerm: options?.searchTerm || '',
      basePercent: options?.basePercent,
      base_percent: options?.basePercent,
      date: options?.targetDate || undefined,
      targetDate: options?.targetDate || undefined,
      symbol: options?.symbol || undefined,
      changePercentMin: options?.changePercentMin,
      changePercentMax: options?.changePercentMax,
      changeSort: options?.changeSort,
    },
  });
};

export const exportFormulaXlsx = async (
  formulaType: string,
  options?: {
    searchTerm?: string;
    basePercent?: number;
    targetDate?: string | null;
    symbol?: string | null;
    changePercentMin?: number | null;
    changePercentMax?: number | null;
    changeSort?: 'asc' | 'desc';
    filename?: string;
  }
): Promise<void> => {
  const { getApiBaseUrl, getAuthToken } = await import('./apis');
  const axios = (await import('axios')).default;
  const token = getAuthToken();
  const response = await axios.request({
    url: `${getApiBaseUrl()}/formula/export`,
    method: 'POST',
    responseType: 'blob',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: {
      formulaType,
      searchTerm: options?.searchTerm || '',
      basePercent: options?.basePercent,
      targetDate: options?.targetDate || undefined,
      symbol: options?.symbol || undefined,
      changePercentMin: options?.changePercentMin,
      changePercentMax: options?.changePercentMax,
      changeSort: options?.changeSort,
    },
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options?.filename || `${formulaType}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const getFormulaAvailableDates = async (
  formulaType: string,
  basePercent = 2
): Promise<{ success: boolean; dates: string[]; latest_date?: string | null }> => {
  return callApi({
    url: 'formula/meta',
    method: 'GET',
    params: {
      formulaType,
      resource: 'dates',
      basePercent,
    },
  });
};

export const getFormulaCompanies = async (
  formulaType: string,
  options?: {
    targetDate?: string | null;
    searchTerm?: string;
    basePercent?: number;
  }
): Promise<{
  success: boolean;
  companies: Array<{ symbol: string; security?: string; label?: string }>;
  trade_date?: string | null;
}> => {
  return callApi({
    url: 'formula/meta',
    method: 'GET',
    params: {
      formulaType,
      resource: 'companies',
      date: options?.targetDate || undefined,
      searchTerm: options?.searchTerm || undefined,
      basePercent: options?.basePercent,
    },
  });
};

//  http://localhost:8000/vap/user/login
export const loginUser = async (email: string, password: string): Promise<any> => {
  return callApi<any>({
    url: 'user/login',
    method: 'POST',
    data: { email, password }
  });
}

//  http://localhost:8000/vap/user/register
export const registerUser = async (name: string, email: string, password: string, phoneNumber: string, whatsappNumber: string): Promise<any> => {
  return callApi<any>({
    url: 'user/register',
    method: 'POST',
    data: { username: name, email, password, phoneNumber, whatsappNumber }
  });
}

// http://localhost:8000/vap/holiday
export const getMarketHolidays = async (page: number, limit: number, search?: string): Promise<any> => {
  return callApi<any>({
    url: 'holiday',
    method: 'POST',
    data: { page, limit, search }
  });
}
// /logs
export const getCronLogs = async (page: number, limit: number, job_name?: string, status?: string): Promise<any> => {
  return callApi<any>({
    url: 'logs',
    method: 'GET',
    params: { page, limit, job_name, status }
  });
}

// Custom formula CRUD + run
export const listCustomFormulas = async (): Promise<any> => {
  return callApi<any>({ url: 'formula/custom', method: 'GET' });
};

export const createCustomFormula = async (payload: {
  name: string;
  expression: string;
  description?: string;
}): Promise<any> => {
  return callApi<any>({ url: 'formula/custom', method: 'POST', data: payload });
};

export const updateCustomFormula = async (
  id: number | string,
  payload: { name?: string; expression?: string; description?: string; is_active?: boolean }
): Promise<any> => {
  return callApi<any>({ url: `formula/custom/${id}`, method: 'PUT', data: payload });
};

export const deleteCustomFormula = async (id: number | string): Promise<any> => {
  return callApi<any>({ url: `formula/custom/${id}`, method: 'DELETE' });
};

export const runCustomFormula = async (
  id: number | string,
  options?: { page?: number; pageSize?: number; search?: string; date?: string }
): Promise<any> => {
  return callApi<any>({
    url: `formula/custom/${id}/run`,
    method: 'POST',
    data: options || {},
  });
};

export const listUserScans = async (): Promise<any> => {
  return callApi<any>({ url: 'scans', method: 'GET' });
};

export const createUserScan = async (payload: Record<string, unknown>): Promise<any> => {
  return callApi<any>({ url: 'scans', method: 'POST', data: payload });
};

export const updateUserScan = async (
  id: number | string,
  payload: Record<string, unknown>
): Promise<any> => {
  return callApi<any>({ url: `scans/${id}`, method: 'PUT', data: payload });
};

export const deleteUserScan = async (id: number | string): Promise<any> => {
  return callApi<any>({ url: `scans/${id}`, method: 'DELETE' });
};

export const runUserScan = async (
  id: number | string,
  options?: { notify?: boolean }
): Promise<any> => {
  return callApi<any>({
    url: `scans/${id}/run`,
    method: 'POST',
    data: { notify: options?.notify !== false },
  });
};

export const getTechnicalScreener = async (params: Record<string, unknown> = {}): Promise<any> => {
  return callApi<any>({
    url: 'screener/technical',
    method: 'GET',
    params,
  });
};
