import {
  PR,
  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
  StrongBullishCandleModel,
  ListedCompanies,
  VolumeBreakoutModel,
  TweezerBottomModel
} from '../models/index.js';

import logger from '../config/logger.js';
import { performance } from 'node:perf_hooks';
import { fn, col, where, Op } from 'sequelize';

/* =========================================================
   RALLY ATTEMPT DETECTION
========================================================= */

export const generateRallyAttemptService = async ({ currentPage, itemsPerPage, searchTerm }) => {
  try {

    await RallyAttemptDayModel.sync();
    await PR.sync();

    /* --------------------------------
       GET LATEST DATE
    -------------------------------- */

    const latestDateRaw = await PR.max('source_date');

    const latestDate = latestDateRaw
      ? latestDateRaw.toISOString().split('T')[0]
      : null;

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
      return { success: true, message: 'Already generated' };
    }

    /* --------------------------------
       GET LISTED COMPANIES
    -------------------------------- */

    const listedCompanies = await ListedCompanies.findAll({
      attributes: ['name', 'symbol'],
      where: { series: 'EQ' },
      raw: true
    });

    const companyMap = new Map(
      listedCompanies.map((c) => [c.name.trim(), c.symbol])
    );

    const companyNames = [...companyMap.keys()];

    /* --------------------------------
       GET LAST 2 DAYS DATA
    -------------------------------- */

    const stockData = await PR.findAll({
      attributes: ['SECURITY', 'CLOSE_PRICE', 'source_date'],
      where: {
        SECURITY: { [Op.in]: companyNames }
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
          symbol: companyMap.get(security) || security,
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
  searchTerm = ''
}) => {
  try {

    await FollowThroughDayModel.sync();
    await RallyAttemptDayModel.sync();
    await PR.sync();

    /* --------------------------------
       GET RALLY ATTEMPT STOCKS
    -------------------------------- */

    const rallyStocks = await RallyAttemptDayModel.findAll({
      attributes: ["symbol", "rally_date"],
      raw: true
    });

    if (!rallyStocks.length) {
      return {
        success: false,
        data: [],
        message: "No rally attempt stocks found"
      };
    }


    const insertedFTD = [];

    /* --------------------------------
       LOOP RALLY STOCKS
    -------------------------------- */

    for (const rally of rallyStocks) {

      const symbol = rally.symbol;
      const rallyDate = rally.rally_date;

      /* --------------------------------
         GET STOCK DATA AFTER RALLY DATE
      -------------------------------- */

      const stockData = await PR.findAll({
        where: {
          SECURITY: symbol,
          source_date: {
            [Op.gte]: rallyDate
          }
        },
        order: [["source_date", "ASC"]],
        raw: true
      });

      if (stockData.length < 7) continue;

      /* --------------------------------
         FIND RALLY INDEX
      -------------------------------- */

      const rallyIndex = stockData.findIndex(
        (row) => row.source_date === rallyDate
      );

      if (rallyIndex === -1) continue;

      /* --------------------------------
         CHECK DAY 4 → DAY 7
      -------------------------------- */

      for (let i = rallyIndex + 3; i <= rallyIndex + 6; i++) {

        if (!stockData[i]) continue;

        const today = Number(stockData[i].CLOSE_PRICE);
        const prev = Number(stockData[i - 1].CLOSE_PRICE);

        const percent = ((today - prev) / prev) * 100;

        const volumeToday = Number(stockData[i].NET_TRDQTY);
        const volumePrev = Number(stockData[i - 1].NET_TRDQTY);

        if (percent >= 1.5 && volumeToday > volumePrev) {

          const exists = await FollowThroughDayModel.count({
            where: {
              symbol,
              rally_date: rallyDate
            }
          });

          if (!exists) {

            const record = {
              symbol,
              rally_date: rallyDate,
              ftd_date: stockData[i].source_date,
              change_percent: percent,
              volume: volumeToday,
              status: "ftd_detected"
            };

            await FollowThroughDayModel.create(record);

            insertedFTD.push(record);
          }

          break;
        }
      }
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
      order: [["ftd_date", "DESC"]],
      raw: true
    });

    const offset = (currentPage - 1) * itemsPerPage;

    const formattedRows = rows.map((row, index) => ({
      id: offset + index + 1,
      symbol: row.symbol,
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

    console.error("❌ Follow Through Engine Error:", error);

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
  searchTerm = ""
}) => {

  try {

    console.log("🚀 Buy Day Engine Started");

    await BuyDayModel.sync();
    await PR.sync();

    /* --------------------------------
       GET FOLLOW THROUGH DAY STOCKS
    -------------------------------- */

    const ftdStocks = await FollowThroughDayModel.findAll({
      attributes: ["symbol", "rally_date", "ftd_date"],
      raw: true
    });

    if (!ftdStocks.length) {
      return {
        success: false,
        data: [],
        message: "No Follow Through Day stocks found"
      };
    }

    console.log("📊 FTD Stocks:", ftdStocks.length);

    const insertedBuyDays = [];

    /* --------------------------------
       LOOP THROUGH FTD STOCKS
    -------------------------------- */

    for (const ftd of ftdStocks) {

      const symbol = ftd.symbol;
      const rallyDate = ftd.rally_date;
      const ftdDate = ftd.ftd_date;

      /* --------------------------------
         FETCH STOCK DATA
      -------------------------------- */

      const stockData = await PR.findAll({
        where: {
          SECURITY: symbol
        },
        order: [["source_date", "ASC"]],
        raw: true
      });

      if (!stockData.length) continue;

      /* --------------------------------
         FIND FTD INDEX
      -------------------------------- */

      const ftdIndex = stockData.findIndex(
        row => row.source_date === ftdDate
      );

      if (ftdIndex === -1) continue;

      const ftdHigh = Number(stockData[ftdIndex].HIGH_PRICE);

      /* --------------------------------
         CHECK NEXT 10 DAYS
      -------------------------------- */

      for (let i = ftdIndex + 1; i <= ftdIndex + 10; i++) {

        if (!stockData[i]) continue;

        const price = Number(stockData[i].CLOSE_PRICE);
        const volume = Number(stockData[i].NET_TRDQTY);
        const prevVolume = Number(stockData[i - 1].NET_TRDQTY);

        if (price > ftdHigh && volume > prevVolume) {

          const exists = await BuyDayModel.count({
            where: {
              symbol,
              ftd_date: ftdDate
            }
          });

          if (!exists) {

            const record = {
              symbol,
              rally_date: rallyDate,
              ftd_date: ftdDate,
              buy_date: stockData[i].source_date,
              breakout_price: price,
              status: "ready_to_buy"
            };

            await BuyDayModel.create(record);

            insertedBuyDays.push(record);
          }

          break;
        }
      }

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
      order: [["buy_date", "DESC"]],
      raw: true
    });

    const offset = (currentPage - 1) * itemsPerPage;

    const formattedRows = rows.map((row, index) => ({
      id: offset + index + 1,
      symbol: row.symbol,
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

    console.error("❌ Buy Day Engine Error:", error);

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

export const runFormulaEngineService = async () => {
  try {

    const startedAt = performance.now();

    logger.info('Formula engine refresh started');

    const processed = [];

    const rallyResult = await generateRallyAttemptService({
      currentPage: 1,
      itemsPerPage: 10000,
      searchTerm: ''
    });
    processed.push(rallyResult.count || rallyResult.totalItems || 0);

    const ftdResult = await generateFollowThroughDayService({
      currentPage: 1,
      itemsPerPage: 10000,
      searchTerm: ''
    });
    processed.push(ftdResult.totalItems || 0);

    const buyDayResult = await generateBuyDayService({
      currentPage: 1,
      itemsPerPage: 10000,
      searchTerm: ''
    });
    processed.push(buyDayResult.totalItems || 0);

    const bullishResult = await generateStrongBullishService({
      currentPage: 1,
      itemsPerPage: 10000,
      searchTerm: '',
      base_percent: 2
    });
    processed.push(bullishResult.totalItems || 0);

    const volumeResult = await generateVolumeBreakoutService({
      currentPage: 1,
      itemsPerPage: 10000,
      searchTerm: ''
    });
    processed.push(volumeResult.totalItems || 0);

    const tweezerResult = await detectTweezerBottomPatterns({
      saveToDb: true,
      forceRefresh: true
    });
    processed.push(tweezerResult.total_signals || 0);

    const durationMs = Math.round(performance.now() - startedAt);

    logger.info(
      `Formula engine refresh completed in ${durationMs} ms. Processed rows: ${processed.reduce((sum, count) => sum + count, 0)}`
    );


    return {
      success: true,
      processed_symbols: processed.reduce((sum, count) => sum + count, 0),
      duration_ms: durationMs
    };
  } catch (error) {
    logger.error(`❌ Formula Engine Error: ${error.message}`, {
      stack: error.stack
    });
    throw error;
  }
};

/* =========================================================
   STRONG BULLISH ENGINE
========================================================= */

export const generateStrongBullishService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  base_percent = 2
}) => {
  try {

    /* --------------------------------
       GET LATEST DATE
    -------------------------------- */

    await StrongBullishCandleModel.sync();
    await PR.sync();

    const latestDateRaw = await PR.max('source_date');

    const latestDate = latestDateRaw
      ? latestDateRaw.toISOString().split('T')[0]
      : null;

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

      /* -------- GET LISTED COMPANIES -------- */

      const listedCompanies = await ListedCompanies.findAll({
        attributes: ['name', 'symbol'],
        where: { series: 'EQ' },
        raw: true
      });

      // Convert to map for O(1) lookup
      const companyMap = new Map(
        listedCompanies.map((c) => [c.name.trim(), c.symbol])
      );

      const companyNames = [...companyMap.keys()];

      /* -------- FETCH PR DATA -------- */

      const stocks = await PR.findAll({
        attributes: ['SECURITY', 'OPEN_PRICE', 'CLOSE_PRICE', 'source_date'],
        where: {
          SECURITY: { [Op.in]: companyNames },
          source_date: {
            [Op.gte]: `${latestDate} 00:00:00`,
            [Op.lte]: `${latestDate} 23:59:59`
          }
        },
        raw: true
      });

      const bullishStocks = [];

      for (const stock of stocks) {
        const open = Number(stock.OPEN_PRICE);
        const close = Number(stock.CLOSE_PRICE);

        if (!open || !close) continue;

        const percent = ((close - open) / open) * 100;
        if (percent >= base_percent) {
          bullishStocks.push({
            security: stock.SECURITY,
            symbol: companyMap.get(stock.SECURITY) || stock.SECURITY,
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

    const formattedRows = rows.map((row, index) => ({
      id: offset + index + 1, // sequential id
      security: row.security,
      symbol: row.symbol,
      open_price: row.open_price,
      close_price: row.close_price,
      change_percent: row.change_percent,
      trade_date: row.trade_date,
      // base_percent: row.base_percent
    }));

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
  searchTerm = ""
}) => {

  await VolumeBreakoutModel.sync();
  await PR.sync();

  const latestDateRaw = await PR.max("source_date");
  const latestDate = latestDateRaw.toISOString().split("T")[0];

  const stocks = await PR.findAll({
    where: {
      source_date: {
        [Op.lte]: latestDate
      }
    },
    order: [["source_date","DESC"]],
    raw: true
  });

  const breakoutStocks = [];

  for (const stock of stocks) {

    const history = await PR.findAll({
      where: { SECURITY: stock.SECURITY },
      order: [["source_date","DESC"]],
      limit: 11,
      raw: true
    });

    if (history.length < 11) continue;

    const today = history[0];

    const prev = history[1];

    const avgVolume =
      history.slice(1).reduce((sum,r)=> sum + Number(r.NET_TRDQTY),0) / 10;

    const todayVolume = Number(today.NET_TRDQTY);

    if (todayVolume >= avgVolume * 2 && today.CLOSE_PRICE > prev.CLOSE_PRICE) {

      breakoutStocks.push({
        security: today.SECURITY,
        trade_date: today.source_date,
        close_price: today.CLOSE_PRICE,
        volume: todayVolume,
        avg_volume_10d: avgVolume,
        volume_ratio: todayVolume / avgVolume
      });

    }

  }

  if (breakoutStocks.length)
    await VolumeBreakoutModel.bulkCreate(breakoutStocks);

  const { count, rows } = await VolumeBreakoutModel.findAndCountAll({
    limit: itemsPerPage,
    offset: (currentPage-1)*itemsPerPage,
    raw:true
  });

  const offset = (currentPage-1)*itemsPerPage;

  const data = rows.map((r,i)=>({
    id: offset+i+1,
    ...r
  }));

  return {
    success:true,
    data,
    totalItems:count
  };

};


/* =========================================================
  TWEEZER BOTTOM ENGINE
========================================================= */
export const detectTweezerBottomPatterns = async (options = {}) => {
  const {
    saveToDb = true,
    targetDate = null,
    forceRefresh = false
  } = options;

  await PR.sync();
  await TweezerBottomModel.sync();
  // Get the date to analyze
  let analysisDate;
  if (targetDate) {
    analysisDate = new Date(targetDate);
  } else {
    const latestDateRaw = await PR.max("source_date");
    analysisDate = latestDateRaw;
  }

  const analysisDateStr = analysisDate.toISOString().split("T")[0];

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

  // Fetch all stocks
  const stocks = await PR.findAll({
    where: {
      source_date: { [Op.lte]: analysisDate }
    },
    attributes: ['SECURITY'],
    group: ['SECURITY'],
    raw: true
  });

  const signals = [];
  const errors = [];

  // Process each stock
  for (const stock of stocks) {
    try {
      const history = await PR.findAll({
        where: { SECURITY: stock.SECURITY },
        order: [["source_date", "DESC"]],
        limit: 22,
        raw: true
      });

      if (history.length < 22) continue;

      const today = history[0];
      const prev = history[1];

      // Skip if not the target date
      const todayDateStr = new Date(today.source_date).toISOString().split("T")[0];
      if (todayDateStr !== analysisDateStr) continue;

      /* ---------------- Equal Low Detection ---------------- */
      const lowDiff = Math.abs(prev.LOW_PRICE - today.LOW_PRICE) / prev.LOW_PRICE * 100;
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
      const sma20 = history.slice(1, 21).reduce((s, r) => s + Number(r.CLOSE_PRICE), 0) / 20;
      const downtrend = prev.CLOSE_PRICE < sma20;

      /* ---------------- Volume Analysis ---------------- */
      const volMA = history.slice(1, 21).reduce((s, r) => s + Number(r.NET_TRDQTY), 0) / 20;
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
      const isTweezerBottom = equalLows && bearishPrev && bullishCurr && 
                              strongBearBody && strongBullBody && downtrend && 
                              prevVolCond && currVolCond;

      if (isTweezerBottom) {
        const signalData = {
          security: today.SECURITY,
          trade_date: today.source_date,
          close_price: today.CLOSE_PRICE,
          pattern_name: "Tweezer Bottom",
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
        security: stock.SECURITY,
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
    total_stocks_analyzed: stocks.length,
    total_signals: signals.length,
    signals: signals,
    errors: errors,
    saved_to_db: saveToDb && savedResult ? savedResult : null,
    summary: {
      by_strength: {
        'Very Strong': signals.filter(s => s.signal_strength === 'Very Strong').length,
        'Strong': signals.filter(s => s.signal_strength === 'Strong').length,
        'Moderate': signals.filter(s => s.signal_strength === 'Moderate').length,
        'Weak': signals.filter(s => s.signal_strength === 'Weak').length
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

const toDateString = (value) => {
  if (!value) return null;

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return null;

  return dateValue.toISOString().split('T')[0];
};

const buildFormulaQuery = async ({
  model,
  dateField,
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  searchFields = ['symbol', 'security'],
  extraWhere = {},
  order = null,
  latestDateWhere = {},
  includeLatestDate = true
}) => {
  const latestDateRaw = includeLatestDate
    ? await model.max(dateField, { where: latestDateWhere })
    : null;

  const latestDate = includeLatestDate ? toDateString(latestDateRaw) : null;

  if (includeLatestDate && !latestDate) {
    return {
      success: true,
      data: [],
      totalItems: 0,
      totalPages: 0,
      currentPage,
      itemsPerPage,
      latest_date: null
    };
  }

  const where = { ...extraWhere };

  if (includeLatestDate) {
    where[dateField] = latestDate;
  }

  if (searchTerm) {
    where[Op.or] = searchFields.map((field) => ({
      [field]: { [Op.like]: `%${searchTerm}%` }
    }));
  }

  const finalOrder = order || [[dateField, 'DESC'], ['id', 'DESC']];
  const offset = (currentPage - 1) * itemsPerPage;

  const { count, rows } = await model.findAndCountAll({
    where,
    limit: itemsPerPage,
    offset,
    order: finalOrder,
    raw: true
  });

  return {
    success: true,
    data: rows.map((row, index) => ({
      id: offset + index + 1,
      ...row
    })),
    totalItems: count,
    totalPages: Math.ceil(count / itemsPerPage),
    currentPage,
    itemsPerPage,
    latest_date: latestDate
  };
};

export const getRallyAttemptRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = ''
}) => {
  await RallyAttemptDayModel.sync();

  return buildFormulaQuery({
    model: RallyAttemptDayModel,
    dateField: 'rally_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    searchFields: ['symbol', 'security']
  });
};

export const getFollowThroughDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = ''
}) => {
  await FollowThroughDayModel.sync();

  return buildFormulaQuery({
    model: FollowThroughDayModel,
    dateField: 'ftd_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    searchFields: ['symbol']
  });
};

export const getBuyDayRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = ''
}) => {
  await BuyDayModel.sync();

  return buildFormulaQuery({
    model: BuyDayModel,
    dateField: 'buy_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    searchFields: ['symbol']
  });
};

export const getStrongBullishRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = '',
  basePercent = 2
}) => {
  await StrongBullishCandleModel.sync();

  return buildFormulaQuery({
    model: StrongBullishCandleModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    searchFields: ['security', 'symbol'],
    extraWhere: { base_percent: basePercent },
    latestDateWhere: { base_percent: basePercent }
  });
};

export const getVolumeBreakoutRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = ''
}) => {
  await VolumeBreakoutModel.sync();

  return buildFormulaQuery({
    model: VolumeBreakoutModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    searchFields: ['symbol', 'security']
  });
};

export const getTweezerBottomRecordsService = async ({
  currentPage = 1,
  itemsPerPage = 10,
  searchTerm = ''
}) => {
  await TweezerBottomModel.sync();

  return buildFormulaQuery({
    model: TweezerBottomModel,
    dateField: 'trade_date',
    currentPage,
    itemsPerPage,
    searchTerm,
    searchFields: ['security', 'pattern_name'],
    order: [['trade_date', 'DESC'], ['signal_strength', 'DESC'], ['id', 'DESC']]
  });
};