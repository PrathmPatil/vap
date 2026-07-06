import { Op } from 'sequelize';
import {
  PR,
  GL,
  BH,
  ListedCompanies,
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

const parseNum = (value) => {
  const num = Number(String(value ?? '').trim());
  return Number.isFinite(num) ? num : null;
};

const getTradeDate = async (targetDate) => {
  const { resolveTradeDate } = await import('./formulaService.js');
  return resolveTradeDate(targetDate);
};

async function getListedCompanyMap() {
  const rows = await ListedCompanies.findAll({
    attributes: ['name', 'symbol'],
    where: { series: 'EQ' },
    raw: true
  });

  return new Map(rows.map((row) => [row.name.trim(), row.symbol]));
}

async function loadPrRows(tradeDate, securities) {
  return PR.findAll({
    attributes: [
      'SECURITY',
      'PREV_CL_PR',
      'OPEN_PRICE',
      'HIGH_PRICE',
      'LOW_PRICE',
      'CLOSE_PRICE',
      'HI_52_WK',
      'LO_52_WK',
      'NET_TRDQTY',
      'source_date'
    ],
    where: {
      SECURITY: { [Op.in]: securities },
      source_date: {
        [Op.gte]: `${tradeDate} 00:00:00`,
        [Op.lte]: `${tradeDate} 23:59:59`
      },
      status: { [Op.ne]: 'MISSING' }
    },
    raw: true
  });
}

export const generateBearishCandleService = async ({
  targetDate = null,
  base_percent = 2
}) => {
  await BearishCandleModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await BearishCandleModel.count({
    where: { trade_date: tradeDate, base_percent }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const open = parseNum(stock.OPEN_PRICE);
    const close = parseNum(stock.CLOSE_PRICE);
    if (!open || !close) continue;

    const changePercent = ((close - open) / open) * 100;
    if (changePercent <= -base_percent) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        open_price: open,
        close_price: close,
        change_percent: changePercent,
        trade_date: tradeDate,
        base_percent
      });
    }
  }

  if (rows.length) await BearishCandleModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateGapUpService = async ({
  targetDate = null,
  gap_threshold = 1
}) => {
  await GapUpDayModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await GapUpDayModel.count({
    where: { trade_date: tradeDate, gap_threshold }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const prevClose = parseNum(stock.PREV_CL_PR);
    const open = parseNum(stock.OPEN_PRICE);
    if (!prevClose || !open) continue;

    const gapPercent = ((open - prevClose) / prevClose) * 100;
    if (gapPercent >= gap_threshold) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        prev_close: prevClose,
        open_price: open,
        gap_percent: gapPercent,
        trade_date: tradeDate,
        gap_threshold
      });
    }
  }

  if (rows.length) await GapUpDayModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateGapDownService = async ({
  targetDate = null,
  gap_threshold = 1
}) => {
  await GapDownDayModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await GapDownDayModel.count({
    where: { trade_date: tradeDate, gap_threshold }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const prevClose = parseNum(stock.PREV_CL_PR);
    const open = parseNum(stock.OPEN_PRICE);
    if (!prevClose || !open) continue;

    const gapPercent = ((open - prevClose) / prevClose) * 100;
    if (gapPercent <= -gap_threshold) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        prev_close: prevClose,
        open_price: open,
        gap_percent: gapPercent,
        trade_date: tradeDate,
        gap_threshold
      });
    }
  }

  if (rows.length) await GapDownDayModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateFiftyTwoWeekHighService = async ({ targetDate = null }) => {
  await FiftyTwoWeekHighModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await FiftyTwoWeekHighModel.count({
    where: { trade_date: tradeDate }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const close = parseNum(stock.CLOSE_PRICE);
    const hi52 = parseNum(stock.HI_52_WK);
    if (!close || !hi52 || hi52 <= 0) continue;

    if (close >= hi52 * 0.995) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        close_price: close,
        hi_52_wk: hi52,
        distance_from_high_pct: ((hi52 - close) / hi52) * 100,
        trade_date: tradeDate
      });
    }
  }

  if (rows.length) await FiftyTwoWeekHighModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateTopGainerService = async ({
  targetDate = null,
  min_percent = 3
}) => {
  await TopGainerDayModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await TopGainerDayModel.count({
    where: { trade_date: tradeDate, min_percent }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const glRows = await GL.findAll({
    where: {
      source_date: {
        [Op.gte]: `${tradeDate} 00:00:00`,
        [Op.lte]: `${tradeDate} 23:59:59`
      },
      GAIN_LOSS: 'G',
      status: { [Op.ne]: 'MISSING' }
    },
    raw: true
  });

  const rows = [];
  for (const row of glRows) {
    const changePercent = parseNum(row.PERCENT_CG);
    if (changePercent === null || changePercent < min_percent) continue;

    const security = String(row.SECURITY || '').trim();
    rows.push({
      security,
      symbol: companyMap.get(security) || security,
      close_price: parseNum(row.CLOSE_PRIC),
      prev_close: parseNum(row.PREV_CL_PR),
      change_percent: changePercent,
      trade_date: tradeDate,
      min_percent
    });
  }

  if (rows.length) await TopGainerDayModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateBandHit52wService = async ({ targetDate = null }) => {
  await BandHit52wModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await BandHit52wModel.count({ where: { trade_date: tradeDate } });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const bhRows = await BH.findAll({
    where: {
      source_date: {
        [Op.gte]: `${tradeDate} 00:00:00`,
        [Op.lte]: `${tradeDate} 23:59:59`
      },
      status: { [Op.ne]: 'MISSING' }
    },
    raw: true
  });

  const rows = bhRows
    .map((row) => {
      const bandType = String(row.high_low || row.HIGH_LOW || '').trim().toUpperCase();
      if (!['H', 'L'].includes(bandType)) return null;

      return {
        symbol: String(row.SYMBOL || '').trim(),
        security: String(row.SECURITY || row.SYMBOL || '').trim(),
        band_type: bandType === 'H' ? 'HIGH' : 'LOW',
        trade_date: tradeDate
      };
    })
    .filter(Boolean);

  if (rows.length) await BandHit52wModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateTopLoserService = async ({
  targetDate = null,
  min_percent = 3
}) => {
  await TopLoserDayModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await TopLoserDayModel.count({
    where: { trade_date: tradeDate, min_percent }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const glRows = await GL.findAll({
    where: {
      source_date: {
        [Op.gte]: `${tradeDate} 00:00:00`,
        [Op.lte]: `${tradeDate} 23:59:59`
      },
      GAIN_LOSS: 'L',
      status: { [Op.ne]: 'MISSING' }
    },
    raw: true
  });

  const rows = [];
  for (const row of glRows) {
    const changePercent = parseNum(row.PERCENT_CG);
    if (changePercent === null || changePercent > -min_percent) continue;

    const security = String(row.SECURITY || '').trim();
    rows.push({
      security,
      symbol: companyMap.get(security) || security,
      close_price: parseNum(row.CLOSE_PRIC),
      prev_close: parseNum(row.PREV_CL_PR),
      change_percent: changePercent,
      trade_date: tradeDate,
      min_percent
    });
  }

  if (rows.length) await TopLoserDayModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateFiftyTwoWeekLowService = async ({ targetDate = null }) => {
  await FiftyTwoWeekLowModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await FiftyTwoWeekLowModel.count({
    where: { trade_date: tradeDate }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const close = parseNum(stock.CLOSE_PRICE);
    const lo52 = parseNum(stock.LO_52_WK);
    if (!close || !lo52 || lo52 <= 0) continue;

    if (close <= lo52 * 1.005) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        close_price: close,
        lo_52_wk: lo52,
        distance_from_low_pct: ((close - lo52) / lo52) * 100,
        trade_date: tradeDate
      });
    }
  }

  if (rows.length) await FiftyTwoWeekLowModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateDailyMoverUpService = async ({
  targetDate = null,
  min_percent = 3
}) => {
  await DailyMoverUpModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await DailyMoverUpModel.count({
    where: { trade_date: tradeDate, min_percent }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const prevClose = parseNum(stock.PREV_CL_PR);
    const close = parseNum(stock.CLOSE_PRICE);
    if (!prevClose || !close) continue;

    const changePercent = ((close - prevClose) / prevClose) * 100;
    if (changePercent >= min_percent) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        close_price: close,
        prev_close: prevClose,
        change_percent: changePercent,
        trade_date: tradeDate,
        min_percent
      });
    }
  }

  if (rows.length) await DailyMoverUpModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};

export const generateDailyMoverDownService = async ({
  targetDate = null,
  min_percent = 3
}) => {
  await DailyMoverDownModel.sync();
  const tradeDate = await getTradeDate(null, targetDate);
  if (!tradeDate) return { success: false, message: 'No PR data found' };

  const existing = await DailyMoverDownModel.count({
    where: { trade_date: tradeDate, min_percent }
  });
  if (existing > 0) {
    return { success: true, message: 'Already generated', totalItems: existing };
  }

  const companyMap = await getListedCompanyMap();
  const stocks = await loadPrRows(tradeDate, [...companyMap.keys()]);
  const rows = [];

  for (const stock of stocks) {
    const prevClose = parseNum(stock.PREV_CL_PR);
    const close = parseNum(stock.CLOSE_PRICE);
    if (!prevClose || !close) continue;

    const changePercent = ((close - prevClose) / prevClose) * 100;
    if (changePercent <= -min_percent) {
      rows.push({
        security: stock.SECURITY,
        symbol: companyMap.get(stock.SECURITY.trim()) || stock.SECURITY,
        close_price: close,
        prev_close: prevClose,
        change_percent: changePercent,
        trade_date: tradeDate,
        min_percent
      });
    }
  }

  if (rows.length) await DailyMoverDownModel.bulkCreate(rows);
  return { success: true, totalItems: rows.length };
};
