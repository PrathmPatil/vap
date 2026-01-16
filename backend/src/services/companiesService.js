import { AllCompaniesData, ListedCompanies } from '../models/index.js';
import { Op } from 'sequelize';

// 🧠 Rally Attempt Day
function checkRallyAttemptDay(latestData) {
  let results = [];

  for (const { symbol, data } of latestData) {
    if (!data || data.length < 2) continue;

    // Data is sorted DESC, reverse to oldest → newest
    const sortedData = [...data].reverse();
    const today = sortedData[sortedData.length - 1];
    const prev = sortedData[sortedData.length - 2];

    const cond1 = today.close > today.open * 1.02; // +2% up
    const cond2 = today.close > prev.close;        // higher close
    const cond3 = today.open < prev.close;         // positive opening
    const cond4 = today.volume > prev.volume * 1.5; // 50% higher volume
    const cond5 = (today.high - today.close) / today.high <= 0.01; // small wick

    if (cond1 && cond2 && cond3 && cond4 && cond5) {
      results.push({
        symbol,
        date: today.date,
        close: today.close,
        open: today.open,
        volume: today.volume
      });
    }
  }

  return results;
}

// 🧠 Follow Through Day
function checkFollowThroughDay(latestData) {
  let results = [];

  for (const { symbol, data } of latestData) {
    if (!data || data.length < 5) continue;

    const sortedData = [...data].reverse();
    for (let i = 1; i < sortedData.length; i++) {
      const prev = sortedData[i - 1];
      const today = sortedData[i];

      const cond1 = today.close > prev.close * 1.015; // +1.5% higher close
      const cond2 = today.volume > prev.volume; // higher volume

      if (cond1 && cond2) {
        results.push({
          symbol,
          date: today.date,
          close: today.close,
          open: today.open,
          volume: today.volume
        });
        break; // only one valid follow-through day needed
      }
    }
  }

  return results;
}

// 🧠 Buy Day
function checkBuyDay(latestData) {
  let results = [];

  for (const { symbol, data } of latestData) {
    if (!data || !data.length) continue;

    const sortedData = [...data].reverse();
    const today = sortedData[sortedData.length - 1];

    if (today.close > today.open * 1.05) { // +5% up day
      results.push({
        symbol,
        date: today.date,
        close: today.close,
        open: today.open,
        volume: today.volume
      });
    }
  }

  return results;
}

// 🧩 Main Service Function
export async function analyzeCompanies(date) {
  console.log("Requested Date:", date);

  const allSymbols = await ListedCompanies.findAll({
    attributes: ["symbol"],
    raw: true,
  });

  let latestData = [];
  let usedDate = null;

  for (const { symbol } of allSymbols) {
    // Step 1: Check if data exists for the given date
    const dataExists = await AllCompaniesData.findOne({
      where: { symbol, date },
      raw: true,
    });

    let targetDate = date;

    // Step 2: If not available, find the latest available date before it
    if (!dataExists) {
      const prev = await AllCompaniesData.findOne({
        where: {
          symbol,
          date: { [Op.lt]: date },
        },
        order: [["date", "DESC"]],
        raw: true,
      });

      if (!prev) continue;
      targetDate = prev.date;
    }

    usedDate = targetDate;

    // Step 3: Fetch last 5 available days including targetDate
    const last5Days = await AllCompaniesData.findAll({
      where: {
        symbol,
        date: { [Op.lte]: targetDate },
      },
      order: [["date", "DESC"]],
      limit: 5,
      raw: true,
    });

    if (last5Days.length === 5) {
      latestData.push({ symbol, data: last5Days });
    }
  }

  if (!latestData.length) {
    return {
      message: `Data not available for ${date} or any previous dates`,
      RallyAttemptDay: [],
      FollowThroughDay: [],
      BuyDay: [],
      checkedSymbolsCount: 0,
      latestData: [],
    };
  }

  return {
    message:
      usedDate && usedDate !== date
        ? `No data for ${date}, analyzed using last 5 days up to ${usedDate}`
        : `Analyzed using last 5 days up to ${date}`,
    RallyAttemptDay: checkRallyAttemptDay(latestData),
    FollowThroughDay: checkFollowThroughDay(latestData),
    BuyDay: checkBuyDay(latestData),
    checkedSymbolsCount: new Set(latestData.map((row) => row.symbol)).size,
    latestData,
  };
}
