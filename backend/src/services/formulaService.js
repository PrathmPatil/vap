import {
  PR,
  RallyAttemptDayModel,
  FollowThroughDayModel,
  BuyDayModel,
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