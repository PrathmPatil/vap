import {
  PR,
  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
  StrongBullishCandleModel,
  ListedCompanies,
  VolumeBreakoutModel,
  TweezerBottomModel,
  BearishCandleModel,
  GapUpDayModel,
  GapDownDayModel,
  FiftyTwoWeekHighModel,
  TopGainerDayModel,
  BandHit52wModel,
  TopLoserDayModel,
  FiftyTwoWeekLowModel,
  DailyMoverUpModel,
  DailyMoverDownModel
} from '../models/index.js';

import {
  generateBearishCandleService,
  generateGapUpService,
  generateGapDownService,
  generateFiftyTwoWeekHighService,
  generateTopGainerService,
  generateBandHit52wService,
  generateTopLoserService,
  generateFiftyTwoWeekLowService,
  generateDailyMoverUpService,
  generateDailyMoverDownService
} from './formulaExtendedService.js';

import logger from '../config/logger.js';
import { performance } from 'node:perf_hooks';
import { fn, col, where, Op, literal } from 'sequelize';

/* =========================================================
   TRADE DATE + LISTED COMPANY HELPERS
========================================================= */

/** Strip Yahoo/exchange suffixes so UI shows RELIANCE not RELIANCE.NS */
export const stripExchangeSuffix = (symbol) =>
  String(symbol || '')
    .trim()
    .replace(/\.(NS|BSE|BO)$/i, '');

const withCleanSymbol = (row, nameToSymbol = null) => {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };
  let symbol = stripExchangeSuffix(next.symbol);
  if (!symbol && nameToSymbol && next.security) {
    symbol = resolveListedSymbol(next.security, nameToSymbol) || '';
  }
  if (!symbol && next.security) {
    // Last resort: keep security visible in symbol column rather than blank/null
    symbol = stripExchangeSuffix(next.security);
  }
  if (next.symbol != null || symbol) next.symbol = symbol || null;
  return next;
};

/** Exclude MISSING placeholders without dropping real rows where status is NULL/OK. */
export const prUsableStatusWhere = () =>
  literal(
    `(status IS NULL OR TRIM(status) = '' OR UPPER(TRIM(status)) = 'OK' OR UPPER(TRIM(status)) <> 'MISSING')`
  );

/**
 * Prod stores source_date as TEXT ('YYYY-MM-DD'), not DATETIME.
 * Comparing to 'YYYY-MM-DD 00:00:00'..'23:59:59' excludes those rows in MySQL string compare.
 */
export const prSourceDateWhere = (tradeDate) => ({
  [Op.and]: [
    where(fn('DATE', col('source_date')), tradeDate),
    prUsableStatusWhere(),
  ],
});

export const bhSourceDateWhere = (tradeDate) => ({
  [Op.and]: [where(fn('DATE', col('source_date')), tradeDate)],
});

export const normalizeTradeDate = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return null;

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const prExistsForDate = async (dateStr) => {
  if (!dateStr) return false;

  const count = await PR.count({
    where: {
      [Op.and]: [
        where(fn('DATE', col('source_date')), dateStr),
        prUsableStatusWhere(),
        { SECURITY: { [Op.ne]: null } },
      ],
    },
  });

  return count > 0;
};

export const resolveTradeDate = async (targetDate = null) => {
  await PR.sync();

  const requested = targetDate ? normalizeTradeDate(targetDate) : null;
  if (requested) {
    if (await prExistsForDate(requested)) {
      return requested;
    }
    // Do not fall back to latest PR date when a specific day was requested —
    // that silently runs formulas for the wrong day.
    return null;
  }

  const latestRow = await PR.findOne({
    attributes: [[fn('MAX', col('source_date')), 'latest_source_date']],
    where: { source_date: { [Op.ne]: null } },
    raw: true,
  });

  const latest = normalizeTradeDate(latestRow?.latest_source_date);

  if (latest && (await prExistsForDate(latest))) {
    return latest;
  }

  return null;
};

const EQUITY_SERIES = ['EQ', 'BE', 'BZ'];

const equitySecurityLiteral = () =>
  literal(`(
    (
      symbol IS NOT NULL
      AND symbol IN (
        SELECT symbol FROM listed_companies
        WHERE UPPER(TRIM(IFNULL(series, ''))) IN ('EQ', 'BE', 'BZ')
      )
    )
    OR (
      security IS NOT NULL
      AND LOWER(security) IN (
        SELECT LOWER(name) FROM listed_companies
        WHERE UPPER(TRIM(IFNULL(series, ''))) IN ('EQ', 'BE', 'BZ')
      )
    )
  )`);

const loadListedCompanyMaps = async () => {
  const listedCompanies = await ListedCompanies.findAll({
    attributes: ['name', 'symbol', 'series'],
    where: {
      series: { [Op.in]: EQUITY_SERIES },
    },
    raw: true,
  });

  const nameToSymbol = new Map();
  const symbolToName = new Map();
  const listedSymbols = new Set();

  for (const company of listedCompanies) {
    const name = String(company.name || '').trim();
    const symbol = stripExchangeSuffix(company.symbol);
    // Case-insensitive keys — PR.SECURITY often differs only by case from listed names.
    if (name) nameToSymbol.set(name.toLowerCase(), symbol);
    if (symbol) {
      listedSymbols.add(symbol);
      listedSymbols.add(symbol.toUpperCase());
      symbolToName.set(symbol, name);
      symbolToName.set(symbol.toLowerCase(), name);
      symbolToName.set(symbol.toUpperCase(), name);
    }
  }

  return { nameToSymbol, symbolToName, listedSymbols };
};

const resolveListedSymbol = (security, nameToSymbol, { equityOnly = false } = {}) => {
  const key = String(security || '').trim().toLowerCase();
  const mapped = nameToSymbol.get(key);
  if (mapped) return stripExchangeSuffix(mapped);
  if (equityOnly) return null;
  return stripExchangeSuffix(security);
};

const resolveSecurityForSymbol = (symbol, symbolToName) => {
  const normalized = stripExchangeSuffix(symbol);
  return (
    symbolToName.get(normalized) ||
    symbolToName.get(normalized.toLowerCase()) ||
    symbolToName.get(normalized.toUpperCase()) ||
    normalized
  );
};

const normalizeChangePercentRange = (minValue, maxValue) => {
  const minNum = minValue === '' || minValue == null ? null : Number(minValue);
  const maxNum = maxValue === '' || maxValue == null ? null : Number(maxValue);
  const hasMin = Number.isFinite(minNum);
  const hasMax = Number.isFinite(maxNum);

  if (!hasMin && !hasMax) return null;
  if (hasMin && !hasMax) return { min: minNum, max: minNum };
  if (!hasMin && hasMax) return { min: maxNum, max: maxNum };
  return {
    min: Math.min(minNum, maxNum),
    max: Math.max(minNum, maxNum),
  };
};

const applyChangePercentFilter = (where, range) => {
  if (!range) return where;
  where.change_percent = {
    ...(where.change_percent || {}),
    [Op.gte]: range.min,
    [Op.lte]: range.max,
  };
  return where;
};

export const processFormulaByDate = async ({
  targetDate,
  formulaModel,
  formulaDateField,
  prDateField = 'source_date',
  generateFunction,
  generatePayload = {},
  existingWhere = {}
}) => {
  const requestedDate = targetDate ? normalizeTradeDate(targetDate) : null;
  const formattedDate = await resolveTradeDate(targetDate);

  if (!formattedDate) {
    return {
      success: false,
      message: 'No PR data found'
    };
  }

  /* =========================================================
     STEP 1: CHECK EXISTING FORMULA DATA
  ========================================================= */

  const existingData = await formulaModel.findAll({
    where: {
      ...existingWhere,
      [formulaDateField]: formattedDate
    },
    raw: true
  });

  if (existingData.length > 0) {
    return {
      success: true,
      source: 'database',
      calculated: false,
      trade_date: formattedDate,
      requested_date: requestedDate,
      totalItems: existingData.length,
      data: existingData
    };
  }

  /* =========================================================
     STEP 2: CHECK PR DATA EXISTS
  ========================================================= */

  const prCount = await PR.count({
    where: where(fn('DATE', col('source_date')), formattedDate)
  });

  if (!prCount) {
    return {
      success: false,
      message: `No PR data found for ${formattedDate}`
    };
  }

  /* =========================================================
     STEP 3: GENERATE FORMULA
  ========================================================= */

  const generatedResult = await generateFunction({
    ...generatePayload,
    targetDate: formattedDate
  });

  /* =========================================================
     STEP 4: RETURN GENERATED DATA
  ========================================================= */

  const insertedData = await formulaModel.findAll({
    where: {
      ...existingWhere,
      [formulaDateField]: formattedDate
    },
    raw: true
  });

  return {
    success: true,
    source: 'fresh_calculation',
    calculated: true,
    trade_date: formattedDate,
    requested_date: requestedDate,
    totalItems: insertedData.length,
    data: insertedData,
    generatedResult
  };
};

/* =========================================================
   RALLY ATTEMPT DETECTION
========================================================= */

export const generateRallyAttemptService = async ({
  currentPage,
  itemsPerPage,
  searchTerm,
  targetDate=null
}) => {
  try {
    await RallyAttemptDayModel.sync();
    await PR.sync();

    /* --------------------------------
       GET LATEST DATE
    -------------------------------- */

    const latestDate = await resolveTradeDate(targetDate);

    if (!latestDate) {
      return {
        success: false,
        message: 'No PR data found'
      };
    }

    /* --------------------------------
       CHECK DUPLICATION
    -------------------------------- */

    const existingCount = await RallyAttemptDayModel.count({
      where: { rally_date: latestDate }
    });

    if (existingCount > 0) {
      return {
        success: true,
        message: 'Already generated',
        count: existingCount,
        totalItems: existingCount,
        already_processed: true,
      };
    }

    /* --------------------------------
       GET LISTED COMPANIES
    -------------------------------- */

    const { nameToSymbol } = await loadListedCompanyMaps();

    /* --------------------------------
       GET LAST 2 TRADE DAYS OF PR DATA
       (scoped — full-history scan hangs under parallel formula runs)
    -------------------------------- */

    const recentDates = await PR.findAll({
      attributes: [[fn('DISTINCT', col('source_date')), 'source_date']],
      where: {
        source_date: { [Op.lte]: latestDate },
        [Op.and]: [prUsableStatusWhere()],
      },
      order: [['source_date', 'DESC']],
      limit: 2,
      raw: true
    });
    const dateList = recentDates
      .map((row) => normalizeTradeDate(row.source_date))
      .filter(Boolean);

    if (dateList.length < 2) {
      return {
        success: false,
        message: `Need at least 2 PR trade dates ending at ${latestDate}`
      };
    }

    // Do not require PR.SECURITY ∈ listed_companies.name — names often diverge and
    // produced 0 matches while PR still had thousands of rows.
    const stockData = await PR.findAll({
      attributes: ['SECURITY', 'CLOSE_PRICE', 'source_date'],
      where: {
        source_date: { [Op.in]: dateList },
        [Op.and]: [prUsableStatusWhere()],
        SECURITY: { [Op.ne]: null },
      },
      order: [
        ['SECURITY', 'ASC'],
        ['source_date', 'ASC']
      ],
      raw: true
    });

    /* --------------------------------
       GROUP DATA BY STOCK
    -------------------------------- */

    const stockMap = {};

    for (const row of stockData) {
      if (!stockMap[row.SECURITY]) {
        stockMap[row.SECURITY] = [];
      }

      stockMap[row.SECURITY].push(row);
    }

    const rallyStocks = [];

    /* --------------------------------
       APPLY RALLY LOGIC
    -------------------------------- */

    for (const security in stockMap) {
      const data = stockMap[security];

      if (data.length < 2) continue;

      const todayRow = data[data.length - 1];
      const prevRow = data[data.length - 2];

      const todayClose = parseFloat(todayRow.CLOSE_PRICE);
      const prevClose = parseFloat(prevRow.CLOSE_PRICE);

      if (todayClose > prevClose) {
        rallyStocks.push({
          symbol: resolveListedSymbol(security, nameToSymbol),
          security: security,
          rally_date: latestDate,
          close_price: todayClose,
          status: 'rally_detected'
        });
      }
    }

    /* --------------------------------
       INSERT DATA
    -------------------------------- */

    if (rallyStocks.length) {
      await RallyAttemptDayModel.bulkCreate(rallyStocks);
    }

    return {
      success: true,
      count: rallyStocks.length,
      data: rallyStocks,
      currentPage,
      itemsPerPage,
      totalItems: rallyStocks.length,
      totalPages: Math.ceil(rallyStocks.length / itemsPerPage),
      date: latestDate
    };
  } catch (error) {
    console.error('❌ Rally Attempt Engine Error:', error);

    return {
      success: false,
      message: error.message
    };
  }
};

/* =========================================================
   FOLLOW THROUGH DAY DETECTION
========================================================= */

export const generateFollowThroughDayService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  targetDate = null
}) => {
  try {
    await FollowThroughDayModel.sync();
    await RallyAttemptDayModel.sync();
    await PR.sync();

    /* --------------------------------
       GET RALLY ATTEMPT STOCKS
       (scoped when targetDate is set — FTD window is days 4–7 after rally)
    -------------------------------- */

    const tradeDate = normalizeTradeDate(targetDate);
    const rallyWhere = {};
    if (tradeDate) {
      const windowStart = new Date(`${tradeDate}T00:00:00`);
      windowStart.setDate(windowStart.getDate() - 20);
      const startStr = windowStart.toISOString().slice(0, 10);
      rallyWhere.rally_date = {
        [Op.gte]: startStr,
        [Op.lte]: tradeDate
      };
    }

    const rallyStocks = await RallyAttemptDayModel.findAll({
      attributes: ['symbol', 'rally_date'],
      where: rallyWhere,
      raw: true
    });

    if (!rallyStocks.length) {
      return {
        success: false,
        data: [],
        message: 'No rally attempt stocks found'
      };
    }

    const { symbolToName } = await loadListedCompanyMaps();

    const rallyJobs = [];
    const securitySet = new Set();
    let minRallyDate = null;

    for (const rally of rallyStocks) {
      const rallyDateStr = normalizeTradeDate(rally.rally_date);
      if (!rallyDateStr) continue;
      const securityName = resolveSecurityForSymbol(rally.symbol, symbolToName);
      if (!securityName) continue;
      securitySet.add(securityName);
      if (!minRallyDate || rallyDateStr < minRallyDate) minRallyDate = rallyDateStr;
      rallyJobs.push({
        symbol: rally.symbol,
        rallyDateStr,
        securityName
      });
    }

    const existingRows = await FollowThroughDayModel.findAll({
      attributes: ['symbol', 'rally_date'],
      raw: true
    });
    const existingKeys = new Set(
      existingRows.map(
        (row) => `${row.symbol}|${normalizeTradeDate(row.rally_date) || ''}`
      )
    );

    const prRows =
      securitySet.size && minRallyDate
        ? await PR.findAll({
            attributes: [
              'SECURITY',
              'source_date',
              'CLOSE_PRICE',
              'NET_TRDQTY'
            ],
            where: {
              SECURITY: { [Op.in]: [...securitySet] },
              source_date: { [Op.gte]: minRallyDate }
            },
            order: [
              ['SECURITY', 'ASC'],
              ['source_date', 'ASC']
            ],
            raw: true
          })
        : [];

    const prBySecurity = new Map();
    for (const row of prRows) {
      const key = row.SECURITY;
      if (!prBySecurity.has(key)) prBySecurity.set(key, []);
      prBySecurity.get(key).push(row);
    }

    const insertedFTD = [];

    for (const rally of rallyJobs) {
      const stockData = prBySecurity.get(rally.securityName) || [];
      if (stockData.length < 7) continue;

      const rallyIndex = stockData.findIndex(
        (row) => normalizeTradeDate(row.source_date) === rally.rallyDateStr
      );
      if (rallyIndex === -1) continue;

      for (let i = rallyIndex + 3; i <= rallyIndex + 6; i++) {
        if (!stockData[i]) continue;

        const today = Number(stockData[i].CLOSE_PRICE);
        const prev = Number(stockData[i - 1].CLOSE_PRICE);
        if (!prev) continue;

        const percent = ((today - prev) / prev) * 100;
        const volumeToday = Number(stockData[i].NET_TRDQTY);
        const volumePrev = Number(stockData[i - 1].NET_TRDQTY);

        if (percent >= 1.5 && volumeToday > volumePrev) {
          const ftdDateStr = normalizeTradeDate(stockData[i].source_date);
          const dedupeKey = `${rally.symbol}|${rally.rallyDateStr}`;
          if (!existingKeys.has(dedupeKey)) {
            existingKeys.add(dedupeKey);
            insertedFTD.push({
              symbol: rally.symbol,
              rally_date: rally.rallyDateStr,
              ftd_date: ftdDateStr,
              change_percent: percent,
              volume: volumeToday,
              status: 'ftd_detected'
            });
          }
          break;
        }
      }
    }

    if (insertedFTD.length) {
      await FollowThroughDayModel.bulkCreate(insertedFTD, {
        ignoreDuplicates: true
      });
    }

    /* --------------------------------
       PAGINATION
    -------------------------------- */

    const whereCondition = {};

    if (searchTerm) {
      whereCondition.symbol = {
        [Op.like]: `%${searchTerm}%`
      };
    }

    const { count, rows } = await FollowThroughDayModel.findAndCountAll({
      where: whereCondition,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      order: [['ftd_date', 'DESC']],
      raw: true
    });

    const offset = (currentPage - 1) * itemsPerPage;

    const formattedRows = rows.map((row, index) => ({
      id: offset + index + 1,
      symbol: stripExchangeSuffix(row.symbol),
      rally_date: row.rally_date,
      ftd_date: row.ftd_date,
      change_percent: row.change_percent,
      volume: row.volume
    }));

    return {
      success: true,
      data: formattedRows,
      totalItems: count,
      currentPage,
      itemsPerPage,
      totalPages: Math.ceil(count / itemsPerPage)
    };
  } catch (error) {
    console.error('❌ Follow Through Engine Error:', error);

    return {
      success: false,
      data: [],
      message: error.message
    };
  }
};

/* =========================================================
   BUY DAY DETECTION
========================================================= */

export const generateBuyDayService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  targetDate = null
}) => {
  try {
    console.log('🚀 Buy Day Engine Started');

    await BuyDayModel.sync();
    await PR.sync();

    /* --------------------------------
       GET FOLLOW THROUGH DAY STOCKS
       (scoped when targetDate is set — buy window is next 10 sessions after FTD)
    -------------------------------- */

    const tradeDate = normalizeTradeDate(targetDate);
    const ftdWhere = {};
    if (tradeDate) {
      const windowStart = new Date(`${tradeDate}T00:00:00`);
      windowStart.setDate(windowStart.getDate() - 20);
      const startStr = windowStart.toISOString().slice(0, 10);
      ftdWhere.ftd_date = {
        [Op.gte]: startStr,
        [Op.lte]: tradeDate
      };
    }

    const ftdStocks = await FollowThroughDayModel.findAll({
      attributes: ['symbol', 'rally_date', 'ftd_date'],
      where: ftdWhere,
      raw: true
    });

    if (!ftdStocks.length) {
      return {
        success: false,
        data: [],
        message: 'No Follow Through Day stocks found'
      };
    }

    console.log('📊 FTD Stocks:', ftdStocks.length);

    const { symbolToName } = await loadListedCompanyMaps();

    const ftdJobs = [];
    const securitySet = new Set();
    let minFtdDate = null;

    for (const ftd of ftdStocks) {
      const rallyDateStr = normalizeTradeDate(ftd.rally_date);
      const ftdDateStr = normalizeTradeDate(ftd.ftd_date);
      if (!rallyDateStr || !ftdDateStr) continue;
      const securityName = resolveSecurityForSymbol(ftd.symbol, symbolToName);
      if (!securityName) continue;
      securitySet.add(securityName);
      if (!minFtdDate || ftdDateStr < minFtdDate) minFtdDate = ftdDateStr;
      ftdJobs.push({
        symbol: ftd.symbol,
        rallyDateStr,
        ftdDateStr,
        securityName
      });
    }

    const existingRows = await BuyDayModel.findAll({
      attributes: ['symbol', 'ftd_date'],
      raw: true
    });
    const existingKeys = new Set(
      existingRows.map(
        (row) => `${row.symbol}|${normalizeTradeDate(row.ftd_date) || ''}`
      )
    );

    const prRows =
      securitySet.size && minFtdDate
        ? await PR.findAll({
            attributes: [
              'SECURITY',
              'source_date',
              'CLOSE_PRICE',
              'HIGH_PRICE',
              'NET_TRDQTY'
            ],
            where: {
              SECURITY: { [Op.in]: [...securitySet] },
              source_date: { [Op.gte]: minFtdDate }
            },
            order: [
              ['SECURITY', 'ASC'],
              ['source_date', 'ASC']
            ],
            raw: true
          })
        : [];

    const prBySecurity = new Map();
    for (const row of prRows) {
      const key = row.SECURITY;
      if (!prBySecurity.has(key)) prBySecurity.set(key, []);
      prBySecurity.get(key).push(row);
    }

    const insertedBuyDays = [];

    for (const ftd of ftdJobs) {
      const stockData = prBySecurity.get(ftd.securityName) || [];
      if (!stockData.length) continue;

      const ftdIndex = stockData.findIndex(
        (row) => normalizeTradeDate(row.source_date) === ftd.ftdDateStr
      );
      if (ftdIndex === -1) continue;

      const ftdHigh = Number(stockData[ftdIndex].HIGH_PRICE);

      for (let i = ftdIndex + 1; i <= ftdIndex + 10; i++) {
        if (!stockData[i]) continue;

        const price = Number(stockData[i].CLOSE_PRICE);
        const volume = Number(stockData[i].NET_TRDQTY);
        const prevVolume = Number(stockData[i - 1].NET_TRDQTY);

        if (price > ftdHigh && volume > prevVolume) {
          const buyDateStr = normalizeTradeDate(stockData[i].source_date);
          const dedupeKey = `${ftd.symbol}|${ftd.ftdDateStr}`;
          if (!existingKeys.has(dedupeKey)) {
            existingKeys.add(dedupeKey);
            insertedBuyDays.push({
              symbol: ftd.symbol,
              rally_date: ftd.rallyDateStr,
              ftd_date: ftd.ftdDateStr,
              buy_date: buyDateStr,
              breakout_price: price,
              status: 'ready_to_buy'
            });
          }
          break;
        }
      }
    }

    if (insertedBuyDays.length) {
      await BuyDayModel.bulkCreate(insertedBuyDays, {
        ignoreDuplicates: true
      });
    }

    /* --------------------------------
       PAGINATION
    -------------------------------- */

    const whereCondition = {};

    if (searchTerm) {
      whereCondition.symbol = {
        [Op.like]: `%${searchTerm}%`
      };
    }

    const { count, rows } = await BuyDayModel.findAndCountAll({
      where: whereCondition,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      order: [['buy_date', 'DESC']],
      raw: true
    });

    const offset = (currentPage - 1) * itemsPerPage;

    const formattedRows = rows.map((row, index) => ({
      id: offset + index + 1,
      symbol: stripExchangeSuffix(row.symbol),
      rally_date: row.rally_date,
      ftd_date: row.ftd_date,
      buy_date: row.buy_date,
      breakout_price: row.breakout_price
    }));

    return {
      success: true,
      data: formattedRows,
      totalItems: count,
      currentPage,
      itemsPerPage,
      totalPages: Math.ceil(count / itemsPerPage)
    };
  } catch (error) {
    console.error('❌ Buy Day Engine Error:', error);

    return {
      success: false,
      data: [],
      message: error.message
    };
  }
};

/* =========================================================
   MAIN FORMULA ENGINE
========================================================= */

const shouldBlockDependentFormulas = (stepResult = {}) => {
  if (stepResult.status !== 'failed') {
    return false;
  }

  if (stepResult.error) {
    return true;
  }

  return ['No PR data found'].includes(stepResult.message);
};

const countFormulaMatches = (key, result = {}) => {
  switch (key) {
    case 'strong_bullish':
      return result.totalItems || 0;
    case 'rally_attempt':
      return result.count || result.totalItems || 0;
    case 'follow_through_day':
      return result.totalItems || 0;
    case 'buy_day':
      return result.totalItems || 0;
    case 'volume_breakout':
      return result.totalItems || 0;
    case 'tweezer_bottom':
      return result.total_signals || 0;
    default:
      return result.totalItems || result.count || 0;
  }
};

const runFormulaStep = async ({ key, label, dependsOn, execute, completedSteps }) => {
  const missingDependencies = dependsOn.filter((dep) => !completedSteps.has(dep));

  if (missingDependencies.length) {
    return {
      key,
      label,
      status: 'skipped',
      depends_on: dependsOn,
      skipped_reason: `Waiting for: ${missingDependencies.join(', ')}`,
      passed_count: 0,
      records_stored: 0
    };
  }

  const startedAt = performance.now();

  try {
    const result = await execute();
    const passedCount = countFormulaMatches(key, result);
    const success = result?.success !== false;

    return {
      key,
      label,
      status: success ? 'success' : 'failed',
      depends_on: dependsOn,
      passed_count: passedCount,
      records_stored: passedCount,
      duration_ms: Math.round(performance.now() - startedAt),
      message: result?.message || null,
      already_processed: Boolean(result?.already_processed || result?.message === 'Already generated'),
      result
    };
  } catch (error) {
    return {
      key,
      label,
      status: 'failed',
      depends_on: dependsOn,
      passed_count: 0,
      records_stored: 0,
      duration_ms: Math.round(performance.now() - startedAt),
      error: error.message
    };
  }
};

// Queue concurrent formula-engine HTTP calls (daily + manual + range).
let formulaEngineTail = Promise.resolve();

export const runFormulaEngineService = async ({
  targetDate = null,
  triggerSource = null
} = {}) => {
  let releaseQueue = () => {};
  const previous = formulaEngineTail;
  formulaEngineTail = new Promise((resolve) => {
    releaseQueue = resolve;
  });
  await previous;

  try {
    return await runFormulaEngineServiceLocked({ targetDate, triggerSource });
  } finally {
    releaseQueue();
  }
};

const runFormulaEngineServiceLocked = async ({
  targetDate = null,
  triggerSource = null
} = {}) => {
  const engineStartedAt = new Date();
  const startedAt = performance.now();

  const tradeDate = await resolveTradeDate(targetDate);

  if (!tradeDate) {
    const requested = targetDate ? normalizeTradeDate(targetDate) : null;
    throw new Error(
      requested
        ? `No PR bhavcopy data for trade_date=${requested}. Fetch bhavcopy for that date first (force_refresh=true if needed).`
        : 'No PR bhavcopy data available to run formulas'
    );
  }

  logger.info(
    `🚀 Formula Engine Started | trade_date=${tradeDate} | trigger=${triggerSource || 'manual'}`
  );

  const completedSteps = new Set();
  const processedSteps = new Set();
  const resultsByKey = {};

  const steps = [
    {
      key: 'strong_bullish',
      label: 'Strong Bullish Candle',
      dependsOn: [],
      execute: () =>
        generateStrongBullishService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: '',
          base_percent: 2,
          targetDate: tradeDate
        })
    },
    {
      key: 'bearish_candle',
      label: 'Bearish Candle',
      dependsOn: [],
      execute: () =>
        generateBearishCandleService({
          targetDate: tradeDate,
          base_percent: 2
        })
    },
    {
      key: 'gap_up_day',
      label: 'Gap Up Day',
      dependsOn: [],
      execute: () =>
        generateGapUpService({
          targetDate: tradeDate,
          gap_threshold: 1
        })
    },
    {
      key: 'gap_down_day',
      label: 'Gap Down Day',
      dependsOn: [],
      execute: () =>
        generateGapDownService({
          targetDate: tradeDate,
          gap_threshold: 1
        })
    },
    {
      key: 'fifty_two_week_high',
      label: '52-Week High Breakout',
      dependsOn: [],
      execute: () =>
        generateFiftyTwoWeekHighService({
          targetDate: tradeDate
        })
    },
    {
      key: 'top_gainer_day',
      label: 'Top Gainer Day',
      dependsOn: [],
      execute: () =>
        generateTopGainerService({
          targetDate: tradeDate,
          min_percent: 3
        })
    },
    {
      key: 'band_hit_52w',
      label: '52W Band Hit',
      dependsOn: [],
      execute: () =>
        generateBandHit52wService({
          targetDate: tradeDate
        })
    },
    {
      key: 'top_loser_day',
      label: 'Top Loser Day',
      dependsOn: [],
      execute: () =>
        generateTopLoserService({
          targetDate: tradeDate,
          min_percent: 3
        })
    },
    {
      key: 'fifty_two_week_low',
      label: '52-Week Low Breakdown',
      dependsOn: [],
      execute: () =>
        generateFiftyTwoWeekLowService({
          targetDate: tradeDate
        })
    },
    {
      key: 'daily_mover_up',
      label: 'Daily Mover Up',
      dependsOn: [],
      execute: () =>
        generateDailyMoverUpService({
          targetDate: tradeDate,
          min_percent: 3
        })
    },
    {
      key: 'daily_mover_down',
      label: 'Daily Mover Down',
      dependsOn: [],
      execute: () =>
        generateDailyMoverDownService({
          targetDate: tradeDate,
          min_percent: 3
        })
    },
    {
      key: 'rally_attempt',
      label: 'Rally Attempt Day',
      dependsOn: [],
      execute: () =>
        generateRallyAttemptService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: '',
          targetDate: tradeDate
        })
    },
    {
      key: 'volume_breakout',
      label: 'Volume Breakout',
      dependsOn: [],
      execute: () =>
        generateVolumeBreakoutService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: '',
          targetDate: tradeDate
        })
    },
    {
      key: 'tweezer_bottom',
      label: 'Tweezer Bottom',
      dependsOn: [],
      execute: () =>
        detectTweezerBottomPatterns({
          saveToDb: true,
          targetDate: tradeDate,
          forceRefresh: false
        })
    },
    {
      key: 'follow_through_day',
      label: 'Follow Through Day',
      dependsOn: ['rally_attempt'],
      execute: () =>
        generateFollowThroughDayService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: '',
          targetDate: tradeDate
        })
    },
    {
      key: 'buy_day',
      label: 'Buy Day',
      dependsOn: ['follow_through_day'],
      execute: () =>
        generateBuyDayService({
          currentPage: 1,
          itemsPerPage: 10000,
          searchTerm: '',
          targetDate: tradeDate
        })
    }
  ];

  const pending = [...steps];
  const FORMULA_CONCURRENCY = Math.max(
    1,
    Number(process.env.FORMULA_ENGINE_CONCURRENCY || 2)
  );

  // Run ready formulas in parallel batches (not all 14 at once — that starves MySQL).
  // FTD→Buy still wait via dependsOn.
  while (pending.length > 0) {
    const ready = pending.filter((step) =>
      step.dependsOn.every((dep) => processedSteps.has(dep))
    );

    if (!ready.length) {
      for (const step of pending) {
        resultsByKey[step.key] = {
          key: step.key,
          label: step.label,
          status: 'skipped',
          depends_on: step.dependsOn,
          skipped_reason: 'Unresolved dependencies',
          passed_count: 0,
          records_stored: 0
        };
      }
      break;
    }

    const batch = ready.slice(0, FORMULA_CONCURRENCY);

    console.log(
      `\n🚀 Running ${batch.length} formula(s) in parallel: ${batch
        .map((step) => step.label)
        .join(', ')}`
    );

    const waveResults = await Promise.all(
      batch.map((step) =>
        runFormulaStep({
          ...step,
          completedSteps
        })
      )
    );

    for (const stepResult of waveResults) {
      resultsByKey[stepResult.key] = stepResult;
      processedSteps.add(stepResult.key);

      if (!shouldBlockDependentFormulas(stepResult)) {
        completedSteps.add(stepResult.key);
      }

      console.log(
        `✅ ${stepResult.label} | status=${stepResult.status} | passed=${stepResult.passed_count}`
      );
    }

    const batchKeys = new Set(batch.map((step) => step.key));
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      if (batchKeys.has(pending[i].key)) {
        pending.splice(i, 1);
      }
    }
  }

  const formulaResults = steps
    .map((step) => resultsByKey[step.key])
    .filter(Boolean);

  const totalProcessed = formulaResults.reduce(
    (sum, item) => sum + (item.passed_count || 0),
    0
  );
  const durationMs = Math.round(performance.now() - startedAt);

  return {
    success: true,
    trade_date: tradeDate,
    trigger_source: triggerSource,
    processed_symbols: totalProcessed,
    duration_ms: durationMs,
    started_at: engineStartedAt.toISOString(),
    formulas: formulaResults
  };
};

/* =========================================================
   STRONG BULLISH ENGINE
========================================================= */

export const generateStrongBullishService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  base_percent = 2,
  targetDate = null
}) => {
  try {
    /* --------------------------------
       GET LATEST DATE
    -------------------------------- */

    await StrongBullishCandleModel.sync();
    await PR.sync();

    const latestDate = await resolveTradeDate(targetDate);

    if (!latestDate) {
      return {
        success: false,
        data: [],
        message: 'No PR data found'
      };
    }

    /* --------------------------------
       CHECK IF ALREADY GENERATED
    -------------------------------- */

    const existingCount = await StrongBullishCandleModel.count({
      where: { trade_date: latestDate, base_percent }
    });

    /* --------------------------------
       GENERATE IF NOT EXISTS
    -------------------------------- */

    if (existingCount === 0) {
      const { nameToSymbol } = await loadListedCompanyMaps();

      /* -------- FETCH PR DATA -------- */

      const stocks = await PR.findAll({
        attributes: ['SECURITY', 'OPEN_PRICE', 'CLOSE_PRICE', 'source_date'],
        where: prSourceDateWhere(latestDate),
        raw: true
      });

      const bullishStocks = [];

      for (const stock of stocks) {
        const open = Number(stock.OPEN_PRICE);
        const close = Number(stock.CLOSE_PRICE);

        if (!open || !close) continue;

        const symbol = resolveListedSymbol(stock.SECURITY, nameToSymbol, {
          equityOnly: true,
        });
        if (!symbol) continue;

        const percent = ((close - open) / open) * 100;
        if (percent >= base_percent) {
          bullishStocks.push({
            security: stock.SECURITY,
            symbol,
            trade_date: latestDate,
            open_price: open,
            close_price: close,
            change_percent: percent,
            base_percent
          });
        }
      }

      if (bullishStocks.length) {
        await StrongBullishCandleModel.bulkCreate(bullishStocks);
      }
    }

    /* --------------------------------
       FETCH WITH PAGINATION
    -------------------------------- */

    const whereCondition = {
      trade_date: latestDate,
      base_percent
    };

    if (searchTerm) {
      whereCondition.security = {
        [Op.like]: `%${searchTerm}%`
      };
    }

    const { count, rows } = await StrongBullishCandleModel.findAndCountAll({
      where: whereCondition,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      order: [['change_percent', 'DESC']],
      raw: true
    });

    const offset = (currentPage - 1) * itemsPerPage;
    const { nameToSymbol } = await loadListedCompanyMaps();

    const formattedRows = rows.map((row, index) => {
      const cleaned = withCleanSymbol(row, nameToSymbol);
      return {
        id: offset + index + 1,
        security: cleaned.security,
        symbol: cleaned.symbol,
        open_price: cleaned.open_price,
        close_price: cleaned.close_price,
        change_percent: cleaned.change_percent,
        trade_date: cleaned.trade_date,
      };
    });

    const patches = rows
      .map((row, index) => {
        const symbol = formattedRows[index]?.symbol;
        if (row.id && symbol && !stripExchangeSuffix(row.symbol)) {
          return { id: row.id, symbol };
        }
        return null;
      })
      .filter(Boolean);

    if (patches.length) {
      await Promise.all(
        patches.map((patch) =>
          StrongBullishCandleModel.update(
            { symbol: patch.symbol },
            { where: { id: patch.id } }
          ).catch(() => null)
        )
      );
    }

    return {
      success: true,
      data: formattedRows,
      latest_date: latestDate,
      currentPage,
      itemsPerPage,
      totalItems: count,
      totalPages: Math.ceil(count / itemsPerPage)
    };
  } catch (error) {
    console.error('❌ Strong Bullish Engine Error:', error);

    return {
      success: false,
      data: [],
      message: error.message
    };
  }
};

/* =========================================================
  VOLUME BREAKOUT ENGINE
========================================================= */
export const generateVolumeBreakoutService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  targetDate = null
}) => {
  await VolumeBreakoutModel.sync();
  await PR.sync();

  const latestDate = await resolveTradeDate(targetDate);
  if (!latestDate) {
    return {
      success: false,
      data: [],
      message: 'No PR data found',
    };
  }

  const existingCount = await VolumeBreakoutModel.count({
    where: { trade_date: latestDate },
  });

  if (existingCount === 0) {
    // Single bulk query: for each security, rank rows by source_date DESC and pick latest 11.
    // This replaces N per-security queries with one SQL window-function query.
    const sequelize = PR.sequelize;
    const breakoutStocks = [];

    const { QueryTypes } = await import('sequelize');
    // QueryTypes.SELECT returns the rows array directly (not [rows, metadata]).
    const rows = await sequelize.query(
      `
      SELECT *
      FROM (
        SELECT
          SECURITY, source_date, CLOSE_PRICE, NET_TRDQTY,
          ROW_NUMBER() OVER (PARTITION BY SECURITY ORDER BY source_date DESC) AS rn
        FROM \`pr\`
        WHERE SECURITY IS NOT NULL
          AND (status IS NULL OR TRIM(status) = '' OR UPPER(TRIM(status)) = 'OK' OR UPPER(TRIM(status)) <> 'MISSING')
          AND DATE(source_date) <= :latestDate
          AND DATE(source_date) >= DATE_SUB(:latestDate, INTERVAL 45 DAY)
      ) ranked
      WHERE rn <= 11
      `,
      { replacements: { latestDate }, type: QueryTypes.SELECT }
    );

    // Group by security
    const bySecurity = {};
    for (const row of rows || []) {
      if (!bySecurity[row.SECURITY]) bySecurity[row.SECURITY] = [];
      bySecurity[row.SECURITY].push(row);
    }

    for (const [security, history] of Object.entries(bySecurity)) {
      if (history.length < 11) continue;
      // Already sorted DESC by rn
      const today = history[0];
      const prev = history[1];
      const todayDate = normalizeTradeDate(today.source_date);
      if (todayDate !== latestDate) continue;

      const avgVolume =
        history.slice(1).reduce((sum, row) => sum + Number(row.NET_TRDQTY), 0) / 10;
      const todayVolume = Number(today.NET_TRDQTY);

      if (todayVolume >= avgVolume * 2 && Number(today.CLOSE_PRICE) > Number(prev.CLOSE_PRICE)) {
        breakoutStocks.push({
          security,
          trade_date: todayDate,
          close_price: today.CLOSE_PRICE,
          volume: todayVolume,
          avg_volume_10d: avgVolume,
          volume_ratio: todayVolume / avgVolume,
        });
      }
    }

    if (breakoutStocks.length) {
      await VolumeBreakoutModel.bulkCreate(breakoutStocks, {
        ignoreDuplicates: true,
      });
    }
  }

  const whereCondition = { trade_date: latestDate };
  if (searchTerm) {
    whereCondition.security = { [Op.like]: `%${searchTerm}%` };
  }

  const { count, rows } = await VolumeBreakoutModel.findAndCountAll({
    where: whereCondition,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    order: [['volume_ratio', 'DESC']],
    raw: true,
  });

  const offset = (currentPage - 1) * itemsPerPage;

  const data = rows.map((row, index) => ({
    id: offset + index + 1,
    ...row,
  }));

  return {
    success: true,
    data,
    latest_date: latestDate,
    totalItems: count,
    currentPage,
    itemsPerPage,
    totalPages: Math.ceil(count / itemsPerPage) || 1,
  };
};

/* =========================================================
  TWEEZER BOTTOM ENGINE
========================================================= */
export const detectTweezerBottomPatterns = async (options = {}) => {
  const { saveToDb = true, targetDate = null, forceRefresh = false } = options;

  await PR.sync();
  await TweezerBottomModel.sync();
  let analysisDateStr;
  if (targetDate) {
    analysisDateStr = normalizeTradeDate(targetDate);
  } else {
    analysisDateStr = await resolveTradeDate();
  }

  if (!analysisDateStr) {
    return {
      success: false,
      message: 'No PR data found',
      signals: [],
      total_signals: 0,
    };
  }

  // Check if already processed for today
  if (!forceRefresh && saveToDb && TweezerBottomModel) {
    const existingForDate = await TweezerBottomModel.findOne({
      where: {
        trade_date: analysisDateStr
      },
      limit: 1
    });

    if (existingForDate) {
      return {
        success: true,
        message: `Patterns already detected for ${analysisDateStr}`,
        signals: [],
        total_signals: 0,
        already_processed: true,
        analysis_date: analysisDateStr
      };
    }
  }

  // Bulk load: only securities that traded on analysisDate, plus ~30 days history.
  const tradedToday = await PR.findAll({
    attributes: ['SECURITY'],
    where: where(fn('DATE', col('source_date')), analysisDateStr),
    group: ['SECURITY'],
    raw: true
  });

  const securities = tradedToday
    .map((row) => row.SECURITY)
    .filter(Boolean);

  if (!securities.length) {
    return {
      success: true,
      message: `No PR securities for ${analysisDateStr}`,
      signals: [],
      total_signals: 0,
      analysis_date: analysisDateStr
    };
  }

  const windowStart = new Date(`${analysisDateStr}T00:00:00`);
  windowStart.setDate(windowStart.getDate() - 45);
  const startStr = windowStart.toISOString().slice(0, 10);

  const historyRows = await PR.findAll({
    attributes: [
      'SECURITY',
      'source_date',
      'OPEN_PRICE',
      'HIGH_PRICE',
      'LOW_PRICE',
      'CLOSE_PRICE',
      'NET_TRDQTY'
    ],
    where: {
      SECURITY: { [Op.in]: securities },
      [Op.and]: [
        where(fn('DATE', col('source_date')), { [Op.gte]: startStr }),
        where(fn('DATE', col('source_date')), { [Op.lte]: analysisDateStr }),
        prUsableStatusWhere(),
      ],
    },
    order: [
      ['SECURITY', 'ASC'],
      ['source_date', 'DESC']
    ],
    raw: true
  });

  const historyBySecurity = new Map();
  for (const row of historyRows) {
    if (!historyBySecurity.has(row.SECURITY)) {
      historyBySecurity.set(row.SECURITY, []);
    }
    const list = historyBySecurity.get(row.SECURITY);
    if (list.length < 22) list.push(row);
  }

  const signals = [];
  const errors = [];

  for (const security of securities) {
    try {
      const history = historyBySecurity.get(security) || [];
      if (history.length < 22) continue;

      const today = history[0];
      const prev = history[1];

      const todayDateStr = normalizeTradeDate(today.source_date);
      if (todayDateStr !== analysisDateStr) continue;

      /* ---------------- Equal Low Detection ---------------- */
      const lowDiff =
        (Math.abs(prev.LOW_PRICE - today.LOW_PRICE) / prev.LOW_PRICE) * 100;
      const equalLows = lowDiff <= 0.5;

      /* ---------------- Candle Direction ---------------- */
      const bearishPrev = prev.CLOSE_PRICE < prev.OPEN_PRICE;
      const bullishCurr = today.CLOSE_PRICE > today.OPEN_PRICE;

      /* ---------------- Body Strength Calculation ---------------- */
      const prevRange = prev.HIGH_PRICE - prev.LOW_PRICE;
      const prevBody = Math.abs(prev.OPEN_PRICE - prev.CLOSE_PRICE);
      const prevBodyPct = prevRange > 0 ? prevBody / prevRange : 0;
      const strongBearBody = prevBodyPct >= 0.75;

      const currRange = today.HIGH_PRICE - today.LOW_PRICE;
      const currBody = Math.abs(today.CLOSE_PRICE - today.OPEN_PRICE);
      const currBodyPct = currRange > 0 ? currBody / currRange : 0;
      const strongBullBody = currBodyPct >= 0.75;

      /* ---------------- Trend Analysis ---------------- */
      const sma20 =
        history.slice(1, 21).reduce((s, r) => s + Number(r.CLOSE_PRICE), 0) /
        20;
      const downtrend = prev.CLOSE_PRICE < sma20;

      /* ---------------- Volume Analysis ---------------- */
      const volMA =
        history.slice(1, 21).reduce((s, r) => s + Number(r.NET_TRDQTY), 0) / 20;
      const prevVolCond = prev.NET_TRDQTY >= volMA;
      const currVolCond = today.NET_TRDQTY >= volMA;
      const volumeRatioPrev = prev.NET_TRDQTY / volMA;
      const volumeRatioCurr = today.NET_TRDQTY / volMA;

      /* ---------------- Calculate Signal Strength ---------------- */
      let signalStrength = 'Weak';
      let strengthScore = 0;

      if (lowDiff <= 0.2) strengthScore += 2;
      else if (lowDiff <= 0.5) strengthScore += 1;

      if (prevBodyPct >= 0.9) strengthScore += 2;
      else if (prevBodyPct >= 0.75) strengthScore += 1;

      if (currBodyPct >= 0.9) strengthScore += 2;
      else if (currBodyPct >= 0.75) strengthScore += 1;

      if (volumeRatioPrev >= 1.5) strengthScore += 1;
      if (volumeRatioCurr >= 1.5) strengthScore += 1;

      if (strengthScore >= 6) signalStrength = 'Very Strong';
      else if (strengthScore >= 4) signalStrength = 'Strong';
      else if (strengthScore >= 2) signalStrength = 'Moderate';

      /* ---------------- Final Pattern Detection ---------------- */
      const isTweezerBottom =
        equalLows &&
        bearishPrev &&
        bullishCurr &&
        strongBearBody &&
        strongBullBody &&
        downtrend &&
        prevVolCond &&
        currVolCond;

      if (isTweezerBottom) {
        const signalData = {
          security: today.SECURITY,
          trade_date: today.source_date,
          close_price: today.CLOSE_PRICE,
          pattern_name: 'Tweezer Bottom',
          low_diff_percentage: lowDiff,
          prev_body_strength: prevBodyPct,
          curr_body_strength: currBodyPct,
          volume_ratio_prev: volumeRatioPrev,
          volume_ratio_curr: volumeRatioCurr,
          prev_close: prev.CLOSE_PRICE,
          prev_open: prev.OPEN_PRICE,
          prev_low: prev.LOW_PRICE,
          curr_open: today.OPEN_PRICE,
          curr_low: today.LOW_PRICE,
          sma_20: sma20,
          signal_strength: signalStrength,
          status: 'Active'
        };

        signals.push(signalData);
      }
    } catch (error) {
      errors.push({
        security,
        error: error.message
      });
    }
  }

  // Save to database if requested
  let savedResult = null;
  if (saveToDb && signals.length > 0 && TweezerBottomModel) {
    savedResult = await saveSignalsToDatabase(signals, TweezerBottomModel);
  }

  // Return comprehensive results
  return {
    success: true,
    analysis_date: analysisDateStr,
    total_stocks_analyzed: securities.length,
    total_signals: signals.length,
    signals: signals,
    errors: errors,
    saved_to_db: saveToDb && savedResult ? savedResult : null,
    summary: {
      by_strength: {
        'Very Strong': signals.filter(
          (s) => s.signal_strength === 'Very Strong'
        ).length,
        Strong: signals.filter((s) => s.signal_strength === 'Strong').length,
        Moderate: signals.filter((s) => s.signal_strength === 'Moderate')
          .length,
        Weak: signals.filter((s) => s.signal_strength === 'Weak').length
      }
    }
  };
};

// Helper function to save signals to database
export const saveSignalsToDatabase = async (signals) => {
  const savedSignals = [];
  const errors = [];
  await TweezerBottomModel.sync();
  await PR.sync();

  for (const signal of signals) {
    try {
      // Check if already exists
      const existing = await TweezerBottomModel.findOne({
        where: {
          security: signal.security,
          trade_date: signal.trade_date
        }
      });

      if (!existing) {
        const saved = await TweezerBottomModel.create(signal);
        savedSignals.push(saved);
      } else {
        // Update existing signal
        await existing.update(signal);
        savedSignals.push(existing);
      }
    } catch (error) {
      errors.push({
        security: signal.security,
        date: signal.trade_date,
        error: error.message
      });
    }
  }

  return {
    success_count: savedSignals.length,
    error_count: errors.length,
    errors: errors,
    total_signals: signals.length
  };
};

const toDateString = (value) => normalizeTradeDate(value);

const getModelAttributes = (model) =>
  Object.keys(model?.rawAttributes || {});

const resolveCompanyFields = (model, preferredFields = ['symbol', 'security']) => {
  const attrs = new Set(getModelAttributes(model));
  const preferred = (preferredFields || []).filter(
    (field) => field === 'symbol' || field === 'security'
  );
  const fields = preferred.filter((field) => attrs.has(field));

  if (fields.length) return fields;
  if (attrs.has('security')) return ['security'];
  if (attrs.has('symbol')) return ['symbol'];
  return [];
};

const resolveSearchFields = (model, preferredFields = ['symbol', 'security']) => {
  const attrs = new Set(getModelAttributes(model));
  const fields = (preferredFields || ['symbol', 'security']).filter((field) =>
    attrs.has(field)
  );

  return fields.length ? fields : resolveCompanyFields(model, preferredFields);
};

const applyCompanyValueFilter = (where, model, value, preferredFields) => {
  if (!value) return;

  const companyFields = resolveCompanyFields(model, preferredFields);
  if (!companyFields.length) return;

  const cleaned = stripExchangeSuffix(value);
  const variants = Array.from(
    new Set([cleaned, `${cleaned}.NS`, `${cleaned}.BO`, String(value).trim()].filter(Boolean))
  );

  const fieldClauses = companyFields.flatMap((field) =>
    variants.map((variant) => ({ [field]: variant }))
  );

  const clause =
    fieldClauses.length === 1 ? fieldClauses[0] : { [Op.or]: fieldClauses };

  where[Op.and] = [...(where[Op.and] || []), clause];
};

const EQUITY_ONLY_FORMULAS = new Set([
  'strong-bullish-candle',
  'bearish-candle',
]);

const withEquityFilter = (where = {}, formulaType) => {
  if (!EQUITY_ONLY_FORMULAS.has(formulaType)) return where;
  return {
    ...where,
    [Op.and]: [...(where[Op.and] || []), equitySecurityLiteral()],
  };
};

const buildFormulaQuery = async ({
  model,
  dateField,
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  searchFields = ['symbol', 'security'],
  extraWhere = {},
  order = null,
  latestDateWhere = {},
  includeLatestDate = true,
  changePercentMin = null,
  changePercentMax = null,
  changeSort = null,
}) => {
  let selectedDate = targetDate ? toDateString(targetDate) : null;

  if (!selectedDate && includeLatestDate) {
    const latestDateRaw = await model.max(dateField, { where: latestDateWhere });
    selectedDate = toDateString(latestDateRaw);
  }

  if (includeLatestDate && !selectedDate) {
    return {
      success: true,
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage,
      itemsPerPage,
      trade_date: null,
      latest_date: null
    };
  }

  const where = { ...extraWhere };
  applyChangePercentFilter(
    where,
    normalizeChangePercentRange(changePercentMin, changePercentMax)
  );

  if (includeLatestDate) {
    where[dateField] = selectedDate;
  }

  if (symbol) {
    applyCompanyValueFilter(where, model, symbol, searchFields);
  }

  if (searchTerm) {
    const activeSearchFields = resolveSearchFields(model, searchFields);

    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: activeSearchFields.map((field) => ({
          [field]: { [Op.like]: `%${searchTerm}%` }
        }))
      }
    ];
  }

  const sortDir =
    String(changeSort || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const finalOrder = order || (model.rawAttributes?.change_percent
    ? [['change_percent', sortDir], ['id', 'DESC']]
    : [
        [dateField, 'DESC'],
        ['id', 'DESC']
      ]);
  const offset = (currentPage - 1) * itemsPerPage;

  const { count, rows } = await model.findAndCountAll({
    where,
    limit: itemsPerPage,
    offset,
    order: finalOrder,
    raw: true
  });

  const needsSymbolBackfill = rows.some(
    (row) =>
      Object.prototype.hasOwnProperty.call(row, 'symbol') &&
      !stripExchangeSuffix(row.symbol) &&
      row.security
  );
  const { nameToSymbol } =
    needsSymbolBackfill ? await loadListedCompanyMaps() : { nameToSymbol: null };

  const data = [];
  const symbolPatches = [];

  for (let index = 0; index < rows.length; index += 1) {
    const raw = rows[index];
    const cleaned = withCleanSymbol(raw, nameToSymbol);
    if (
      raw.id &&
      cleaned.symbol &&
      !stripExchangeSuffix(raw.symbol) &&
      model?.rawAttributes?.symbol
    ) {
      symbolPatches.push({ id: raw.id, symbol: cleaned.symbol });
    }
    data.push({
      ...cleaned,
      id: offset + index + 1,
    });
  }

  if (symbolPatches.length) {
    await Promise.all(
      symbolPatches.slice(0, 200).map((patch) =>
        model.update({ symbol: patch.symbol }, { where: { id: patch.id } }).catch(() => null)
      )
    );
  }

  return {
    success: true,
    data,
    totalItems: count,
    totalPages: Math.ceil(count / itemsPerPage) || 0,
    currentPage,
    itemsPerPage,
    trade_date: selectedDate,
    latest_date: selectedDate
  };
};

const FORMULA_REGISTRY = {
  'buy-day': {
    model: BuyDayModel,
    dateField: 'buy_date',
    searchFields: ['symbol']
  },
  'follow-through-day': {
    model: FollowThroughDayModel,
    dateField: 'ftd_date',
    searchFields: ['symbol']
  },
  'rally-attempt-day': {
    model: RallyAttemptDayModel,
    dateField: 'rally_date',
    searchFields: ['symbol', 'security']
  },
  'strong-bullish-candle': {
    model: StrongBullishCandleModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 2) => ({ base_percent: basePercent }),
    latestDateWhere: (basePercent = 2) => ({ base_percent: basePercent })
  },
  'bearish-candle': {
    model: BearishCandleModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 2) => ({ base_percent: basePercent }),
    latestDateWhere: (basePercent = 2) => ({ base_percent: basePercent })
  },
  'gap-up-day': {
    model: GapUpDayModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 1) => ({ gap_threshold: basePercent }),
    latestDateWhere: (basePercent = 1) => ({ gap_threshold: basePercent })
  },
  'gap-down-day': {
    model: GapDownDayModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 1) => ({ gap_threshold: basePercent }),
    latestDateWhere: (basePercent = 1) => ({ gap_threshold: basePercent })
  },
  'fifty-two-week-high': {
    model: FiftyTwoWeekHighModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol']
  },
  'top-gainer-day': {
    model: TopGainerDayModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 3) => ({ min_percent: basePercent }),
    latestDateWhere: (basePercent = 3) => ({ min_percent: basePercent })
  },
  'band-hit-52w': {
    model: BandHit52wModel,
    dateField: 'trade_date',
    searchFields: ['symbol', 'security', 'band_type']
  },
  'top-loser-day': {
    model: TopLoserDayModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 3) => ({ min_percent: basePercent }),
    latestDateWhere: (basePercent = 3) => ({ min_percent: basePercent })
  },
  'fifty-two-week-low': {
    model: FiftyTwoWeekLowModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol']
  },
  'daily-mover-up': {
    model: DailyMoverUpModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 3) => ({ min_percent: basePercent }),
    latestDateWhere: (basePercent = 3) => ({ min_percent: basePercent })
  },
  'daily-mover-down': {
    model: DailyMoverDownModel,
    dateField: 'trade_date',
    searchFields: ['security', 'symbol'],
    extraWhere: (basePercent = 3) => ({ min_percent: basePercent }),
    latestDateWhere: (basePercent = 3) => ({ min_percent: basePercent })
  },
  'volume-breakouts': {
    model: VolumeBreakoutModel,
    dateField: 'trade_date',
    searchFields: ['symbol', 'security']
  },
  'tweezer-bottoms': {
    model: TweezerBottomModel,
    dateField: 'trade_date',
    searchFields: ['security', 'pattern_name'],
    order: [
      ['trade_date', 'DESC'],
      ['signal_strength', 'DESC'],
      ['id', 'DESC']
    ]
  }
};

const attachGenerateOnRead = (slug, generate, getParams = () => ({})) => {
  if (FORMULA_REGISTRY[slug]) {
    FORMULA_REGISTRY[slug].generateOnRead = {
      generate,
      getExistingWhere: getParams,
      getGeneratePayload: getParams
    };
  }
};

attachGenerateOnRead(
  'strong-bullish-candle',
  generateStrongBullishService,
  (basePercent) => ({ base_percent: basePercent })
);
attachGenerateOnRead(
  'bearish-candle',
  generateBearishCandleService,
  (basePercent) => ({ base_percent: basePercent })
);
attachGenerateOnRead(
  'gap-up-day',
  generateGapUpService,
  (basePercent) => ({ gap_threshold: basePercent })
);
attachGenerateOnRead(
  'gap-down-day',
  generateGapDownService,
  (basePercent) => ({ gap_threshold: basePercent })
);
attachGenerateOnRead('fifty-two-week-high', generateFiftyTwoWeekHighService);
attachGenerateOnRead(
  'top-gainer-day',
  generateTopGainerService,
  (basePercent) => ({ min_percent: basePercent })
);
attachGenerateOnRead('band-hit-52w', generateBandHit52wService);
attachGenerateOnRead(
  'top-loser-day',
  generateTopLoserService,
  (basePercent) => ({ min_percent: basePercent })
);
attachGenerateOnRead('fifty-two-week-low', generateFiftyTwoWeekLowService);
attachGenerateOnRead(
  'daily-mover-up',
  generateDailyMoverUpService,
  (basePercent) => ({ min_percent: basePercent })
);
attachGenerateOnRead(
  'daily-mover-down',
  generateDailyMoverDownService,
  (basePercent) => ({ min_percent: basePercent })
);

const getFormulaConfig = (formulaType) => {
  const config = FORMULA_REGISTRY[formulaType];
  if (!config) {
    throw new Error(`Invalid formula type: ${formulaType}`);
  }
  return config;
};

export const getFormulaAvailableDatesService = async (
  formulaType,
  { basePercent = 2 } = {}
) => {
  const config = getFormulaConfig(formulaType);
  await config.model.sync();

  const extraWhere =
    typeof config.latestDateWhere === 'function'
      ? config.latestDateWhere(basePercent)
      : config.latestDateWhere || {};

  const rows = await config.model.findAll({
    attributes: [config.dateField],
    where: extraWhere,
    group: [config.dateField],
    order: [[config.dateField, 'DESC']],
    raw: true,
    limit: 90
  });

  const dates = rows
    .map((row) => toDateString(row[config.dateField]))
    .filter(Boolean);

  return {
    success: true,
    formula_type: formulaType,
    dates,
    latest_date: dates[0] || null
  };
};

export const getRallyAttemptRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await RallyAttemptDayModel.sync();

  return buildFormulaQuery({
    model: RallyAttemptDayModel,
    dateField: 'rally_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['symbol', 'security']
  });
};

export const getFollowThroughDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await FollowThroughDayModel.sync();

  return buildFormulaQuery({
    model: FollowThroughDayModel,
    dateField: 'ftd_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['symbol']
  });
};

export const getBuyDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await BuyDayModel.sync();

  return buildFormulaQuery({
    model: BuyDayModel,
    dateField: 'buy_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['symbol']
  });
};

export const getStrongBullishRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 2,
  changePercentMin = null,
  changePercentMax = null,
  changeSort = 'desc',
}) => {
  await StrongBullishCandleModel.sync();

  const percentFilter = withEquityFilter(
    { base_percent: basePercent },
    'strong-bullish-candle'
  );

  return buildFormulaQuery({
    model: StrongBullishCandleModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: percentFilter,
    latestDateWhere: { base_percent: basePercent },
    changePercentMin,
    changePercentMax,
    changeSort,
  });
};

export const getVolumeBreakoutRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await VolumeBreakoutModel.sync();

  return buildFormulaQuery({
    model: VolumeBreakoutModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['symbol', 'security']
  });
};

export const getTweezerBottomRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await TweezerBottomModel.sync();

  return buildFormulaQuery({
    model: TweezerBottomModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'pattern_name'],
    order: [
      ['trade_date', 'DESC'],
      ['signal_strength', 'DESC'],
      ['id', 'DESC']
    ]
  });
};

export const getBearishCandleRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 2
}) => {
  await BearishCandleModel.sync();
  const percentFilter = { base_percent: basePercent };

  return buildFormulaQuery({
    model: BearishCandleModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: percentFilter,
    latestDateWhere: percentFilter
  });
};

export const getGapUpDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 1
}) => {
  await GapUpDayModel.sync();
  const thresholdFilter = { gap_threshold: basePercent };

  return buildFormulaQuery({
    model: GapUpDayModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: thresholdFilter,
    latestDateWhere: thresholdFilter
  });
};

export const getGapDownDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 1
}) => {
  await GapDownDayModel.sync();
  const thresholdFilter = { gap_threshold: basePercent };

  return buildFormulaQuery({
    model: GapDownDayModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: thresholdFilter,
    latestDateWhere: thresholdFilter
  });
};

export const getFiftyTwoWeekHighRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await FiftyTwoWeekHighModel.sync();

  return buildFormulaQuery({
    model: FiftyTwoWeekHighModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol']
  });
};

export const getTopGainerDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 3
}) => {
  await TopGainerDayModel.sync();
  const percentFilter = { min_percent: basePercent };

  return buildFormulaQuery({
    model: TopGainerDayModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: percentFilter,
    latestDateWhere: percentFilter
  });
};

export const getBandHit52wRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await BandHit52wModel.sync();

  return buildFormulaQuery({
    model: BandHit52wModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['symbol', 'security', 'band_type']
  });
};

export const getTopLoserDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 3
}) => {
  await TopLoserDayModel.sync();
  const percentFilter = { min_percent: basePercent };

  return buildFormulaQuery({
    model: TopLoserDayModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: percentFilter,
    latestDateWhere: percentFilter
  });
};

export const getFiftyTwoWeekLowRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null
}) => {
  await FiftyTwoWeekLowModel.sync();

  return buildFormulaQuery({
    model: FiftyTwoWeekLowModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol']
  });
};

export const getDailyMoverUpRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 3
}) => {
  await DailyMoverUpModel.sync();
  const percentFilter = { min_percent: basePercent };

  return buildFormulaQuery({
    model: DailyMoverUpModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: percentFilter,
    latestDateWhere: percentFilter
  });
};

export const getDailyMoverDownRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  symbol = '',
  targetDate = null,
  basePercent = 3
}) => {
  await DailyMoverDownModel.sync();
  const percentFilter = { min_percent: basePercent };

  return buildFormulaQuery({
    model: DailyMoverDownModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: ['security', 'symbol'],
    extraWhere: percentFilter,
    latestDateWhere: percentFilter
  });
};

export const getFormulaCompaniesService = async (
  formulaType,
  { targetDate = null, searchTerm = '', basePercent = 2, limit = 300 } = {}
) => {
  const config = getFormulaConfig(formulaType);
  await config.model.sync();

  const extraWhere = withEquityFilter(
    typeof config.extraWhere === 'function'
      ? config.extraWhere(basePercent)
      : config.extraWhere || {},
    formulaType
  );

  let selectedDate = targetDate ? toDateString(targetDate) : null;

  if (!selectedDate) {
    const latestDateRaw = await config.model.max(config.dateField, {
      where: extraWhere
    });
    selectedDate = toDateString(latestDateRaw);
  }

  if (!selectedDate) {
    return {
      success: true,
      formula_type: formulaType,
      trade_date: null,
      companies: []
    };
  }

  const where = {
    ...extraWhere,
    [config.dateField]: selectedDate
  };

  if (searchTerm) {
    const searchFields = resolveSearchFields(config.model, config.searchFields);

    where[Op.or] = searchFields.map((field) => ({
      [field]: { [Op.like]: `%${searchTerm}%` }
    }));
  }

  const attributes = resolveCompanyFields(config.model, config.searchFields);
  if (!attributes.length) {
    return {
      success: true,
      formula_type: formulaType,
      trade_date: selectedDate,
      companies: []
    };
  }

  const rows = await config.model.findAll({
    attributes,
    where,
    group: attributes,
    order: [[attributes[0], 'ASC']],
    raw: true,
    limit
  });

  let companies = rows
    .filter((row) => attributes.some((field) => row[field]))
    .map((row) => {
      const symbol = stripExchangeSuffix(row.symbol || row.security);
      const security = row.security || row.symbol;
      return {
        symbol,
        security,
        label:
          symbol && security && symbol !== security
            ? `${symbol} — ${security}`
            : symbol || security,
      };
    });

  if (EQUITY_ONLY_FORMULAS.has(formulaType)) {
    const { listedSymbols, nameToSymbol } = await loadListedCompanyMaps();
    companies = companies.filter((company) => {
      const symbol = stripExchangeSuffix(company.symbol);
      const security = String(company.security || '').trim().toLowerCase();
      return (
        listedSymbols.has(symbol) ||
        listedSymbols.has(symbol.toUpperCase()) ||
        nameToSymbol.has(security)
      );
    });
  }

  return {
    success: true,
    formula_type: formulaType,
    trade_date: selectedDate,
    companies
  };
};

export const getFormulaRecordsService = async (
  formulaType,
  {
    currentPage = 1,
    itemsPerPage = 10,
    searchTerm = '',
    symbol = '',
    targetDate = null,
    basePercent = 2,
    changePercentMin = null,
    changePercentMax = null,
    changeSort = null,
  } = {}
) => {
  const config = getFormulaConfig(formulaType);
  await config.model.sync();

  const extraWhere = withEquityFilter(
    typeof config.extraWhere === 'function'
      ? config.extraWhere(basePercent)
      : config.extraWhere || {},
    formulaType
  );

  const latestDateWhere =
    typeof config.latestDateWhere === 'function'
      ? config.latestDateWhere(basePercent)
      : config.latestDateWhere ?? extraWhere;

  return buildFormulaQuery({
    model: config.model,
    dateField: config.dateField,
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate,
    searchFields: config.searchFields || ['symbol', 'security'],
    extraWhere,
    latestDateWhere,
    order: config.order || null,
    changePercentMin,
    changePercentMax,
    changeSort,
  });
};

export const queryFormulaService = async (
  formulaType,
  {
    currentPage = 1,
    itemsPerPage = 10,
    searchTerm = '',
    symbol = '',
    targetDate = null,
    basePercent = 2,
    changePercentMin = null,
    changePercentMax = null,
    changeSort = null,
  } = {}
) => {
  const config = getFormulaConfig(formulaType);
  let ensureMeta = null;

  if (config.generateOnRead) {
    const params =
      config.generateOnRead.getGeneratePayload?.(basePercent) ??
      config.generateOnRead.getExistingWhere?.(basePercent) ??
      {};

    ensureMeta = await processFormulaByDate({
      targetDate,
      formulaModel: config.model,
      formulaDateField: config.dateField,
      existingWhere: config.generateOnRead.getExistingWhere?.(basePercent) ?? {},
      generatePayload: params,
      generateFunction: config.generateOnRead.generate
    });

    if (!ensureMeta.success) {
      return ensureMeta;
    }
  }

  const result = await getFormulaRecordsService(formulaType, {
    currentPage,
    itemsPerPage,
    searchTerm,
    symbol,
    targetDate: ensureMeta?.trade_date || targetDate,
    basePercent,
    changePercentMin,
    changePercentMax,
    changeSort,
  });

  return {
    ...result,
    formula_type: formulaType,
    source: ensureMeta?.source,
    calculated: ensureMeta?.calculated,
    requested_date: ensureMeta?.requested_date || targetDate
  };
};

export const getFormulaMetaService = async (
  formulaType,
  {
    resource = 'dates',
    targetDate = null,
    searchTerm = '',
    basePercent = 2,
    limit = 300
  } = {}
) => {
  if (resource === 'companies') {
    return getFormulaCompaniesService(formulaType, {
      targetDate,
      searchTerm,
      basePercent,
      limit
    });
  }

  return getFormulaAvailableDatesService(formulaType, { basePercent });
};
