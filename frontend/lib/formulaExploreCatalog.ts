export type FormulaExploreCategory = {
  id: string;
  title: string;
  description: string;
};

export type FormulaExploreItem = {
  value: string;
  label: string;
  categoryId: string;
  shortDescription: string;
  fullDescription: string;
  rules: string[];
  tags: string[];
  premium?: boolean;
};

export const FORMULA_EXPLORE_CATEGORIES: FormulaExploreCategory[] = [
  {
    id: "market-structure",
    title: "Market structure",
    description: "IBD-style rally phases and follow-through signals on NSE/BSE.",
  },
  {
    id: "candle-patterns",
    title: "Candle patterns",
    description: "Single- and multi-day candle setups from bhavcopy OHLC data.",
  },
  {
    id: "momentum",
    title: "Momentum & movers",
    description: "Large daily price moves and session leaders.",
  },
  {
    id: "breakouts",
    title: "Breakouts & bands",
    description: "52-week extremes, band hits, and volume expansion screens.",
  },
  {
    id: "relative-strength",
    title: "Relative strength",
    description: "Benchmark-relative performance vs Nifty and broader market.",
  },
];

export const FORMULA_EXPLORE_ITEMS: FormulaExploreItem[] = [
  {
    value: "rally-attempt-day",
    label: "Rally Attempt Day",
    categoryId: "market-structure",
    shortDescription: "First up day after a meaningful decline — early rally try.",
    fullDescription:
      "Identifies stocks printing a Rally Attempt Day after a correction, using the same market-structure logic used in CAN SLIM / IBD workflows. Useful for spotting when a stock begins to recover from a base or pullback.",
    rules: [
      "Prior downtrend or correction context from recent sessions",
      "Qualifying up day on the selected trade date",
      "EQ-series NSE/BSE symbols from listed companies",
    ],
    tags: ["Structure", "Swing"],
    premium: true,
  },
  {
    value: "follow-through-day",
    label: "Follow Through Day",
    categoryId: "market-structure",
    shortDescription: "Strong confirmation day after a rally attempt.",
    fullDescription:
      "Finds Follow Through Days that confirm institutional demand after a rally attempt. Often watched as a higher-conviction structure signal before adding exposure.",
    rules: [
      "Follows a valid rally attempt in the sequence",
      "Strong close with supportive volume characteristics",
      "Filtered to active EQ listings",
    ],
    tags: ["Structure", "Confirmation"],
    premium: true,
  },
  {
    value: "buy-day",
    label: "Action Day",
    categoryId: "market-structure",
    shortDescription: "Actionable buy-structure day after follow-through.",
    fullDescription:
      "Surfaces Action Day candidates — the stage after follow-through where price action suggests a tradable pivot. Renamed from Buy Day to reflect signal context rather than advice.",
    rules: [
      "Requires follow-through day logic in the engine chain",
      "Latest bhavcopy session date (or chosen historical date)",
      "Symbol mapped to listed company master",
    ],
    tags: ["Structure", "Action"],
    premium: true,
  },
  {
    value: "strong-bullish-candle",
    label: "Strong Bullish Candle",
    categoryId: "candle-patterns",
    shortDescription: "King candle: strong close gain with dominant real body.",
    fullDescription:
      "Screens for strong bullish / king candles where the close rises meaningfully versus the open and the real body covers most of the day’s range. Body percentage and minimum gain are adjustable.",
    rules: [
      "Close change ≥ threshold % (default 2%)",
      "Body ≥ configurable % of high–low range (default 80%)",
      "Uses OPEN, HIGH, LOW, CLOSE from bhavcopy",
    ],
    tags: ["Candle", "Bullish"],
    premium: true,
  },
  {
    value: "bearish-candle",
    label: "Bearish Candle",
    categoryId: "candle-patterns",
    shortDescription: "Heavy red candle with decisive downside close.",
    fullDescription:
      "Finds bearish candles with a strong down close versus the open. Helpful for monitoring distribution, failed breakouts, or short watchlists.",
    rules: [
      "Negative close change beyond threshold %",
      "EQ-only universe",
      "Threshold adjustable in scanner",
    ],
    tags: ["Candle", "Bearish"],
    premium: true,
  },
  {
    value: "gap-up-day",
    label: "Gap Up Day",
    categoryId: "candle-patterns",
    shortDescription: "Open gaps above prior close by a minimum %.",
    fullDescription:
      "Lists stocks that gapped up at the open relative to the previous session’s close. Gap size filter helps focus on meaningful openings rather than noise.",
    rules: [
      "Open − previous close ≥ gap threshold %",
      "Default threshold 1% (adjustable)",
      "Sorted by latest trade date",
    ],
    tags: ["Gap", "Bullish"],
    premium: true,
  },
  {
    value: "gap-down-day",
    label: "Gap Down Day",
    categoryId: "candle-patterns",
    shortDescription: "Open gaps below prior close by a minimum %.",
    fullDescription:
      "Lists stocks that gapped down at the open. Often used for weakness scans, mean-reversion setups, or risk monitoring.",
    rules: [
      "Previous close − open ≥ gap threshold %",
      "Default threshold 1% (adjustable)",
      "EQ listings only",
    ],
    tags: ["Gap", "Bearish"],
    premium: true,
  },
  {
    value: "tweezer-bottoms",
    label: "Tweezer Bottoms",
    categoryId: "candle-patterns",
    shortDescription: "Matching lows across two sessions — reversal hint.",
    fullDescription:
      "Detects tweezer bottom patterns where two consecutive candles form similar lows, suggesting demand near a support zone.",
    rules: [
      "Two-day low matching within tolerance",
      "Pattern strength scored in results",
      "Historical date selectable",
    ],
    tags: ["Pattern", "Reversal"],
    premium: true,
  },
  {
    value: "top-gainer-day",
    label: "Top Gainer Day",
    categoryId: "momentum",
    shortDescription: "Session leaders by positive change %.",
    fullDescription:
      "Ranks the day’s top gainers by percentage change. Combine with liquidity and structure filters on your watchlist for momentum ideas.",
    rules: [
      "Change % ≥ configurable minimum (default 3%)",
      "Sort high → low by change",
      "Optional change % band filter",
    ],
    tags: ["Momentum", "Gainers"],
    premium: true,
  },
  {
    value: "top-loser-day",
    label: "Top Loser Day",
    categoryId: "momentum",
    shortDescription: "Weakest names by negative change %.",
    fullDescription:
      "Shows the largest decliners for the session. Useful for risk review, short-term weakness scans, or avoiding crowded laggards.",
    rules: [
      "Change % below threshold (default −3%)",
      "Sort by magnitude of loss",
      "EQ universe",
    ],
    tags: ["Momentum", "Losers"],
    premium: true,
  },
  {
    value: "daily-mover-up",
    label: "Daily Mover Up",
    categoryId: "momentum",
    shortDescription: "Stocks with sharp upward daily moves.",
    fullDescription:
      "Broader upward mover screen with adjustable minimum move percentage. Similar to top gainers but tuned for intraday-style momentum monitoring.",
    rules: [
      "Positive change % beyond threshold",
      "Sortable ascending / descending",
      "Change % range filters available",
    ],
    tags: ["Momentum", "Movers"],
    premium: true,
  },
  {
    value: "daily-mover-down",
    label: "Daily Mover Down",
    categoryId: "momentum",
    shortDescription: "Stocks with sharp downward daily moves.",
    fullDescription:
      "Downward counterpart to Daily Mover Up — highlights names with significant selling pressure on the selected date.",
    rules: [
      "Negative change % beyond threshold",
      "Sortable results",
      "Export to Excel supported",
    ],
    tags: ["Momentum", "Movers"],
    premium: true,
  },
  {
    value: "fifty-two-week-high",
    label: "52-Week High Breakout",
    categoryId: "breakouts",
    shortDescription: "Price at or breaking above 52-week high.",
    fullDescription:
      "Finds stocks trading at new 52-week highs — a classic breakout watchlist screen used by momentum investors.",
    rules: [
      "Close near or above 52W high from bhavcopy",
      "EQ-series symbols",
      "Latest or historical session",
    ],
    tags: ["Breakout", "52W"],
    premium: true,
  },
  {
    value: "fifty-two-week-low",
    label: "52-Week Low Breakdown",
    categoryId: "breakouts",
    shortDescription: "Price at or breaking below 52-week low.",
    fullDescription:
      "Highlights stocks at 52-week lows for weakness monitoring, value deep-dives, or contrarian research (not recommendations).",
    rules: [
      "Close near or below 52W low",
      "Listed EQ companies",
      "Date-aware query",
    ],
    tags: ["Breakdown", "52W"],
    premium: true,
  },
  {
    value: "band-hit-52w",
    label: "52W Band Hit",
    categoryId: "breakouts",
    shortDescription: "Touch of upper or lower 52-week band.",
    fullDescription:
      "Screens for stocks hitting the upper or lower 52-week band — helpful when tracking range extremes without requiring a full breakout close.",
    rules: [
      "Band type recorded in results",
      "Uses 52-week high/low fields",
      "Symbol and company name shown",
    ],
    tags: ["Bands", "52W"],
    premium: true,
  },
  {
    value: "volume-breakouts",
    label: "Volume Breakouts",
    categoryId: "breakouts",
    shortDescription: "Volume surge vs recent average with EQ filter.",
    fullDescription:
      "Flags volume breakouts where today’s volume exceeds a multiple of the recent average. Volume ratio and sort order are adjustable; EQ-only by default.",
    rules: [
      "Volume ratio ≥ minimum (default 2×)",
      "EQ-series filter applied",
      "Sort by volume ratio high → low",
    ],
    tags: ["Volume", "Breakout"],
    premium: true,
  },
  {
    value: "rs-rank",
    label: "Relative Strength Rank",
    categoryId: "relative-strength",
    shortDescription: "Outperforms Nifty 50 & 500 over 21D and 55D.",
    fullDescription:
      "Implements the Relative Strength Rank workbook: stocks must outperform both Nifty 50 and Nifty 500 (CNX500) over 21 and 55 trading days. All four relative-strength values must be greater than zero. Rank 1–99 is assigned from the composite score among qualifiers.",
    rules: [
      "21D vs Nifty > 0 and 55D vs Nifty > 0",
      "21D vs CNX500 > 0 and 55D vs CNX500 > 0",
      "RS = stock return − index return (same dates)",
      "Composite score = average of four RS values",
    ],
    tags: ["RS", "Nifty", "CNX500"],
    premium: true,
  },
];

export function getFormulaExploreItem(value: string) {
  return FORMULA_EXPLORE_ITEMS.find((item) => item.value === value);
}

export function getFormulasByCategory(categoryId: string) {
  return FORMULA_EXPLORE_ITEMS.filter((item) => item.categoryId === categoryId);
}

export function searchExploreFormulas(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return FORMULA_EXPLORE_ITEMS;
  return FORMULA_EXPLORE_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.shortDescription.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}
