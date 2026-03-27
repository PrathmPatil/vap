import {
  PR,
  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
  StrongBullishCandleModel,
  ListedCompanies,
  VolumeBreakoutModel
} from '../models/index.js';

import { fn, col, where, Op } from 'sequelize';

/* =========================================================
   RALLY ATTEMPT DETECTION
========================================================= */

export const generateRallyAttemptService = async ({ currentPage, itemsPerPage, searchTerm }) => {
  try {

    await RallyAttemptDayModel.sync();

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

    await RallyAttemptDayModel.sync();
    await FollowThroughDayModel.sync();
    await BuyDayModel.sync();

    /* --------------------------------
       GET LISTED COMPANIES
    -------------------------------- */

    const listedCompanies = await ListedCompanies.findAll({
      attributes: ['name'],
      where: { series: 'EQ' },
      raw: true
    });

    const companyNames = listedCompanies.map((c) => c.name.trim());


    /* --------------------------------
       GET MATCHING PR SECURITIES
    -------------------------------- */

    const securities = await PR.findAll({
      attributes: ['SECURITY'],
      where: {
        SECURITY: {
          [Op.in]: companyNames
        }
      },
      group: ['SECURITY'],
      raw: true
    });


    const processed = [];

    /* --------------------------------
       PROCESS STOCKS
    -------------------------------- */

    for (const row of securities) {
      const symbol = row.SECURITY;

      const stockData = await PR.findAll({
        where: { SECURITY: symbol },
        order: [['source_date', 'ASC']],
        raw: true
      });

      if (stockData.length < 15) continue;

      /* -------- RALLY -------- */

      const rallyIndex = await detectRallyAttempt(symbol, stockData);

      if (rallyIndex === null) continue;

      /* -------- FTD -------- */

      const ftdIndex = await detectFollowThroughDay(
        symbol,
        stockData,
        rallyIndex
      );

      if (ftdIndex === null) continue;

      /* -------- BUY DAY -------- */

      await detectBuyDay(symbol, stockData, rallyIndex, ftdIndex);

      processed.push(symbol);
    }


    return {
      success: true,
      processed_symbols: processed.length
    };
  } catch (error) {
    console.error('❌ Formula Engine Error:', error);
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