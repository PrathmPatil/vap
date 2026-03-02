import time
import logging
import math
import random
import pymysql
import yfinance as yf

from app.database.connection import db_manager
from app.config import config

logger = logging.getLogger(__name__)


class CompanyService:

    def __init__(self):
        self.symbol_delay = 1.8      # SAFE delay
        self.batch_size = 50
        self.max_retries = 5
        logger.info("✅ CompanyService initialized")

    # ================= SAFE FLOAT =================
    def safe_float(self, value):
        try:
            if value is None:
                return None
            value = float(value)
            if math.isnan(value) or math.isinf(value):
                return None
            return value
        except Exception:
            return None

    # ================= SAFE BIGINT =================
    def safe_bigint(self, value):
        try:
            if value is None:
                return None
            value = int(value)
            if value > 9223372036854775807:
                return None
            return value
        except Exception:
            return None

    # ================= CREATE TABLE =================
    def create_table_if_not_exists(self):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            symbol VARCHAR(20) NOT NULL UNIQUE,
            marketCap BIGINT NULL,
            currentPrice DECIMAL(15,4) NULL,
            previousClose DECIMAL(15,4) NULL,
            `change` DECIMAL(15,4) NULL,
            changePercent DECIMAL(10,4) NULL,
            volume BIGINT NULL,
            high52Week DECIMAL(15,4) NULL,
            low52Week DECIMAL(15,4) NULL,
            beta DECIMAL(10,4) NULL,
            dividendYield DECIMAL(10,6) NULL,
            forwardPE DECIMAL(10,4) NULL,
            trailingPE DECIMAL(10,4) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_symbol (symbol)
        );
        """)

        conn.commit()
        cur.close()
        conn.close()
        logger.info("✅ Companies table ready")

    # ================= GET SYMBOLS =================
    def get_symbols(self, limit=None):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor(pymysql.cursors.DictCursor)

        query = "SELECT symbol FROM listed_companies WHERE symbol IS NOT NULL"

        if limit:
            query += " LIMIT %s"
            cur.execute(query, (limit,))
        else:
            cur.execute(query)

        symbols = [row["symbol"] for row in cur.fetchall()]

        cur.close()
        conn.close()

        logger.info(f"📌 Total symbols fetched: {len(symbols)}")
        return symbols

    # ================= FETCH INFO WITH RETRY =================
    def fetch_company_info(self, symbol):

        for attempt in range(self.max_retries):
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info

                if not info:
                    return None

                return {
                    "symbol": symbol,
                    "marketCap": self.safe_bigint(info.get("marketCap")),
                    "currentPrice": self.safe_float(info.get("currentPrice")),
                    "previousClose": self.safe_float(info.get("previousClose")),
                    "change": self.safe_float(info.get("regularMarketChange")),
                    "changePercent": self.safe_float(info.get("regularMarketChangePercent")),
                    "volume": self.safe_bigint(info.get("volume")),
                    "high52Week": self.safe_float(info.get("fiftyTwoWeekHigh")),
                    "low52Week": self.safe_float(info.get("fiftyTwoWeekLow")),
                    "beta": self.safe_float(info.get("beta")),
                    "dividendYield": self.safe_float(info.get("dividendYield")),
                    "forwardPE": self.safe_float(info.get("forwardPE")),
                    "trailingPE": self.safe_float(info.get("trailingPE")),
                }

            except Exception as e:
                error_msg = str(e)

                # Handle 429 Rate Limit
                if "429" in error_msg or "Too Many Requests" in error_msg:
                    wait_time = 2 ** attempt
                    logger.warning(
                        f"⚠ {symbol} Rate Limited. Waiting {wait_time}s (attempt {attempt+1})"
                    )
                    time.sleep(wait_time)
                    continue

                logger.warning(f"⚠ Fetch failed for {symbol}: {e}")
                return None

        logger.error(f"❌ Failed after retries: {symbol}")
        return None

    # ================= SAVE =================
    def save_company(self, cur, data):

        sql = """
        INSERT INTO companies (
            symbol, marketCap, currentPrice, previousClose,
            `change`, changePercent, volume,
            high52Week, low52Week, beta,
            dividendYield, forwardPE, trailingPE
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
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
            trailingPE=VALUES(trailingPE)
        """

        values = tuple(data.values())
        cur.execute(sql, values)

    # ================= MAIN CRON =================
    def fetch_and_save_all(self, limit=None):

        logger.info("🔥 CRON JOB STARTED")

        try:
            self.create_table_if_not_exists()
            symbols = self.get_symbols(limit)

            if not symbols:
                logger.warning("No symbols found.")
                return

            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cur = conn.cursor()

            saved = 0
            failed = 0
            batch_counter = 0

            for idx, symbol in enumerate(symbols, start=1):

                data = self.fetch_company_info(symbol)

                if not data:
                    failed += 1
                    continue

                try:
                    self.save_company(cur, data)
                    saved += 1
                    batch_counter += 1

                    if batch_counter >= self.batch_size:
                        conn.commit()
                        batch_counter = 0

                except Exception as e:
                    conn.rollback()
                    logger.warning(f"❌ DB save failed for {symbol}: {e}")
                    failed += 1
                    continue

                # 🔥 Randomized delay (anti-bot safe)
                sleep_time = self.symbol_delay + random.uniform(0.2, 0.7)
                time.sleep(sleep_time)

                if idx % 50 == 0:
                    logger.info(
                        f"Progress: {idx}/{len(symbols)} | Saved={saved} | Failed={failed}"
                    )

            conn.commit()
            cur.close()
            conn.close()

            logger.info(
                f"✅ COMPLETED | Total={len(symbols)} | Saved={saved} | Failed={failed}"
            )

        except Exception:
            logger.exception("❌ CRON JOB FAILED")

        logger.info("🔥 CRON JOB FINISHED")


# Singleton
company_service = CompanyService()