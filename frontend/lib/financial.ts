export interface FinancialMetric {
  symbol: string;
  col_unknown: string;
  [key: string]: string; // For dynamic year columns like Mar_2019, Mar_2020, etc.
}

export interface Company {
  symbol: string;
  name?: string;
  sector?: string;
  marketCap?: number;
  currentPrice?: number;
}

export interface QuarterlyResult {
  symbol: string;
  col_unknown: string;
  [key: string]: string; // For quarters like Jun_2024, Sep_2024, etc.
}

export interface KeyValueMetric {
  symbol: string;
  key: string;
  value: string;
}

export interface ShareholdingPattern {
  symbol: string;
  col_unknown: string;
  [key: string]: string;
}