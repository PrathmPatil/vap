export type FormulaOption = {
  value: string;
  label: string;
};

export const FORMULA_CATALOG: FormulaOption[] = [
  { value: "band-hit-52w", label: "52W Band Hit" },
  { value: "fifty-two-week-high", label: "52-Week High Breakout" },
  { value: "fifty-two-week-low", label: "52-Week Low Breakdown" },
  { value: "bearish-candle", label: "Bearish Candle" },
  { value: "buy-day", label: "Buy Day" },
  { value: "daily-mover-down", label: "Daily Mover Down" },
  { value: "daily-mover-up", label: "Daily Mover Up" },
  { value: "follow-through-day", label: "Follow Through Day" },
  { value: "gap-down-day", label: "Gap Down Day" },
  { value: "gap-up-day", label: "Gap Up Day" },
  { value: "rally-attempt-day", label: "Rally Attempt Day" },
  { value: "strong-bullish-candle", label: "Strong Bullish Candle" },
  { value: "top-gainer-day", label: "Top Gainer Day" },
  { value: "top-loser-day", label: "Top Loser Day" },
  { value: "tweezer-bottoms", label: "Tweezer Bottoms" },
  { value: "volume-breakouts", label: "Volume Breakouts" },
].sort((a, b) => a.label.localeCompare(b.label));

const STORAGE_KEY = "vap.formula.prefs.v1";

export type FormulaPrefs = {
  favorites: string[];
  pinned: string[];
};

export function loadFormulaPrefs(): FormulaPrefs {
  if (typeof window === "undefined") {
    return { favorites: [], pinned: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { favorites: [], pinned: [] };
    const parsed = JSON.parse(raw);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
    };
  } catch {
    return { favorites: [], pinned: [] };
  }
}

export function saveFormulaPrefs(prefs: FormulaPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Pinned first, then favorites, then A–Z. */
export function orderFormulas(
  catalog: FormulaOption[],
  prefs: FormulaPrefs,
  search = ""
): FormulaOption[] {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? catalog.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.value.toLowerCase().includes(q)
      )
    : [...catalog];

  const pinnedSet = new Set(prefs.pinned);
  const favSet = new Set(prefs.favorites);

  const rank = (value: string) => {
    if (pinnedSet.has(value)) return 0;
    if (favSet.has(value)) return 1;
    return 2;
  };

  return filtered.sort((a, b) => {
    const ra = rank(a.value);
    const rb = rank(b.value);
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label);
  });
}
