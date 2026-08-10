/** Pure technical indicator helpers for OHLC series. */

export type OhlcvPoint = {
  close: number;
  volume?: number;
  high?: number;
  low?: number;
};

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null);
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
  out[period] =
    avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

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

export function obv(closes: number[], volumes: number[]): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null);
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

export type BollingerResult = {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
};

export function bollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): BollingerResult {
  const middle = sma(closes, period);
  const upper: (number | null)[] = Array(closes.length).fill(null);
  const lower: (number | null)[] = Array(closes.length).fill(null);

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

export function latestIndicatorSnapshot(closes: number[], volumes: number[]) {
  const maPeriods = [20, 50, 100, 200] as const;
  const mas: Record<string, number | null> = {};
  for (const p of maPeriods) {
    const series = sma(closes, p);
    mas[`ma${p}`] = series[series.length - 1] ?? null;
  }
  const rsiSeries = rsi(closes, 14);
  const obvSeries = obv(closes, volumes);
  const bb = bollingerBands(closes, 20, 2);
  const last = closes.length - 1;

  return {
    ...mas,
    rsi14: rsiSeries[last] ?? null,
    obv: obvSeries[last] ?? null,
    bbMiddle: bb.middle[last] ?? null,
    bbUpper: bb.upper[last] ?? null,
    bbLower: bb.lower[last] ?? null,
  };
}
