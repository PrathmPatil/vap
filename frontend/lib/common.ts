export const getFiltersConfig = (filters: any, setFilters: any, uniqueSectors: string[]) => [
  {
    type: "search",
    label: "Search Companies",
    value: filters.searchTerm,
    onChange: (val: string) => setFilters({ ...filters, searchTerm: val }),
    placeholder: "Search stocks..."
  },
  {
    type: "select",
    label: "Sector",
    value: filters.sector,
    onChange: (val: string) => setFilters({ ...filters, sector: val }),
    options: ["all", ...uniqueSectors],
    placeholder: "Select Sector"
  },
  {
    type: "range",
    label: "Market Cap (₹ Cr)",
    value: [filters.marketCapMin, filters.marketCapMax],
    onChange: ([min, max]: number[]) =>
      setFilters({ ...filters, marketCapMin: min, marketCapMax: max }),
    max: 200000,
    step: 1000,
    format: (val: number) => `₹${val} Cr`
  },
  {
    type: "range",
    label: "P/E Ratio",
    value: [filters.peMin, filters.peMax],
    onChange: ([min, max]: number[]) =>
      setFilters({ ...filters, peMin: min, peMax: max }),
    max: 100,
    step: 1
  },
  {
    type: "range",
    label: "P/B Ratio",
    value: [filters.pbMin, filters.pbMax],
    onChange: ([min, max]: number[]) =>
      setFilters({ ...filters, pbMin: min, pbMax: max }),
    max: 20,
    step: 0.1
  },
  {
    type: "range",
    label: "ROE (%)",
    value: [filters.roeMin, filters.roeMax],
    onChange: ([min, max]: number[]) =>
      setFilters({ ...filters, roeMin: min, roeMax: max }),
    max: 100,
    step: 1,
    format: (val: number) => `${val}%`
  },
  {
    type: "range",
    label: "Debt (%)",
    value: [filters.debtMin, filters.debtMax],
    onChange: ([min, max]: number[]) =>
      setFilters({ ...filters, debtMin: min, debtMax: max }),
    max: 100,
    step: 1,
    format: (val: number) => `${val}%`
  },
  {
    type: "range",
    label: "Dividend Yield (%)",
    value: [filters.dividendYieldMin, filters.dividendYieldMax],
    onChange: ([min, max]: number[]) =>
      setFilters({ ...filters, dividendYieldMin: min, dividendYieldMax: max }),
    max: 20,
    step: 0.1,
    format: (val: number) => `${val}%`
  },
  {
    type: "range-single",
    label: "Operating Margin (%)",
    value: filters.operatingMarginMin,
    onChange: ([val]: number[]) =>
      setFilters({ ...filters, operatingMarginMin: val }),
    max: 50,
    min: -50,
    step: 1,
    format: (val: number) => `Min: ${val}%`
  },
  {
    type: "range-single",
    label: "Net Margin (%)",
    value: filters.netMarginMin,
    onChange: ([val]: number[]) =>
      setFilters({ ...filters, netMarginMin: val }),
    max: 50,
    min: -50,
    step: 1,
    format: (val: number) => `Min: ${val}%`
  },
  {
    type: "range-single",
    label: "Current Ratio",
    value: filters.currentRatioMin,
    onChange: ([val]: number[]) =>
      setFilters({ ...filters, currentRatioMin: val }),
    max: 5,
    step: 0.1,
    format: (val: number) => `Min: ${val}`
  },
  {
    type: "range-single",
    label: "Debt to Equity (Max)",
    value: filters.debtToEquityMax,
    onChange: ([val]: number[]) =>
      setFilters({ ...filters, debtToEquityMax: val }),
    max: 10,
    step: 0.1,
    format: (val: number) => `Max: ${val}`
  },
  {
    type: "boolean",
    label: "Only Profitable",
    value: filters.onlyProfitable,
    onChange: (val: boolean) => setFilters({ ...filters, onlyProfitable: val })
  },
  {
    type: "boolean",
    label: "Dividend Paying",
    value: filters.onlyDividendPaying,
    onChange: (val: boolean) => setFilters({ ...filters, onlyDividendPaying: val })
  },
  {
    type: "boolean",
    label: "Positive Growth",
    value: filters.onlyPositiveGrowth,
    onChange: (val: boolean) => setFilters({ ...filters, onlyPositiveGrowth: val })
  }
];
