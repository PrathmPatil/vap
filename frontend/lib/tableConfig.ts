// tableConfig.ts

import { formatCurrency } from "./utils";

export const getTableConfig = () => [
  { key: "symbol", label: "Symbol", sortable: true },
  { key: "name", label: "Company", sortable: true },
  { key: "currentPrice", label: "Price", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "previousClose", label: "Prev Close", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "change", label: "Change", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) + "%" : "" },
  { key: "changePercent", label: "Change %", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) + "%" : "" },
  { key: "marketCap", label: "Market Cap", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? formatCurrency(val) : "" },
  { key: "volume", label: "Volume", sortable: true },
  { key: "high52Week", label: "52W High" },
  { key: "low52Week", label: "52W Low" },
  { key: "beta", label: "Beta" },
  { key: "dividendYield", label: "Div Yield %", format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) + "%" : "" },
  { key: "forwardPE", label: "Forward P/E", format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) + "%" : "" },
  { key: "trailingPE", label: "Trailing P/E", format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) + "%" : "" },
];
