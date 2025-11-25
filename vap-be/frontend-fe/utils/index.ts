import { callApi } from "./apis"

// http://localhost:8000/vap/company/yfinance/TCS
export const getYFinanceData = async (symbol: string) => {
    const response = await callApi({
        url: `company/yfinance/${symbol}`,
        method: 'GET',
    });
    return response;
}

// http://localhost:8000/vap/company/yfinance
export const getAllYFinanceData = async (
  search: string = '',
  page: number = 1,
  limit: number = 20,
  sortField: string = 'marketCap',
  sortOrder: string = 'DESC'
) => {
  // Build query string
  const query = new URLSearchParams({
    search,
    page: page.toString(),
    limit: limit.toString(),
    sortField,
    sortOrder,
  }).toString();

  const response = await callApi({
    url: `company/yfinance?${query}`,
    method: 'GET',
  });

  return response;
};


// http://localhost:8000/vap/company/yfinance/sectors/unique
export const getUniqueSectors = async () => {
    const response = await callApi({
        url: `company/yfinance/sectors/unique`,
        method: 'GET',
    });
    return response;
}

// http://localhost:8000/vap/screener/screener_data/A2ZINFRA
export const getScreenerData = async (symbol: string) => {
    const response = await callApi({
        url: `screener/screener_data/${symbol}`,
        method: 'GET',
    });
    return response;
}

// POST http://localhost:8000/vap/company-data/formula/all-companies
export const getAnalyzeCompaniesData = async (date: string) => {
    const response = await callApi({
        url: `company-data/formula/all-companies`,
        method: 'POST',
        data: { date },
    });
    return response;
}
// http://localhost:8000/vap/ipo/sme

export const getIpoData = async (type: string, currentPage: number, recordsPerPage: number) => {
    const response = await callApi({
        url: `ipo/${type}?page=${currentPage}&limit=${recordsPerPage}`,
        method: 'GET',
    });
    return response;
}

// http://localhost:8000/vap/bse-news/
export const getBseAnnouncements = async (
  search: string = '',
  page: number = 1,
  limit: number = 20,    
  sortField: string = 'DT_TM',
  sortOrder: string = 'DESC'
) => {
    // Build query string
    const query = new URLSearchParams({
      search,
      page: page.toString(),
      limit: limit.toString(),
      sortField,
      sortOrder,
    }).toString();
  
    const response = await callApi({
      url: `bse-news?${query}`,
      method: 'GET',
    });
  
    return response;
}

// http://localhost:8000/vap/gov-news/all
export const getGovNews = async (
  search: string = '',
  page: number = 1,
  limit: number = 20,    
  sortField: string = 'DT_TM',
  sortOrder: string = 'DESC'
) => {
    // Build query string
    const query = new URLSearchParams({
      search,
      page: page.toString(),
      limit: limit.toString(),
      sortField,
      sortOrder,
    }).toString();
    const response = await callApi({
      url: `gov-news/all?${query}`,
      method: 'GET',
    });
    return response;
}