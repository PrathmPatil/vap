# Formula Engine — Data Analysis & Business Logic

## 1. Available Bhavcopy Data (`bhavcopy_fastapi_newdb`)

| Table | Rows (approx) | Date range | Formula use |
|-------|---------------|------------|-------------|
| **pr** | ~3,550/day | 2026-06-10 → 2026-06-19 | Primary OHLCV, 52-week range, prev close |
| **pd** | ~3,550/day | Same as pr | PR + `SYMBOL` / `SERIES` |
| **gl** | ~3,050/day | Same | NSE gainers/losers with `PERCENT_CG` |
| **bh** | ~220/day | Same | 52-week high/low **band hits** (`HIGH_LOW` = H/L) |
| **mcap** | ~2,950/day | Same | Market cap (filter large/mid cap later) |
| **bc** | ~400/day | Same | Corporate actions (dividend, bonus dates) |
| **hl** | ~70/day | Same | Circuit limit changes |
| **sme** | ~450/day | Same | SME segment OHLCV |
| **etf** | ~325/day | Same | ETF prices |
| **eq / fo / debt** | 1 placeholder/day | — | **Not populated** (MISSING stubs only) |

**Constraint:** Only **8 trading days** of history exist today. Formulas needing 10–22 day lookbacks (Volume Breakout 10d, Tweezer 20d SMA) need more backfilled bhavcopy dates to work reliably.

**Join key:** `PR.SECURITY` ↔ `listed_companies.name` (EQ series) → `symbol`.

---

## 2. Formula Catalog

### A. Existing formulas (implemented)

| # | Formula | Source | Min history | Business purpose |
|---|---------|--------|-------------|------------------|
| 1 | **Strong Bullish Candle** | PR | 1 day | Intraday momentum — close up ≥2% from open |
| 2 | **Bearish Candle** | PR | 1 day | Intraday weakness — close down ≥2% from open |
| 3 | **Gap Up** | PR | 1 day | Opening gap up vs previous close (≥1%) |
| 4 | **Gap Down** | PR | 1 day | Opening gap down vs previous close (≤−1%) |
| 5 | **52-Week High Breakout** | PR | 1 day | Price at/near 52-week high (`HI_52_WK`) |
| 6 | **Rally Attempt Day** | PR | 2 days | Close higher than prior day (start of rally chain) |
| 7 | **Follow Through Day** | PR + Rally | 7 days | Confirmation 4–7 days after rally (+1.5%, vol up) |
| 8 | **Buy Day** | PR + FTD | 10 days | Break above FTD high with rising volume |
| 9 | **Volume Breakout** | PR | 11 days | Volume ≥2× 10-day average + price up |
| 10 | **Tweezer Bottom** | PR | 22 days | Reversal pattern — equal lows + bullish turn |
| 11 | **Top Gainer Day** | GL | 1 day | NSE gainers list — `PERCENT_CG` ≥ threshold |
| 12 | **Top Loser Day** | GL | 1 day | NSE losers list — `PERCENT_CG` ≤ −threshold |
| 13 | **52W Band Hit** | BH | 1 day | Stock touched 52-week high or low band |
| 14 | **52-Week Low Breakdown** | PR | 1 day | Price at/near 52-week low (`LO_52_WK`) |
| 15 | **Daily Mover Up** | PR | 1 day | Close up ≥3% vs previous close |
| 16 | **Daily Mover Down** | PR | 1 day | Close down ≥3% vs previous close |

### B. Planned (need more data or external feed)

| Formula | Why not now |
|---------|-------------|
| 20/50-day SMA crossover | Needs 50+ trading days PR history |
| Delivery % spike | Not in PR zip (need CM delivery bhavcopy) |
| Index relative strength | Need index series + 20d history |
| Corporate action signals | `bc` available but needs ex-date calendar logic |
| Options OI buildup | `fo` table empty |

---

## 3. Business Logic (detail)

### Strong Bullish Candle
- **Rule:** `(close − open) / open × 100 ≥ base_percent` (default 2%)
- **Use case:** Screen stocks with strong buying pressure same day
- **Output:** security, open, close, change_percent, trade_date

### Bearish Candle
- **Rule:** `(close − open) / open × 100 ≤ −base_percent`
- **Use case:** Weakness / short-watch list
- **Output:** Same shape as bullish

### Gap Up / Gap Down
- **Rule:** `(open − prev_close) / prev_close × 100` ≥ +1% (gap up) or ≤ −1% (gap down)
- **Use case:** Overnight sentiment / news reaction
- **Fields:** prev_close, open_price, gap_percent

### 52-Week High Breakout
- **Rule:** `close ≥ HI_52_WK × 0.995` (within 0.5% of 52w high)
- **Use case:** Breakout / new-high momentum watch
- **Fields:** close, hi_52_wk, distance_from_high_pct

### Rally Attempt → FTD → Buy Day (chain)
1. **Rally:** today's close > yesterday's close
2. **FTD:** days 4–7 after rally: close +1.5% with volume > prior day
3. **Buy:** within 10 days after FTD: close > FTD high with rising volume

### Volume Breakout
- **Rule:** today volume ≥ 2× avg(prior 10 days) AND close > yesterday close
- **Needs:** 11 days PR per symbol

### Tweezer Bottom
- Equal lows (≤0.5%), bearish then bullish candle, body strength ≥75%, below 20d SMA, volume confirmation
- **Needs:** 22 days PR per symbol

### Top Gainer Day (from GL)
- **Rule:** `GAIN_LOSS = 'G'` and `PERCENT_CG ≥ threshold` (default 3%)
- **Use case:** Official NSE top gainers for the day

### Top Loser Day (from GL)
- **Rule:** `GAIN_LOSS = 'L'` and `PERCENT_CG ≤ −threshold` (default 3%)
- **Use case:** Official NSE top losers for the day

### 52W Band Hit (from BH)
- **Rule:** `HIGH_LOW = 'H'` (hit 52w high) or `'L'` (hit 52w low)
- **Use case:** Band breakout / breakdown alerts from NSE

### 52-Week Low Breakdown
- **Rule:** `close ≤ LO_52_WK × 1.005` (within 0.5% of 52w low)
- **Use case:** Breakdown / new-low weakness watch

### Daily Mover Up / Down
- **Rule:** `(close − prev_close) / prev_close × 100` ≥ +3% (up) or ≤ −3% (down)
- **Use case:** Full-day price momentum vs prior session (different from intraday candle formulas)

---

## 4. API Endpoints

| Formula slug | POST endpoint |
|--------------|---------------|
| strong-bullish-candle | `/vap/formula/strong-bullish-candle` |
| bearish-candle | `/vap/formula/bearish-candle` |
| gap-up-day | `/vap/formula/gap-up-day` |
| gap-down-day | `/vap/formula/gap-down-day` |
| fifty-two-week-high | `/vap/formula/fifty-two-week-high` |
| rally-attempt-day | `/vap/formula/rally-attempt-day` |
| follow-through-day | `/vap/formula/follow-through-day` |
| buy-day | `/vap/formula/buy-day` |
| volume-breakouts | `/vap/formula/volume-breakouts` |
| tweezer-bottoms | `/vap/formula/tweezer-bottoms` |
| top-gainer-day | `/vap/formula/top-gainer-day` |
| top-loser-day | `/vap/formula/top-loser-day` |
| band-hit-52w | `/vap/formula/band-hit-52w` |
| fifty-two-week-low | `/vap/formula/fifty-two-week-low` |
| daily-mover-up | `/vap/formula/daily-mover-up` |
| daily-mover-down | `/vap/formula/daily-mover-down` |

Meta: `GET /vap/formula/meta/:formulaType/dates` and `/companies`

Engine: `POST /vap/formula/run-formula-engine` with `{ "trade_date": "YYYY-MM-DD" }`

---

## 5. Result storage

All formula outputs are stored in **`stock_market_fastapi_bhavcopy_fastapi_newdb`** (same DB as cron logs).

Query example:
```sql
SELECT trade_date, COUNT(*) FROM strong_bullish_candle GROUP BY trade_date;
SELECT trade_date, COUNT(*) FROM gap_up_day GROUP BY trade_date;
SELECT trade_date, band_type, COUNT(*) FROM band_hit_52w GROUP BY trade_date, band_type;
```
