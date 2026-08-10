import { Op, QueryTypes } from 'sequelize';
import {
  PR,
  ListedCompanies,
  sequelizeBhavcopy,
} from '../models/index.js';
import { computeIndicatorsFromBars } from '../utils/technicalIndicators.js';

const toNum = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

export async function getLatestPrDate() {
  const [row] = await sequelizeBhavcopy.query(
    `SELECT MAX(source_date) AS latest
     FROM pr
     WHERE source_date IS NOT NULL AND TRIM(source_date) <> ''`,
    { type: QueryTypes.SELECT }
  );
  return row?.latest || null;
}

function mapPrRow(row) {
  return {
    date: String(row.source_date).slice(0, 10),
    open: toNum(row.OPEN_PRICE),
    high: toNum(row.HIGH_PRICE),
    low: toNum(row.LOW_PRICE),
    close: toNum(row.CLOSE_PRICE),
    volume: toNum(row.NET_TRDQTY) || 0,
    prev_close: toNum(row.PREV_CL_PR),
    hi_52_wk: toNum(row.HI_52_WK),
    lo_52_wk: toNum(row.LO_52_WK),
    security: row.SECURITY,
  };
}

export async function loadHistoryForSecurities(securities, asOfDate, lookbackDays = 260) {
  if (!securities.length) return new Map();

  const rows = await sequelizeBhavcopy.query(
    `SELECT SECURITY, source_date, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, CLOSE_PRICE,
            NET_TRDQTY, PREV_CL_PR, HI_52_WK, LO_52_WK
     FROM pr
     WHERE SECURITY IN (:securities)
       AND source_date IS NOT NULL
       AND source_date <= :asOf
       AND source_date >= :minDate
     ORDER BY SECURITY ASC, source_date ASC`,
    {
      replacements: {
        securities,
        asOf: asOfDate,
        minDate: String(asOfDate).slice(0, 10) > '2020-01-01'
          ? (() => {
              const d = new Date(String(asOfDate).slice(0, 10));
              d.setDate(d.getDate() - Math.max(lookbackDays + 40, 300));
              return d.toISOString().slice(0, 10);
            })()
          : '2020-01-01',
      },
      type: QueryTypes.SELECT,
    }
  );

  const bySecurity = new Map();
  for (const row of rows) {
    const key = row.SECURITY;
    if (!bySecurity.has(key)) bySecurity.set(key, []);
    const bars = bySecurity.get(key);
    const mapped = mapPrRow(row);
    if (mapped.close == null) continue;
    bars.push(mapped);
  }

  // Keep only last lookbackDays bars per security
  for (const [key, bars] of bySecurity.entries()) {
    if (bars.length > lookbackDays) {
      bySecurity.set(key, bars.slice(bars.length - lookbackDays));
    }
  }

  return bySecurity;
}

export async function buildSymbolLookup() {
  const companies = await ListedCompanies.findAll({
    attributes: ['symbol', 'name', 'series'],
    raw: true,
  });
  const byName = new Map();
  for (const c of companies) {
    const name = String(c.name || '')
      .trim()
      .toUpperCase();
    if (name) byName.set(name, c);
  }
  return byName;
}

export function attachListing(security, byName) {
  const key = String(security || '')
    .trim()
    .toUpperCase();
  const company = byName.get(key);
  return {
    symbol: company?.symbol || null,
    name: company?.name || security,
    series: company?.series || null,
    security,
  };
}

/**
 * Paginated market screener from latest PR + technical indicators.
 */
export async function getTechnicalScreenerPage({
  page = 1,
  limit = 25,
  search = '',
  sortField = 'volume',
  sortOrder = 'DESC',
  filters = {},
} = {}) {
  const asOf = await getLatestPrDate();
  if (!asOf) {
    return {
      success: true,
      as_of: null,
      total: 0,
      page: 1,
      pages: 0,
      data: [],
    };
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
  const searchTerm = String(search || '').trim();

  // First get securities for the latest date (with optional search)
  const searchClause = searchTerm
    ? `AND (SECURITY LIKE :search OR SECURITY LIKE :search2)`
    : '';

  const countRows = await sequelizeBhavcopy.query(
    `SELECT COUNT(*) AS total FROM pr
     WHERE source_date = :asOf ${searchClause}`,
    {
      replacements: {
        asOf,
        search: `%${searchTerm}%`,
        search2: `%${searchTerm.toUpperCase()}%`,
      },
      type: QueryTypes.SELECT,
    }
  );
  const total = Number(countRows[0]?.total || 0);
  const pages = Math.ceil(total / pageSize) || 0;
  const offset = (pageNumber - 1) * pageSize;

  // Fetch a wider page when filtering by indicators (filter after compute)
  const needsIndicatorFilter =
    filters.rsiMin != null ||
    filters.rsiMax != null ||
    filters.bbPosition ||
    filters.obvMin != null ||
    filters.maTrend;

  const fetchLimit = needsIndicatorFilter
    ? Math.min(pageSize * 8, 800)
    : pageSize;
  const fetchOffset = needsIndicatorFilter ? 0 : offset;

  const pageRows = await sequelizeBhavcopy.query(
    `SELECT SECURITY, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, CLOSE_PRICE,
            NET_TRDQTY, PREV_CL_PR, HI_52_WK, LO_52_WK, source_date
     FROM pr
     WHERE source_date = :asOf ${searchClause}
     ORDER BY CAST(NET_TRDQTY AS DECIMAL(20,2)) DESC
     LIMIT :limit OFFSET :offset`,
    {
      replacements: {
        asOf,
        search: `%${searchTerm}%`,
        search2: `%${searchTerm.toUpperCase()}%`,
        limit: fetchLimit,
        offset: fetchOffset,
      },
      type: QueryTypes.SELECT,
    }
  );

  const securities = pageRows.map((r) => r.SECURITY);
  const historyMap = await loadHistoryForSecurities(securities, asOf, 260);
  const byName = await buildSymbolLookup();

  let data = pageRows.map((row) => {
    const bars = historyMap.get(row.SECURITY) || [mapPrRow(row)];
    const indicators = computeIndicatorsFromBars(bars) || {};
    const listing = attachListing(row.SECURITY, byName);
    return {
      id: `${listing.symbol || row.SECURITY}-${asOf}`,
      symbol: listing.symbol || row.SECURITY,
      name: listing.name,
      security: row.SECURITY,
      series: listing.series,
      sector: listing.series || 'EQ',
      currentPrice: indicators.close,
      previousClose: indicators.prev_close,
      change: indicators.close - (indicators.prev_close || indicators.close),
      changePercent: indicators.change_percent,
      volume: indicators.volume,
      high52Week: indicators.hi_52_wk,
      low52Week: indicators.lo_52_wk,
      open: indicators.open,
      high: indicators.high,
      low: indicators.low,
      rsi14: indicators.rsi14,
      sma20: indicators.sma20,
      sma50: indicators.sma50,
      sma100: indicators.sma100,
      sma200: indicators.sma200,
      bbUpper: indicators.bb_upper,
      bbMiddle: indicators.bb_middle,
      bbLower: indicators.bb_lower,
      obv: indicators.obv,
      tradeDate: asOf,
      marketCap: null,
      beta: null,
      dividendYield: null,
      forwardPE: null,
      trailingPE: null,
      industry: null,
      currency: 'INR',
      exchange: 'NSE',
    };
  });

  // Apply technical filters
  const rsiMin = filters.rsiMin != null && filters.rsiMin !== '' ? Number(filters.rsiMin) : null;
  const rsiMax = filters.rsiMax != null && filters.rsiMax !== '' ? Number(filters.rsiMax) : null;
  const obvMin = filters.obvMin != null && filters.obvMin !== '' ? Number(filters.obvMin) : null;
  const priceMin = filters.priceMin != null && filters.priceMin !== '' ? Number(filters.priceMin) : null;
  const priceMax = filters.priceMax != null && filters.priceMax !== '' ? Number(filters.priceMax) : null;
  const volumeMin = filters.volumeMin != null && filters.volumeMin !== '' ? Number(filters.volumeMin) : null;

  data = data.filter((row) => {
    if (rsiMin != null && !Number.isNaN(rsiMin) && (row.rsi14 == null || row.rsi14 < rsiMin)) {
      return false;
    }
    if (rsiMax != null && !Number.isNaN(rsiMax) && (row.rsi14 == null || row.rsi14 > rsiMax)) {
      return false;
    }
    if (obvMin != null && !Number.isNaN(obvMin) && (row.obv == null || row.obv < obvMin)) {
      return false;
    }
    if (priceMin != null && !Number.isNaN(priceMin) && (row.currentPrice == null || row.currentPrice < priceMin)) {
      return false;
    }
    if (priceMax != null && !Number.isNaN(priceMax) && (row.currentPrice == null || row.currentPrice > priceMax)) {
      return false;
    }
    if (volumeMin != null && !Number.isNaN(volumeMin) && (row.volume == null || row.volume < volumeMin)) {
      return false;
    }
    if (filters.bbPosition === 'below_lower') {
      if (row.bbLower == null || row.currentPrice == null || row.currentPrice >= row.bbLower) {
        return false;
      }
    }
    if (filters.bbPosition === 'above_upper') {
      if (row.bbUpper == null || row.currentPrice == null || row.currentPrice <= row.bbUpper) {
        return false;
      }
    }
    if (filters.bbPosition === 'inside') {
      if (
        row.bbLower == null ||
        row.bbUpper == null ||
        row.currentPrice == null ||
        row.currentPrice < row.bbLower ||
        row.currentPrice > row.bbUpper
      ) {
        return false;
      }
    }
    if (filters.maTrend === 'above_sma20') {
      if (row.sma20 == null || row.currentPrice == null || row.currentPrice < row.sma20) {
        return false;
      }
    }
    if (filters.maTrend === 'above_sma50') {
      if (row.sma50 == null || row.currentPrice == null || row.currentPrice < row.sma50) {
        return false;
      }
    }
    if (filters.maTrend === 'golden_cross') {
      if (row.sma50 == null || row.sma200 == null || row.sma50 < row.sma200) {
        return false;
      }
    }
    if (filters.onlyPositiveChange && (row.changePercent ?? 0) <= 0) {
      return false;
    }
    return true;
  });

  // Sort
  const dir = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;
  const fieldMap = {
    marketCap: 'volume',
    currentPrice: 'currentPrice',
    changePercent: 'changePercent',
    volume: 'volume',
    rsi14: 'rsi14',
    obv: 'obv',
    sma20: 'sma20',
    symbol: 'symbol',
    name: 'name',
  };
  const key = fieldMap[sortField] || sortField || 'volume';
  data.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string') return dir * av.localeCompare(String(bv));
    return dir * (Number(av) - Number(bv));
  });

  if (needsIndicatorFilter) {
    const sliced = data.slice(offset, offset + pageSize);
    return {
      success: true,
      as_of: asOf,
      total: data.length,
      page: pageNumber,
      pages: Math.ceil(data.length / pageSize) || 0,
      data: sliced,
      source: 'pr',
    };
  }

  return {
    success: true,
    as_of: asOf,
    total,
    page: pageNumber,
    pages,
    data,
    source: 'pr',
  };
}

/**
 * Build indicator context map for a set of securities (custom formula eval).
 */
export async function buildIndicatorContexts({ asOfDate = null, search = '', limit = 2000 } = {}) {
  const asOf = asOfDate || (await getLatestPrDate());
  if (!asOf) return { asOf: null, rows: [] };

  const searchTerm = String(search || '').trim();
  const searchClause = searchTerm ? `AND SECURITY LIKE :search` : '';

  const latestRows = await sequelizeBhavcopy.query(
    `SELECT SECURITY FROM pr
     WHERE source_date = :asOf ${searchClause}
     ORDER BY SECURITY ASC
     LIMIT :limit`,
    {
      replacements: { asOf, search: `%${searchTerm}%`, limit },
      type: QueryTypes.SELECT,
    }
  );

  const securities = latestRows.map((r) => r.SECURITY);
  const historyMap = await loadHistoryForSecurities(securities, asOf, 260);
  const byName = await buildSymbolLookup();

  const rows = [];
  for (const security of securities) {
    const bars = historyMap.get(security);
    if (!bars?.length) continue;
    const indicators = computeIndicatorsFromBars(bars);
    if (!indicators) continue;
    const listing = attachListing(security, byName);
    rows.push({
      ...listing,
      ...indicators,
    });
  }

  return { asOf, rows };
}

// silence unused import warning for PR model if only raw SQL used
void PR;
void Op;
