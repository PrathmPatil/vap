# app/services/yfinance_service.py

import pandas as pd
import yfinance as yf
import requests
import io
import time
import random
from datetime import datetime
from yfinance import Ticker
import pymysql

from app.config import config
from app.database.connection import db_manager


class YFINANCEService:
    """
    ✔ Lazy initialized
    ✔ DB-safe
    ✔ Import-safe
    ✔ Startup-safe
    """

    def init(self):
        """Called explicitly during FastAPI startup"""
        self.create_tables()

    # --------------------------------------------------
    # TABLES
    # --------------------------------------------------
    def create_tables(self):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

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
                website VARCHAR(255),
                addedAt DATETIME
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_price_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20),
                recordDate DATE,
                open FLOAT,
                high FLOAT,
                low FLOAT,
                close FLOAT,
                volume BIGINT,
                createdAt DATETIME,
                UNIQUE KEY unique_record (symbol, recordDate)
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
        cursor.close()
        conn.close()

    # --------------------------------------------------
    # NSE SYMBOLS
    # --------------------------------------------------
    def get_indian_tickers(self):
        try:
            url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
            headers = {"User-Agent": "Mozilla/5.0"}
            res = requests.get(url, headers=headers, timeout=30)
            res.raise_for_status()

            df = pd.read_csv(io.StringIO(res.text))
            return [f"{s.strip()}.NS" for s in df["SYMBOL"].tolist()]
        except Exception as e:
            print(f"❌ NSE fetch error: {e}")
            return []

    def sync_new_listed_companies(self):
        """
        Daily sync:
        - Fetch NSE CSV
        - Insert only NEW symbols
        """
        self.create_tables()  # ✅ safety: auto-create tables

        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0"}

        res = requests.get(url, headers=headers, timeout=30)
        res.raise_for_status()

        df = pd.read_csv(io.StringIO(res.text))
        df.columns = df.columns.str.strip()

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # 🔹 Fetch existing symbols
        cursor.execute("SELECT symbol FROM listed_companies")
        existing = {row["symbol"] for row in cursor.fetchall()}

        inserted = 0

        for _, row in df.iterrows():
            symbol = row["SYMBOL"].strip() + ".NS"

            if symbol in existing:
                continue  # ⛔ skip existing

            cursor.execute("""
                INSERT INTO listed_companies
                (symbol, name, series, date_of_listing, paid_up_value,
                market_lot, isin, face_value)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                symbol,
                row["NAME OF COMPANY"].strip(),
                row.get("SERIES"),
                pd.to_datetime(row.get("DATE OF LISTING"), errors="coerce"),
                pd.to_numeric(row.get("PAID UP VALUE"), errors="coerce"),
                pd.to_numeric(row.get("MARKET LOT"), errors="coerce"),
                row.get("ISIN NUMBER"),
                pd.to_numeric(row.get("FACE VALUE"), errors="coerce"),
            ))

            inserted += 1

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "checked_at": datetime.now().isoformat(),
            "new_companies_added": inserted
        }



    # --------------------------------------------------
    # COMPANY INFO
    # --------------------------------------------------
    def fetch_company_info(self, symbol: str, retry=3):
        for attempt in range(retry):
            try:
                time.sleep(random.uniform(1.2, 2.5))

                ticker = Ticker(symbol)
                fast = ticker.fast_info
                info = ticker.get_info()

                cp = fast.get("lastPrice")
                pc = fast.get("previousClose")

                if not cp or not pc:
                    raise ValueError("Price missing")

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
                if attempt < retry - 1:
                    time.sleep(5 * (attempt + 1))
                    continue
                print(f"❌ {symbol} failed: {e}")
                return None

    # --------------------------------------------------
    # SAVE COMPANY
    # --------------------------------------------------
    def save_company_info(self, data: dict):
        if not data:
            return

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO companies
            (symbol, name, sector, industry, currency, exchange, marketCap,
             currentPrice, previousClose, `change`, changePercent, volume, website, addedAt)
            VALUES
            (%(symbol)s, %(name)s, %(sector)s, %(industry)s, %(currency)s, %(exchange)s, %(marketCap)s,
             %(currentPrice)s, %(previousClose)s, %(change)s, %(changePercent)s, %(volume)s, %(website)s, %(addedAt)s)
            ON DUPLICATE KEY UPDATE
                name=VALUES(name),
                sector=VALUES(sector),
                currentPrice=VALUES(currentPrice),
                `change`=VALUES(`change`),
                changePercent=VALUES(changePercent),
                volume=VALUES(volume),
                addedAt=VALUES(addedAt)
        """, data)

        conn.commit()
        cursor.close()
        conn.close()

    # --------------------------------------------------
    # BULK INGEST
    # --------------------------------------------------
    def fetch_and_store_listed_companies(self, limit=50, batch_size=5):
        symbols = self.get_indian_tickers()[:limit]

        for i in range(0, len(symbols), batch_size):
            for sym in symbols[i:i + batch_size]:
                data = self.fetch_company_info(sym)
                if data:
                    self.save_company_info(data)
            time.sleep(8)

        return {"status": "completed", "processed": len(symbols)}


# --------------------------------------------------
# ✅ LAZY SINGLETON (CRITICAL FIX)
# --------------------------------------------------
_yfinance_service: YFINANCEService | None = None


def get_yfinance_service() -> YFINANCEService:
    global _yfinance_service
    if _yfinance_service is None:
        _yfinance_service = YFINANCEService()
    return _yfinance_service
