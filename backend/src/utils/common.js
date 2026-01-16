import { getStockData } from '../services/stock.service.js';

export const isRallyAttemptDay = (today = {}, prev = {}) => {
  console.log(today, 'today', prev, 'prev');
  return (
    today.close > today.open * 1.02 &&
    today.close > prev.close &&
    today.open < prev.close &&
    today.volume > prev.volume * 1.5 &&
    today.close >= today.high * 0.99
  );
};

const closePriceMovingAverage = (data) => {
  console.log('closePriceMovingAverage', data);
  if (!data || !data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Number(data[i].close) || 0;
  }
  console.log(
    sum,
    'sum',
    data.length,
    'data.length',
    sum / data.length,
    'sum/data.length'
  );
  return sum / data.length;
};

const calculateEMA = (data, period) => {
  if (!data || data.length < period) return 0;

  // Step 1: Calculate the initial SMA for the first 'period' values
  let sma = 0;
  for (let i = 0; i < period; i++) {
    sma += Number(data[i].close) || 0;
  }
  sma = sma / period;

  const k = 2 / (period + 1);
  let ema = sma;

  // Step 2: Calculate EMA from the next data point onwards
  for (let i = period; i < data.length; i++) {
    const close = Number(data[i].close) || 0;
    ema = close * k + ema * (1 - k);
  }

  return ema;
};

export const isFollowThroughDay = (today, prev, dayBeforePrev, volume20MA) => {
  console.log(
    today,
    'today',
    prev,
    'prev',
    dayBeforePrev,
    'dayBeforePrev',
    volume20MA,
    'volume20MA'
  );
  const volumeCondition =
    today.volume >= prev.volume ||
    today.volume >= volume20MA ||
    today.volume >= dayBeforePrev.volume;

  return (
    today.open > prev.open &&
    today.close > today.open &&
    today.close >= prev.close &&
    today.close >= today.high * 0.99 &&
    volumeCondition
  );
};

export const isBuyDay = (today, ema10, ema20, crossoverValue) => {
  const isEMACrossover = ema10 > ema20;
  const openAboveCrossover = today.open > crossoverValue * 1.000001;
  const closeWithinRange =
    today.close <= crossoverValue * 1.05 &&
    today.close >= crossoverValue * 1.02;

  return (
    isEMACrossover &&
    openAboveCrossover &&
    closeWithinRange &&
    today.close > today.open
  );
};

export const getQualifiedStockDaysForSymbol = async (symbol) => {
  const stockData = await getStockData(symbol); // 30 days sorted

  if (!stockData || stockData.length < 3) return null;

  const rallyDays = [];
  const followThroughDays = [];
  const buyDays = [];

  // for (let i = 0; i < stockData.length; i++) {
  let i = 0;
  const dayBeforePrev = stockData[i + 2];
  const prev = stockData[i + 1];
  const today = stockData[i];

  const ema10 = calculateEMA(stockData.slice(0, 10), 10);
  const ema20 = calculateEMA(stockData.slice(0, 20), 20);
  const crossoverValue = ema10;
  const volume20MA = closePriceMovingAverage(stockData.slice(0, 10));
  //close price moving average closePriceMovingAverage

  if (isRallyAttemptDay(today, prev)) rallyDays.push(today);
  if (isFollowThroughDay(today, prev, dayBeforePrev, volume20MA)) followThroughDays.push(today);
  if (isBuyDay(today, ema10, ema20, crossoverValue)) buyDays.push(today);
  // }

  return {
    symbol,
    rallyAttemptDays: rallyDays,
    followThroughDays: followThroughDays,
    buyDays: buyDays
  };
};

export const getQualifiedStockDaysForMultiple = async (symbols = []) => {
  const results = [];

  for (let symbol of symbols) {
    const result = await getQualifiedStockDaysForSymbol(symbol);
    if (result) results.push(result);
  }

  return results;
};
