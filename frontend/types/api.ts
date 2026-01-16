// types/api.ts

// YFinance API
export interface YFinanceStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  dividendYield?: number;
  forwardPE?: number;
  trailingPE?: number;
  beta?: number;
  sector?: string;
  [key: string]: any;
}

export interface YFinanceResponse {
  success: boolean;
  data: YFinanceStock[];
  pages?: number;
  page?: number;
  message?: string;
}

export interface UniqueSectorsResponse {
  success: boolean;
  data: string[];
}

// IPO API
export interface IpoItem {
  id: number;
  name: string;
  issuePrice: number;
  listingDate: string;
  lotSize?: number;
  [key: string]: any;
}

export interface IpoResponse2 {
  success: boolean;
  data: IpoItem[];
  pages?: number;
  page?: number;
  message?: string;
}

// Government News
export interface GovNewsItem {
  title: string;
  link: string;
  publishedAt: string;
  [key: string]: any;
}

export interface GovNewsResponse {
  status: "success" | "error";
  data: GovNewsItem[];
  message?: string;
}

// BSE News
export interface BseNewsItem {
  title: string;
  link: string;
  DT_TM: string;
  [key: string]: any;
}

export interface BseNewsResponse {
  success: boolean;
  data: BseNewsItem[];
  pages?: number;
  page?: number;
  message?: string;
}

// Market Signals / Analyze Companies
export interface MarketSignalsData {
  success: boolean;
  data: any[]; // or define a proper structure if you have it
  message?: string;
}


export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  dividendYield?: number;
  forwardPE?: number;
  trailingPE?: number;
  beta?: number;
  sector?: string;
  [key: string]: any;
}

export interface YFinanceResponse {
  success: boolean;
  data: StockData[];
  pages?: number;
  page?: number;
  message?: string;
}

export interface UniqueSectorsResponse {
  success: boolean;
  data: string[];
}
