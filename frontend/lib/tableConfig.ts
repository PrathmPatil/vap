// tableConfig.ts

import { formatCurrency } from "./utils";

export const getTableConfig = () => [
  { key: "symbol", label: "Symbol", sortable: true },
  { key: "name", label: "Company", sortable: true },
  { key: "currentPrice", label: "Price", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "previousClose", label: "Prev Close", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "changePercent", label: "Change %", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) + "%" : "" },
  { key: "volume", label: "Volume", sortable: true },
  { key: "rsi14", label: "RSI 14", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? val.toFixed(2) : "" },
  { key: "sma20", label: "MA 20", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "sma50", label: "MA 50", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "bbUpper", label: "BB Upper", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "bbLower", label: "BB Lower", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? `₹${val.toFixed(2)}` : "" },
  { key: "obv", label: "OBV", sortable: true, format: (val: number) => (val !== undefined && val !== null ) ? Math.round(val).toLocaleString() : "" },
  { key: "high52Week", label: "52W High" },
  { key: "low52Week", label: "52W Low" },
];
