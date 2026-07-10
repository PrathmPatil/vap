/**
 * Canonical database name resolution with Python/Node env fallbacks.
 * Fails fast when required names cannot be resolved.
 */

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

export const resolveStockDbName = () =>
  firstDefined(
    process.env.STOCK_DB_NAME,
    process.env.DB_STOCK_MARKET,
    process.env.FORMULA_DB_NAME,
    process.env.IPO_DB_NAME
  );

export const resolveBhavcopyDbName = () =>
  firstDefined(process.env.BHAVCOPY_DB_NAME, process.env.DB_BHAVCOPY);

export const resolveScreenerDbName = () =>
  firstDefined(
    process.env.SCREENER_DB_NAME,
    process.env.DB_SCREENER,
    resolveStockDbName()
  );

export const resolveYFinanceDbName = () =>
  firstDefined(
    process.env.YFINANCE_DB_NAME,
    process.env.DB_YFINANCE,
    resolveStockDbName()
  );

export const resolveAnnouncementDbName = () =>
  firstDefined(
    process.env.ANNOUNCEMENT_DB_NAME,
    process.env.DB_BSE,
    resolveStockDbName()
  );

export const resolveNseDynamicDbName = () =>
  firstDefined(
    process.env.NSE_DYNAMIC_DB_NAME,
    process.env.DB_BSE_INDICES,
    resolveStockDbName()
  );

export const validateDbEnv = () => {
  const required = {
    STOCK_DB_NAME: resolveStockDbName(),
    BHAVCOPY_DB_NAME: resolveBhavcopyDbName(),
    SCREENER_DB_NAME: resolveScreenerDbName(),
    YFINANCE_DB_NAME: resolveYFinanceDbName(),
    ANNOUNCEMENT_DB_NAME: resolveAnnouncementDbName(),
    NSE_DYNAMIC_DB_NAME: resolveNseDynamicDbName(),
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      `Missing database configuration for: ${missing.join(', ')}. ` +
        'Set STOCK_DB_NAME/DB_STOCK_MARKET and BHAVCOPY_DB_NAME/DB_BHAVCOPY at minimum.'
    );
  }

  return required;
};
