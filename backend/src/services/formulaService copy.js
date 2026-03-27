import {
  PR,
  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
  StrongBullishCandleModel,
} from "../models/index.js";

export const runFormulaEngineService = async () => {
  try {

    /* --------------------------------
       CREATE TABLES IF NOT EXIST
    -------------------------------- */

    await RallyAttemptDayModel.sync();
    await FollowThroughDayModel.sync();
    await BuyDayModel.sync();

    console.log("Formula tables verified/created");

    /* --------------------------------
       GET ALL SYMBOLS
    -------------------------------- */

    const symbols = await PR.findAll({
      attributes: ["SECURITY"],
      group: ["SECURITY"],
    });

    const results = [];

    for (const row of symbols) {

      const symbol = row.SECURITY;

      const stockData = await PR.findAll({
        where: { SECURITY: symbol },
        order: [["source_date", "ASC"]],
      });

      if (stockData.length < 15) continue;

      let rallyIndex = null;

      /* --------------------------------
         RALLY ATTEMPT DAY
      -------------------------------- */

      for (let i = 1; i < stockData.length; i++) {

        const today = parseFloat(stockData[i].CLOSE_PRICE);
        const prev = parseFloat(stockData[i - 1].CLOSE_PRICE);

        if (today > prev) {

          rallyIndex = i;

          await FollowThroughDayModel.destroy({ where: { symbol } });
          await BuyDayModel.destroy({ where: { symbol } });

          await RallyAttemptDayModel.create({
            symbol,
            rally_date: stockData[i].source_date,
            close_price: today,
            status: "rally_detected",
          });

          break;
        }
      }

      if (rallyIndex === null) continue;

      /* --------------------------------
         FOLLOW THROUGH DAY
      -------------------------------- */

      let ftdIndex = null;

      for (let i = rallyIndex + 3; i <= rallyIndex + 6; i++) {

        if (!stockData[i]) continue;

        const today = parseFloat(stockData[i].CLOSE_PRICE);
        const prev = parseFloat(stockData[i - 1].CLOSE_PRICE);

        const percent = ((today - prev) / prev) * 100;

        const volumeToday = parseFloat(stockData[i].NET_TRDQTY);
        const volumePrev = parseFloat(stockData[i - 1].NET_TRDQTY);

        if (percent >= 1.5 && volumeToday > volumePrev) {

          ftdIndex = i;

          await FollowThroughDayModel.create({
            symbol,
            rally_date: stockData[rallyIndex].source_date,
            ftd_date: stockData[i].source_date,
            change_percent: percent,
            volume: volumeToday,
            status: "ftd_detected",
          });

          break;
        }
      }

      if (ftdIndex === null) continue;

      /* --------------------------------
         BUY DAY
      -------------------------------- */

      const ftdHigh = parseFloat(stockData[ftdIndex].HIGH_PRICE);

      for (let i = ftdIndex + 1; i <= ftdIndex + 10; i++) {

        if (!stockData[i]) continue;

        const price = parseFloat(stockData[i].CLOSE_PRICE);
        const volume = parseFloat(stockData[i].NET_TRDQTY);
        const prevVolume = parseFloat(stockData[i - 1].NET_TRDQTY);

        if (price > ftdHigh && volume > prevVolume) {

          await BuyDayModel.create({
            symbol,
            rally_date: stockData[rallyIndex].source_date,
            ftd_date: stockData[ftdIndex].source_date,
            buy_date: stockData[i].source_date,
            breakout_price: price,
            status: "ready_to_buy",
          });

          break;
        }
      }

      results.push(symbol);
    }

    return {
      success: true,
      total_symbols_processed: results.length,
      message: "Formula engine executed successfully",
    };

  } catch (error) {

    console.error("Formula Engine Error:", error);
    throw error;

  }
};

import { fn, col, where } from "sequelize";

export const generateStrongBullishService = async () => {
  try {

    console.log("🚀 Strong Bullish Engine Started");

    await StrongBullishCandleModel.sync();
    console.log("✅ strong_bullish_candle table verified");

    /* --------------------------------
       GET LATEST DATE
    -------------------------------- */

    const latestDateRaw = await PR.max("source_date");

    const latestDate = latestDateRaw
      ? latestDateRaw.toISOString().split("T")[0]
      : null;

    console.log("📅 Latest PR Date:", latestDate);

    if (!latestDate) {
      return {
        success: false,
        data: [],
        message: "No PR data found"
      };
    }

    /* --------------------------------
       CHECK IF ALREADY GENERATED
    -------------------------------- */

    const existingCount = await StrongBullishCandleModel.count({
      where: { trade_date: latestDate }
    });

    console.log("📊 Existing rows for this date:", existingCount);

    if (existingCount > 0) {

      const existingData = await StrongBullishCandleModel.findAll({
        where: { trade_date: latestDate },
        raw: true
      });

      return {
        success: true,
        data: existingData,
        message: "Strong bullish data already generated for latest date",
        latest_date: latestDate,
        inserted_rows: 0
      };
    }

    /* --------------------------------
       FETCH PR DATA
    -------------------------------- */

    const stocks = await PR.findAll({
      attributes: [
        "SECURITY",
        "OPEN_PRICE",
        "CLOSE_PRICE",
        "source_date"
      ],
      where: where(fn("DATE", col("source_date")), latestDate),
      raw: true
    });

    console.log("📦 Total stocks fetched:", stocks.length);

    if (!stocks.length) {
      return {
        success: false,
        data: [],
        message: "No stocks found for latest date"
      };
    }

    /* --------------------------------
       APPLY STRONG BULLISH RULE
    -------------------------------- */

    const bullishStocks = [];

    for (const stock of stocks) {

      const open = parseFloat(stock.OPEN_PRICE);
      const close = parseFloat(stock.CLOSE_PRICE);

      if (!open || !close) continue;

      const percent = ((close - open) / open) * 100;

      if (percent >= 2) {

        bullishStocks.push({
          security: stock.SECURITY,
          trade_date: stock.source_date,
          open_price: open,
          close_price: close,
          change_percent: percent
        });

      }
    }

    /* --------------------------------
       INSERT DATA
    -------------------------------- */

    if (bullishStocks.length > 0) {
      await StrongBullishCandleModel.bulkCreate(bullishStocks);
    }

    console.log("✅ Strong Bullish Inserted:", bullishStocks.length);

    return {
      success: true,
      data: bullishStocks,
      message: "Strong bullish candles generated successfully",
      latest_date: latestDate,
      inserted_rows: bullishStocks.length
    };

  } catch (error) {

    console.error("❌ Strong Bullish Engine Error:", error);

    return {
      success: false,
      data: [],
      message: error.message
    };
  }
};