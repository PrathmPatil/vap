
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

// ✅ Filters aligned with available data
export interface FilterCriteria {
  marketCapMin: number;
  marketCapMax: number;
  peMin: number;
  peMax: number;
  dividendYieldMin: number;
  dividendYieldMax: number;
  sector: string;
  priceMin: number;
  priceMax: number;
  volumeMin: number;
  onlyDividendPaying: boolean;
  onlyProfitable: boolean; // based on positive PE
}

export const defaultFilters: FilterCriteria = {
  marketCapMin: 0,
  marketCapMax: 100000000000000, // big upper bound
  peMin: 0,
  peMax: 100,
  dividendYieldMin: 0,
  dividendYieldMax: 20,
  sector: "all",
  priceMin: 0,
  priceMax: 100000,
  volumeMin: 0,
  onlyDividendPaying: false,
  onlyProfitable: false,
};