import yfinance as yf
from datetime import datetime
from typing import List, Dict, Optional
import pymysql
import logging

from app.database.connection import db_manager
from app.config import config

logger = logging.getLogger(__name__)


class CompanyProfileService:

    # -------------------------------------------------
    # ENSURE TABLE EXISTS
    # -------------------------------------------------
    def ensure_table_exists(self):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(50) UNIQUE,
                name VARCHAR(255),
                sector VARCHAR(255),
                industry VARCHAR(255),
                exchange VARCHAR(50),
                currency VARCHAR(20),
                marketCap BIGINT,
                currentPrice DECIMAL(15,2),
                previousClose DECIMAL(15,2),
                `change` DECIMAL(15,2),
                changePercent DECIMAL(10,2),
                volume BIGINT,
                website VARCHAR(255),
                addedAt DATETIME,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        cur.close()
        conn.close()

        logger.info("✅ Ensured companies table exists")

    # -------------------------------------------------
    # FETCH SYMBOLS
    # -------------------------------------------------
    def get_listed_symbols(self) -> List[str]:
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor(pymysql.cursors.DictCursor)

        cur.execute("""
            SELECT symbol
            FROM listed_companies
            WHERE symbol IS NOT NULL
        """)

        symbols = [row["symbol"] for row in cur.fetchall()]

        cur.close()
        conn.close()
        return symbols

    # -------------------------------------------------
    # FETCH FROM YFINANCE
    # -------------------------------------------------
    def fetch_company_info(self, symbol: str) -> Optional[Dict]:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            price = info.get("currentPrice")
            prev = info.get("previousClose")

            change = round(price - prev, 2) if price is not None and prev is not None else None
            change_pct = round((change / prev) * 100, 2) if prev and change is not None else None

            return {
                "symbol": symbol,
                "name": info.get("longName") or info.get("shortName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "exchange": info.get("exchange"),
                "currency": info.get("currency"),
                "marketCap": info.get("marketCap"),
                "currentPrice": price,
                "previousClose": prev,
                "change": change,
                "changePercent": change_pct,
                "volume": info.get("volume"),
                "website": info.get("website"),
                "addedAt": datetime.now()
            }

        except Exception as e:
            logger.warning(f"❌ Failed to fetch {symbol}: {e}")
            return None

    # -------------------------------------------------
    # FETCH & SAVE ALL (NO LIMIT)
    # -------------------------------------------------
    def fetch_and_save_all(self) -> int:
        logger.info("🔄 Starting company profile full refresh")

        self.ensure_table_exists()
        symbols = self.get_listed_symbols()

        if not symbols:
            logger.warning("⚠ No listed symbols found")
            return 0

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

        saved = 0
        failed = 0

        try:
            for idx, symbol in enumerate(symbols, start=1):
                data = self.fetch_company_info(symbol)

                if not data:
                    failed += 1
                    continue

                cur.execute("""
                    INSERT INTO companies (
                        symbol, name, sector, industry, exchange, currency,
                        marketCap, currentPrice, previousClose,
                        `change`, changePercent, volume,
                        website, addedAt
                    ) VALUES (
                        %(symbol)s, %(name)s, %(sector)s, %(industry)s, %(exchange)s, %(currency)s,
                        %(marketCap)s, %(currentPrice)s, %(previousClose)s,
                        %(change)s, %(changePercent)s, %(volume)s,
                        %(website)s, %(addedAt)s
                    )
                    ON DUPLICATE KEY UPDATE
                        name=VALUES(name),
                        sector=VALUES(sector),
                        industry=VALUES(industry),
                        exchange=VALUES(exchange),
                        currency=VALUES(currency),
                        marketCap=VALUES(marketCap),
                        currentPrice=VALUES(currentPrice),
                        previousClose=VALUES(previousClose),
                        `change`=VALUES(`change`),
                        changePercent=VALUES(changePercent),
                        volume=VALUES(volume),
                        website=VALUES(website),
                        addedAt=VALUES(addedAt)
                """, data)

                saved += 1

                if idx % 50 == 0:
                    logger.info(f"⏳ Progress: {idx}/{len(symbols)} processed")

            conn.commit()
            logger.info(
                f"✅ Company profile CRON completed | Total={len(symbols)} | Saved={saved} | Failed={failed}"
            )
            return saved

        except Exception:
            conn.rollback()
            logger.exception("❌ Error during company profile refresh")
            raise
        finally:
            cur.close()
            conn.close()


company_profile_service = CompanyProfileService()
