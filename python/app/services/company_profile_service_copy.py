import yfinance as yf
from datetime import datetime
from typing import List, Dict, Optional
import pymysql
import logging
import time
import random
import requests

from app.database.connection import db_manager
from app.config import config

logger = logging.getLogger(__name__)


class CompanyProfileService:

    def __init__(self):
        self.db_name = config.DB_STOCK_MARKET
        self.max_retries = 5
        self.base_delay = 1  # base delay between retries (seconds)
        self.symbol_delay = 0.8  # delay between symbols (prevents 429)

    # -------------------------------------------------
    # FETCH SYMBOLS
    # -------------------------------------------------
    def get_listed_symbols(self) -> List[str]:
        try:
            with db_manager.get_connection(self.db_name) as conn:
                with conn.cursor(pymysql.cursors.DictCursor) as cur:
                    cur.execute("""
                        SELECT symbol
                        FROM listed_companies
                        WHERE symbol IS NOT NULL
                    """)
                    symbols = [row["symbol"] for row in cur.fetchall()]
                    logger.info(f"Fetched {len(symbols)} symbols")
                    return symbols
        except Exception:
            logger.exception("Failed to fetch listed symbols")
            return []

    # -------------------------------------------------
    # FETCH COMPANY DATA (429 SAFE)
    # -------------------------------------------------
    def fetch_company_info(self, symbol: str) -> Optional[Dict]:
        attempt = 0

        while attempt < self.max_retries:
            try:
                ticker = yf.Ticker(symbol)

                # Use fast_info first (lighter request)
                fast = ticker.fast_info
                info = ticker.info

                price = fast.get("last_price") or info.get("currentPrice")
                prev = info.get("previousClose")

                change = None
                change_pct = None

                if price is not None and prev not in (None, 0):
                    change = round(price - prev, 4)
                    change_pct = round((change / prev) * 100, 4)

                return {
                    "symbol": symbol,
                    "name": info.get("longName") or info.get("shortName"),
                    "sector": info.get("sector"),
                    "industry": info.get("industry"),
                    "currency": info.get("currency"),
                    "exchange": info.get("exchange"),
                    "marketCap": info.get("marketCap"),
                    "currentPrice": price,
                    "previousClose": prev,
                    "change": change,
                    "changePercent": change_pct,
                    "volume": info.get("volume"),
                    "high52Week": info.get("fiftyTwoWeekHigh"),
                    "low52Week": info.get("fiftyTwoWeekLow"),
                    "beta": info.get("beta"),
                    "dividendYield": info.get("dividendYield"),
                    "forwardPE": info.get("forwardPE"),
                    "trailingPE": info.get("trailingPE"),
                    "website": info.get("website"),
                    "addedAt": datetime.now()
                }

            except requests.exceptions.HTTPError as e:
                if e.response is not None and e.response.status_code == 429:
                    wait_time = (2 ** attempt) + random.uniform(0.5, 1.5)
                    logger.warning(
                        f"429 Rate limit for {symbol}. Retrying in {round(wait_time,2)}s"
                    )
                    time.sleep(wait_time)
                    attempt += 1
                else:
                    logger.warning(f"HTTP error for {symbol}: {e}")
                    return None

            except Exception as e:
                # Sometimes yfinance hides 429 inside generic exception
                if "429" in str(e):
                    wait_time = (2 ** attempt) + random.uniform(0.5, 1.5)
                    logger.warning(
                        f"429 detected (generic) for {symbol}. Retrying in {round(wait_time,2)}s"
                    )
                    time.sleep(wait_time)
                    attempt += 1
                else:
                    logger.warning(f"Failed to fetch {symbol}: {e}")
                    return None

        logger.error(f"Max retries exceeded for {symbol}")
        return None

    # -------------------------------------------------
    # SAVE DATA
    # -------------------------------------------------
    def save_company(self, cur, data: Dict):
        cur.execute("""
            INSERT INTO companies (
                symbol, name, sector, industry,
                currency, exchange, marketCap,
                currentPrice, previousClose,
                `change`, changePercent, volume,
                high52Week, low52Week, beta,
                dividendYield, forwardPE, trailingPE,
                website, addedAt
            ) VALUES (
                %(symbol)s, %(name)s, %(sector)s, %(industry)s,
                %(currency)s, %(exchange)s, %(marketCap)s,
                %(currentPrice)s, %(previousClose)s,
                %(change)s, %(changePercent)s, %(volume)s,
                %(high52Week)s, %(low52Week)s, %(beta)s,
                %(dividendYield)s, %(forwardPE)s, %(trailingPE)s,
                %(website)s, %(addedAt)s
            )
            ON DUPLICATE KEY UPDATE
                name=VALUES(name),
                sector=VALUES(sector),
                industry=VALUES(industry),
                currency=VALUES(currency),
                exchange=VALUES(exchange),
                marketCap=VALUES(marketCap),
                currentPrice=VALUES(currentPrice),
                previousClose=VALUES(previousClose),
                `change`=VALUES(`change`),
                changePercent=VALUES(changePercent),
                volume=VALUES(volume),
                high52Week=VALUES(high52Week),
                low52Week=VALUES(low52Week),
                beta=VALUES(beta),
                dividendYield=VALUES(dividendYield),
                forwardPE=VALUES(forwardPE),
                trailingPE=VALUES(trailingPE),
                website=VALUES(website),
                addedAt=VALUES(addedAt)
        """, data)

    # -------------------------------------------------
    # MAIN REFRESH FUNCTION
    # -------------------------------------------------
    def fetch_and_save_all(self) -> int:
        logger.info("Starting company profile refresh")

        symbols = self.get_listed_symbols()
        if not symbols:
            logger.warning("No listed symbols found")
            return 0

        saved = 0
        failed = 0

        try:
            with db_manager.get_connection(self.db_name) as conn:
                with conn.cursor() as cur:

                    for idx, symbol in enumerate(symbols, start=1):
                        data = self.fetch_company_info(symbol)

                        if not data:
                            failed += 1
                            continue

                        self.save_company(cur, data)
                        saved += 1

                        # Prevent rate limit
                        time.sleep(self.symbol_delay)

                        if idx % 50 == 0:
                            logger.info(
                                f"Progress: {idx}/{len(symbols)} | Saved={saved} | Failed={failed}"
                            )

                conn.commit()

            logger.info(
                f"Completed | Total={len(symbols)} | Saved={saved} | Failed={failed}"
            )
            return saved

        except Exception:
            logger.exception("Critical error during refresh")
            return saved


company_profile_service = CompanyProfileService()