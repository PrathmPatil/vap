import pandas as pd
import requests
import io
import os
import time
import random
import logging
from datetime import datetime
from yfinance import Ticker
import pymysql

from app.config import config
from app.database.connection import db_manager


# --------------------------------------------------
# LOGGER CONFIG
# --------------------------------------------------
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("yfinance_service")
logger.setLevel(logging.INFO)

file_handler = logging.FileHandler("logs/yfinance.log")
file_handler.setLevel(logging.INFO)

formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)

file_handler.setFormatter(formatter)

logger.addHandler(file_handler)


# --------------------------------------------------
# REQUEST TRACKING
# --------------------------------------------------
REQUEST_COUNT = 0
REQUEST_START_TIME = time.time()


# --------------------------------------------------
# SERVICE
# --------------------------------------------------
class YFINANCEService:

    def init(self):
        logger.info("Initializing YFinance Service")
        self.create_tables()

    # --------------------------------------------------
    # CREATE TABLES
    # --------------------------------------------------
    def create_tables(self):

        logger.info("Creating database tables if not exist")

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        try:

            logger.info("Creating table: companies")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    symbol VARCHAR(20) UNIQUE,
                    name VARCHAR(255),
                    sector VARCHAR(255),
                    industry VARCHAR(255),
                    currency VARCHAR(10),
                    exchange VARCHAR(50),
                    marketCap BIGINT,
                    currentPrice FLOAT,
                    previousClose FLOAT,
                    `change` FLOAT,
                    changePercent FLOAT,
                    volume BIGINT,
                    high52Week FLOAT,
                    low52Week FLOAT,
                    beta FLOAT,
                    dividendYield FLOAT,
                    forwardPE FLOAT,
                    trailingPE FLOAT,
                    website VARCHAR(255),
                    addedAt DATETIME
                )
            """)

            logger.info("Creating table: listed_companies")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS listed_companies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    symbol VARCHAR(20) UNIQUE,
                    name VARCHAR(255),
                    series VARCHAR(10),
                    date_of_listing DATE,
                    paid_up_value INT,
                    market_lot INT,
                    isin VARCHAR(20),
                    face_value INT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()

            logger.info("Tables created successfully")

        except Exception as e:

            logger.error(f"Table creation error: {e}")

        finally:

            cursor.close()
            conn.close()

    # --------------------------------------------------
    # FETCH NSE SYMBOLS
    # --------------------------------------------------
    def get_indian_tickers(self):

        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"

        logger.info("Fetching NSE listed companies CSV")

        try:

            headers = {"User-Agent": "Mozilla/5.0"}

            response = requests.get(url, headers=headers, timeout=30)

            logger.info(f"NSE CSV Response Status: {response.status_code}")

            response.raise_for_status()

            df = pd.read_csv(io.StringIO(response.text))

            symbols = [f"{s.strip()}.NS" for s in df["SYMBOL"].tolist()]

            logger.info(f"Total symbols fetched: {len(symbols)}")

            return symbols

        except Exception as e:

            logger.error(f"NSE fetch error: {e}")
            return []

    # --------------------------------------------------
    # SYNC NEW LISTED COMPANIES
    # --------------------------------------------------
    def sync_new_listed_companies(self):

        logger.info("Starting NSE company sync")

        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0"}

        response = requests.get(url, headers=headers, timeout=30)

        logger.info(f"NSE CSV Status: {response.status_code}")

        response.raise_for_status()

        df = pd.read_csv(io.StringIO(response.text))
        df.columns = df.columns.str.strip()

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        cursor.execute("SELECT symbol FROM listed_companies")

        existing = {row["symbol"] for row in cursor.fetchall()}

        logger.info(f"Existing companies in DB: {len(existing)}")

        inserted = 0

        for _, row in df.iterrows():

            symbol = row["SYMBOL"].strip() + ".NS"

            if symbol in existing:
                continue

            logger.info(f"Inserting new company: {symbol}")

            cursor.execute("""
                INSERT INTO listed_companies
                (symbol,name,series,date_of_listing,paid_up_value,market_lot,isin,face_value)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                symbol,
                row["NAME OF COMPANY"],
                row.get("SERIES"),
                pd.to_datetime(row.get("DATE OF LISTING"), errors="coerce"),
                pd.to_numeric(row.get("PAID UP VALUE"), errors="coerce"),
                pd.to_numeric(row.get("MARKET LOT"), errors="coerce"),
                row.get("ISIN NUMBER"),
                pd.to_numeric(row.get("FACE VALUE"), errors="coerce")
            ))

            inserted += 1

        conn.commit()

        cursor.close()
        conn.close()

        logger.info(f"Inserted {inserted} new companies")

        return {
            "checked_at": datetime.now().isoformat(),
            "new_companies_added": inserted
        }

    # --------------------------------------------------
    # FETCH COMPANY INFO
    # --------------------------------------------------
    def fetch_company_info(self, symbol: str, retry=3):

        global REQUEST_COUNT

        logger.info(f"[START] Fetching {symbol}")

        for attempt in range(retry):

            try:

                REQUEST_COUNT += 1

                logger.info(f"{symbol} | Attempt {attempt+1}")
                logger.info(f"Total API Requests: {REQUEST_COUNT}")

                sleep_time = random.uniform(2, 5)

                logger.info(f"{symbol} | Sleeping {sleep_time:.2f}s")

                time.sleep(sleep_time)

                ticker = Ticker(symbol)

                logger.info(f"{symbol} | Fetching fast_info")

                fast = ticker.fast_info

                logger.info(f"{symbol} | Fetching full info")

                info = ticker.get_info()

                cp = fast.get("lastPrice")
                pc = fast.get("previousClose")

                logger.info(f"{symbol} | Price={cp} PrevClose={pc}")

                if not cp or not pc:
                    raise ValueError("Missing price")

                logger.info(f"{symbol} | Fetch successful")

                return {
                    "symbol": symbol,
                    "name": info.get("longName") or info.get("shortName"),
                    "sector": info.get("sector"),
                    "industry": info.get("industry"),
                    "currency": info.get("currency", "INR"),
                    "exchange": info.get("exchange"),
                    "marketCap": info.get("marketCap"),
                    "currentPrice": cp,
                    "previousClose": pc,
                    "change": round(cp - pc, 2),
                    "changePercent": round(((cp - pc) / pc) * 100, 2),
                    "volume": fast.get("lastVolume"),
                    "website": info.get("website"),
                    "addedAt": datetime.now()
                }

            except Exception as e:

                error_text = str(e)

                logger.error(f"{symbol} | Error: {error_text}")

                if "429" in error_text:

                    wait = 60 * (attempt + 1)

                    logger.warning(
                        f"{symbol} | RATE LIMITED (429). Waiting {wait}s"
                    )

                    time.sleep(wait)

                else:

                    wait = 10 * (attempt + 1)

                    logger.warning(
                        f"{symbol} | Retry in {wait}s"
                    )

                    time.sleep(wait)

                if attempt == retry - 1:

                    logger.error(f"{symbol} | FAILED after {retry} attempts")

                    return None

    # --------------------------------------------------
    # SAVE COMPANY INFO
    # --------------------------------------------------
    def save_company_info(self, data: dict):

        if not data:
            return

        symbol = data["symbol"]

        logger.info(f"Saving company: {symbol}")

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        try:

            cursor.execute("""
                INSERT INTO companies
                (symbol,name,sector,industry,currency,exchange,marketCap,
                currentPrice,previousClose,`change`,changePercent,volume,website,addedAt)
                VALUES
                (%(symbol)s,%(name)s,%(sector)s,%(industry)s,%(currency)s,%(exchange)s,%(marketCap)s,
                %(currentPrice)s,%(previousClose)s,%(change)s,%(changePercent)s,%(volume)s,%(website)s,%(addedAt)s)
                ON DUPLICATE KEY UPDATE
                currentPrice=VALUES(currentPrice),
                changePercent=VALUES(changePercent),
                volume=VALUES(volume),
                addedAt=VALUES(addedAt)
            """, data)

            conn.commit()

            logger.info(f"{symbol} saved successfully")

        except Exception as e:

            logger.error(f"DB save error {symbol}: {e}")

        finally:

            cursor.close()
            conn.close()

    # --------------------------------------------------
    # BULK FETCH
    # --------------------------------------------------
    def fetch_and_store_listed_companies(self, batch_size=5):

        logger.info("Starting bulk stock ingestion")

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        cursor.execute("SELECT symbol FROM listed_companies")

        symbols = [row["symbol"] for row in cursor.fetchall()]

        logger.info(f"Total symbols: {len(symbols)}")

        processed = 0

        for i in range(0, len(symbols), batch_size):

            batch = symbols[i:i + batch_size]

            logger.info(f"Processing batch {i//batch_size + 1}")
            logger.info(f"Batch symbols: {batch}")

            for sym in batch:

                data = self.fetch_company_info(sym)

                if data:
                    self.save_company_info(data)
                    processed += 1

            logger.info("Sleeping 15s before next batch")

            time.sleep(15)

        logger.info(f"Finished ingestion. Processed: {processed}")

        return {"processed": processed}


# --------------------------------------------------
# LAZY SINGLETON
# --------------------------------------------------
_yfinance_service: YFINANCEService | None = None


def get_yfinance_service() -> YFINANCEService:

    global _yfinance_service

    if _yfinance_service is None:

        logger.info("Creating YFinance Service instance")

        _yfinance_service = YFINANCEService()

    return _yfinance_service