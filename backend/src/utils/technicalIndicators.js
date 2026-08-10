/** Technical indicators from OHLCV series (backend). */

export function sma(values, period) {
  const out = Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function rsi(closes, period = 14) {
  const out = Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }

  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function obv(closes, volumes) {
  const out = Array(closes.length).fill(null);
  if (!closes.length) return out;
  let running = 0;
  out[0] = 0;
  for (let i = 1; i < closes.length; i++) {
    const vol = volumes[i] || 0;
    if (closes[i] > closes[i - 1]) running += vol;
    else if (closes[i] < closes[i - 1]) running -= vol;
    out[i] = running;
  }
  return out;
}

export function bollingerBands(closes, period = 20, stdDev = 2) {
  const middle = sma(closes, period);
  const upper = Array(closes.length).fill(null);
  const lower = Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    if (mean == null) continue;
    const variance =
      slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + stdDev * sd;
    lower[i] = mean - stdDev * sd;
  }

  return { middle, upper, lower };
}

export function computeIndicatorsFromBars(bars) {
  const closes = bars.map((b) => Number(b.close));
  const volumes = bars.map((b) => Number(b.volume || 0));
  const last = closes.length - 1;
  if (last < 0) return null;

  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma100 = sma(closes, 100);
  const ma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const obvSeries = obv(closes, volumes);
  const bb = bollingerBands(closes, 20, 2);

  const open = Number(bars[last].open);
  const high = Number(bars[last].high);
  const low = Number(bars[last].low);
  const close = closes[last];
  const volume = volumes[last];
  const prevClose =
    bars[last].prev_close != null
      ? Number(bars[last].prev_close)
      : last > 0
        ? closes[last - 1]
        : close;
  const changePercent =
    prevClose && prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : 0;

  return {
    open,
    high,
    low,
    close,
    volume,
    prev_close: prevClose,
    change_percent: changePercent,
    rsi14: rsi14[last],
    sma20: ma20[last],
    sma50: ma50[last],
    sma100: ma100[last],
    sma200: ma200[last],
    bb_upper: bb.upper[last],
    bb_middle: bb.middle[last],
    bb_lower: bb.lower[last],
    obv: obvSeries[last],
    hi_52_wk: bars[last].hi_52_wk != null ? Number(bars[last].hi_52_wk) : null,
    lo_52_wk: bars[last].lo_52_wk != null ? Number(bars[last].lo_52_wk) : null,
    trade_date: bars[last].date,
  };
}
