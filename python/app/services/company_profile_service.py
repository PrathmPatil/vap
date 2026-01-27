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

            if price is not None and prev is not None:
                change = round(price - prev, 2)
                change_pct = round((change / prev) * 100, 2) if prev != 0 else None
            else:
                change = None
                change_pct = None

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
    # SAVE (UPSERT)
    # -------------------------------------------------
    def save_company(self, data: Dict):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

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

        conn.commit()
        cur.close()
        conn.close()

    # -------------------------------------------------
    # FETCH & SAVE ALL
    # -------------------------------------------------
    def fetch_and_save_all(self):
        symbols = self.get_listed_symbols()

        success, failed = 0, 0

        for symbol in symbols:
            data = self.fetch_company_info(symbol)
            if data:
                self.save_company(data)
                success += 1
            else:
                failed += 1

        return {
            "status": "completed",
            "total": len(symbols),
            "success": success,
            "failed": failed
        }


company_profile_service = CompanyProfileService()
