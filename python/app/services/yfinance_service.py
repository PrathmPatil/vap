import pandas as pd
import requests
import io
import os
import time
import random
import logging
import math
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
# HELPERS
# --------------------------------------------------

def clean_value(value):
    """Convert NaN values to None for MySQL"""
    if value is None:
        return None

    if isinstance(value, float) and math.isnan(value):
        return None

    return value


# --------------------------------------------------
# REQUEST TRACKING
# --------------------------------------------------

REQUEST_COUNT = 0


# --------------------------------------------------
# SERVICE
# --------------------------------------------------

class YFINANCEService:

    def __init__(self):

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
        response.raise_for_status()

        df = pd.read_csv(io.StringIO(response.text))
        df.columns = df.columns.str.strip()

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        cursor.execute("SELECT symbol FROM listed_companies")
        existing = {row["symbol"] for row in cursor.fetchall()}

        inserted = 0

        for _, row in df.iterrows():

            symbol = row["SYMBOL"].strip() + ".NS"

            if symbol in existing:
                continue

            try:

                cursor.execute("""
                    INSERT INTO listed_companies
                    (symbol,name,series,date_of_listing,paid_up_value,market_lot,isin,face_value)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """, (

                    symbol,
                    clean_value(row["NAME OF COMPANY"]),
                    clean_value(row.get("SERIES")),
                    clean_value(pd.to_datetime(row.get("DATE OF LISTING"), errors="coerce")),
                    clean_value(pd.to_numeric(row.get("PAID UP VALUE"), errors="coerce")),
                    clean_value(pd.to_numeric(row.get("MARKET LOT"), errors="coerce")),
                    clean_value(row.get("ISIN NUMBER")),
                    clean_value(pd.to_numeric(row.get("FACE VALUE"), errors="coerce"))

                ))

                inserted += 1

            except Exception as e:

                logger.error(f"Insert error for {symbol}: {e}")

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

                time.sleep(random.uniform(2, 5))

                ticker = Ticker(symbol)

                fast = ticker.fast_info
                info = ticker.get_info()

                cp = fast.get("lastPrice")
                pc = fast.get("previousClose")

                if not cp or not pc:
                    raise ValueError("Missing price")

                return {

                    "symbol": symbol,
                    "name": clean_value(info.get("longName") or info.get("shortName")),
                    "sector": clean_value(info.get("sector")),
                    "industry": clean_value(info.get("industry")),
                    "currency": clean_value(info.get("currency", "INR")),
                    "exchange": clean_value(info.get("exchange")),
                    "marketCap": clean_value(info.get("marketCap")),
                    "currentPrice": clean_value(cp),
                    "previousClose": clean_value(pc),
                    "change": clean_value(round(cp - pc, 2)),
                    "changePercent": clean_value(round(((cp - pc) / pc) * 100, 2)),
                    "volume": clean_value(fast.get("lastVolume")),
                    "website": clean_value(info.get("website")),
                    "addedAt": datetime.now()

                }

            except Exception as e:

                logger.error(f"{symbol} error: {e}")

                wait = 10 * (attempt + 1)
                time.sleep(wait)

                if attempt == retry - 1:
                    return None


    # --------------------------------------------------
    # SAVE COMPANY INFO
    # --------------------------------------------------

    def save_company_info(self, data: dict):

        if not data:
            return

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

        except Exception as e:

            logger.error(f"DB save error: {e}")

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

        processed = 0

        for i in range(0, len(symbols), batch_size):

            batch = symbols[i:i + batch_size]

            logger.info(f"Processing batch {i//batch_size + 1}")

            for sym in batch:

                data = self.fetch_company_info(sym)

                if data:
                    self.save_company_info(data)
                    processed += 1

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