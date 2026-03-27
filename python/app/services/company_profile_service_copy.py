import yfinance as yf
import pymysql
import logging
import time
from datetime import datetime
from typing import List, Optional

from app.database.connection import db_manager
from app.config import config

logger = logging.getLogger(__name__)


class MarketDataService:

    def __init__(self):
        self.db_name = config.DB_STOCK_MARKET
        self.symbol_delay = 0.5

    # -------------------------------------------------
    # GET LISTED SYMBOLS
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
            logger.exception("Failed to fetch symbols")
            return []

    # -------------------------------------------------
    # FETCH DATA FOR SINGLE DAY
    # -------------------------------------------------
    def fetch_single_day(self, symbol: str) -> Optional[list]:

        try:

            data = yf.download(
                symbol,
                period="5d",
                interval="1d",
                progress=False
            )

            if data.empty:
                return None

            last = data.tail(1)

            row = last.iloc[0]

            return [{
                "symbol": symbol,
                "trading_date": last.index[0].date(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            }]

        except Exception as e:
            logger.warning(f"Failed single-day fetch {symbol}: {e}")
            return None

    # -------------------------------------------------
    # FETCH DATA FOR DATE RANGE
    # -------------------------------------------------
    def fetch_range(self, symbol: str, start: str, end: str) -> Optional[list]:

        try:

            data = yf.download(
                symbol,
                start=start,
                end=end,
                interval="1d",
                progress=False
            )

            if data.empty:
                return None

            result = []

            for index, row in data.iterrows():

                result.append({
                    "symbol": symbol,
                    "trading_date": index.date(),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"])
                })

            return result

        except Exception as e:
            logger.warning(f"Failed range fetch {symbol}: {e}")
            return None

    # -------------------------------------------------
    # SAVE DATA
    # -------------------------------------------------
    def save_data(self, cur, data):

        cur.execute("""
            INSERT INTO companies_daily_data
            (
                symbol,
                trading_date,
                open,
                high,
                low,
                close,
                volume
            )
            VALUES
            (
                %(symbol)s,
                %(trading_date)s,
                %(open)s,
                %(high)s,
                %(low)s,
                %(close)s,
                %(volume)s
            )

            ON DUPLICATE KEY UPDATE

            open=VALUES(open),
            high=VALUES(high),
            low=VALUES(low),
            close=VALUES(close),
            volume=VALUES(volume)

        """, data)

    # -------------------------------------------------
    # REFRESH SINGLE DAY DATA
    # -------------------------------------------------
    def refresh_single_day(self):

        symbols = self.get_listed_symbols()

        saved = 0

        with db_manager.get_connection(self.db_name) as conn:

            with conn.cursor() as cur:

                for symbol in symbols:

                    rows = self.fetch_single_day(symbol)

                    if not rows:
                        continue

                    for row in rows:
                        self.save_data(cur, row)
                        saved += 1

                    time.sleep(self.symbol_delay)

            conn.commit()

        logger.info(f"Single day refresh saved {saved} rows")

        return saved

    # -------------------------------------------------
    # REFRESH RANGE DATA
    # -------------------------------------------------
    def refresh_range(self, start: str, end: str):

        symbols = self.get_listed_symbols()

        saved = 0

        with db_manager.get_connection(self.db_name) as conn:

            with conn.cursor() as cur:

                for symbol in symbols:

                    rows = self.fetch_range(symbol, start, end)

                    if not rows:
                        continue

                    for row in rows:
                        self.save_data(cur, row)
                        saved += 1

                    time.sleep(self.symbol_delay)

            conn.commit()

        logger.info(f"Range refresh saved {saved} rows")

        return saved


company_profile_service = MarketDataService()






# import yfinance as yf
# from datetime import datetime
# from typing import List, Dict, Optional
# import pymysql
# import logging
# import time
# import random
# import json
# import requests

# from app.database.connection import db_manager
# from app.config import config

# logger = logging.getLogger(__name__)


# class CompanyProfileService:

#     def __init__(self):
#         self.db_name = config.DB_STOCK_MARKET
#         self.max_retries = 5
#         self.symbol_delay = 1

#     # -------------------------------------------------
#     # CREATE TABLE
#     # -------------------------------------------------

#     def ensure_tables_exist(self):

#         try:
#             with db_manager.get_connection(self.db_name) as conn:
#                 with conn.cursor() as cur:

#                     cur.execute("""
#                     CREATE TABLE IF NOT EXISTS companies_yfinance (
#                         id INT AUTO_INCREMENT PRIMARY KEY,

#                         symbol VARCHAR(20) UNIQUE,
#                         name VARCHAR(255),

#                         sector VARCHAR(255),
#                         industry VARCHAR(255),
#                         exchange VARCHAR(50),
#                         currency VARCHAR(10),

#                         marketCap BIGINT,
#                         currentPrice DOUBLE,
#                         previousClose DOUBLE,

#                         changeValue DOUBLE,
#                         changePercent DOUBLE,

#                         volume BIGINT,

#                         high52Week DOUBLE,
#                         low52Week DOUBLE,

#                         beta DOUBLE,
#                         forwardPE DOUBLE,
#                         trailingPE DOUBLE,
#                         dividendYield DOUBLE,

#                         website TEXT,

#                         raw_json JSON,

#                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
#                     )
#                     """)

#                 conn.commit()

#             logger.info("✅ companies_yfinance table ready")

#         except Exception:
#             logger.exception("Table creation failed")

#     # -------------------------------------------------
#     # FETCH SYMBOLS
#     # -------------------------------------------------

#     def get_listed_symbols(self) -> List[str]:

#         try:
#             with db_manager.get_connection(self.db_name) as conn:
#                 with conn.cursor(pymysql.cursors.DictCursor) as cur:

#                     cur.execute("""
#                     SELECT symbol
#                     FROM listed_companies
#                     WHERE symbol IS NOT NULL
#                     LIMIT 10
#                     """)

#                     symbols = [row["symbol"] for row in cur.fetchall()]

#                     logger.info(f"Fetched {len(symbols)} symbols")

#                     return symbols

#         except Exception:
#             logger.exception("Failed to fetch symbols")
#             return []

#     # -------------------------------------------------
#     # FETCH COMPANY DATA
#     # -------------------------------------------------

#     def fetch_company_info(self, symbol: str) -> Optional[Dict]:

#         attempt = 0

#         while attempt < self.max_retries:

#             try:

#                 ticker = yf.Ticker(symbol)

#                 info = ticker.info
#                 fast = ticker.fast_info

#                 price = fast.get("last_price") or info.get("currentPrice")
#                 prev = info.get("previousClose")

#                 change = None
#                 change_pct = None

#                 if price and prev:
#                     change = round(price - prev, 4)
#                     change_pct = round((change / prev) * 100, 4)

#                 data = {

#                     "symbol": symbol,
#                     "name": info.get("longName") or info.get("shortName"),

#                     "sector": info.get("sector"),
#                     "industry": info.get("industry"),
#                     "exchange": info.get("exchange"),
#                     "currency": info.get("currency"),

#                     "marketCap": info.get("marketCap"),
#                     "currentPrice": price,
#                     "previousClose": prev,

#                     "changeValue": change,
#                     "changePercent": change_pct,

#                     "volume": info.get("volume"),

#                     "high52Week": info.get("fiftyTwoWeekHigh"),
#                     "low52Week": info.get("fiftyTwoWeekLow"),

#                     "beta": info.get("beta"),
#                     "forwardPE": info.get("forwardPE"),
#                     "trailingPE": info.get("trailingPE"),
#                     "dividendYield": info.get("dividendYield"),

#                     "website": info.get("website"),

#                     "raw_json": info
#                 }

#                 return data

#             except requests.exceptions.HTTPError as e:

#                 if e.response is not None and e.response.status_code == 429:

#                     wait = (2 ** attempt) + random.uniform(1, 2)

#                     logger.warning(f"429 rate limit for {symbol}. Retry in {wait}")

#                     time.sleep(wait)

#                     attempt += 1

#                 else:

#                     logger.warning(f"HTTP error for {symbol}: {e}")

#                     return None

#             except Exception as e:

#                 if "429" in str(e):

#                     wait = (2 ** attempt) + random.uniform(1, 2)

#                     logger.warning(f"429 detected for {symbol}. Retry in {wait}")

#                     time.sleep(wait)

#                     attempt += 1

#                 else:

#                     logger.warning(f"Failed to fetch {symbol}: {e}")

#                     return None

#         logger.error(f"Max retries exceeded for {symbol}")

#         return None

#     # -------------------------------------------------
#     # SAVE COMPANY DATA
#     # -------------------------------------------------

#     def save_company(self, cur, data: Dict):

#         sql = """
#         INSERT INTO companies_yfinance (

#             symbol,name,sector,industry,exchange,currency,

#             marketCap,currentPrice,previousClose,

#             changeValue,changePercent,volume,

#             high52Week,low52Week,

#             beta,forwardPE,trailingPE,dividendYield,

#             website,raw_json

#         )

#         VALUES (

#             %(symbol)s,%(name)s,%(sector)s,%(industry)s,%(exchange)s,%(currency)s,

#             %(marketCap)s,%(currentPrice)s,%(previousClose)s,

#             %(changeValue)s,%(changePercent)s,%(volume)s,

#             %(high52Week)s,%(low52Week)s,

#             %(beta)s,%(forwardPE)s,%(trailingPE)s,%(dividendYield)s,

#             %(website)s,%(raw_json)s

#         )

#         ON DUPLICATE KEY UPDATE

#             name=VALUES(name),
#             sector=VALUES(sector),
#             industry=VALUES(industry),
#             exchange=VALUES(exchange),
#             currency=VALUES(currency),

#             marketCap=VALUES(marketCap),
#             currentPrice=VALUES(currentPrice),
#             previousClose=VALUES(previousClose),

#             changeValue=VALUES(changeValue),
#             changePercent=VALUES(changePercent),

#             volume=VALUES(volume),

#             high52Week=VALUES(high52Week),
#             low52Week=VALUES(low52Week),

#             beta=VALUES(beta),
#             forwardPE=VALUES(forwardPE),
#             trailingPE=VALUES(trailingPE),

#             dividendYield=VALUES(dividendYield),

#             website=VALUES(website),
#             raw_json=VALUES(raw_json)
#         """

#         cur.execute(sql, {**data, "raw_json": json.dumps(data["raw_json"])})

#     # -------------------------------------------------
#     # MAIN PROCESS
#     # -------------------------------------------------

#     def fetch_and_save_all(self):

#         logger.info("Starting company profile refresh")

#         self.ensure_tables_exist()

#         symbols = self.get_listed_symbols()

#         if not symbols:
#             return {"saved": 0, "failed": 0, "data": []}

#         saved = 0
#         failed = 0
#         stored_data = []

#         try:

#             with db_manager.get_connection(self.db_name) as conn:

#                 with conn.cursor() as cur:

#                     for symbol in symbols:

#                         data = self.fetch_company_info(symbol)

#                         if not data:
#                             failed += 1
#                             continue

#                         self.save_company(cur, data)

#                         stored_data.append(data)

#                         saved += 1

#                         time.sleep(self.symbol_delay)

#                 conn.commit()

#             return {

#                 "total": len(symbols),
#                 "saved": saved,
#                 "failed": failed,
#                 "data": stored_data
#             }

#         except Exception:

#             logger.exception("Critical error")

#             return {

#                 "total": len(symbols),
#                 "saved": saved,
#                 "failed": failed,
#                 "data": stored_data
#             }


# company_profile_service = CompanyProfileService()

