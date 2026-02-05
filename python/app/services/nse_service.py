import time
import logging
import pandas as pd
import yfinance as yf
import pymysql
from typing import Dict, Any

from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class NSEService:
    """
    NSE / YFinance data fetch and persistence service
    Fully self-contained
    All errors handled
    """

    # ----------------------------------------------------
    # TABLE SAFETY
    # ----------------------------------------------------
    def ensure_tables_exist(self):
        """
        Ensures required tables exist before any operation
        """
        conn = None
        cur = None
        try:
            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cur = conn.cursor()

            # Main data table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS all_companies_data (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    symbol VARCHAR(20) NOT NULL,
                    date DATE NOT NULL,
                    open DOUBLE,
                    high DOUBLE,
                    low DOUBLE,
                    close DOUBLE,
                    volume BIGINT,
                    dividends DOUBLE,
                    stock_splits DOUBLE,
                    UNIQUE KEY uk_symbol_date (symbol, date)
                )
            """)

            # Failed symbols table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS failed_symbols (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    symbol VARCHAR(20),
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            conn.commit()
            logger.info("✅ Required tables verified/created")

        except Exception as e:
            logger.error(f"❌ Table creation failed: {e}", exc_info=True)
        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()

    # ----------------------------------------------------
    # CORE FETCH LOGIC
    # ----------------------------------------------------
    def fetch_symbol_with_retry(self, symbol: str, period: str) -> Dict[str, Any]:
        """
        Try multiple NSE/BSE formats with retry
        """
        clean_symbol = symbol.upper().replace(".NS", "").replace(".BO", "")

        formats_to_try = [
            clean_symbol,
            f"{clean_symbol}.NS",
            f"{clean_symbol}.BO",
            f"{clean_symbol}.NSE"
        ]

        for sym_format in formats_to_try:
            try:
                logger.info(f"🔄 Trying symbol format: {sym_format}")
                ticker = yf.Ticker(sym_format)
                df = ticker.history(period=period)

                if not df.empty:
                    return {
                        "status": "success",
                        "used_symbol": sym_format,
                        "df": df
                    }

            except Exception as e:
                logger.warning(f"⚠️ Failed {sym_format}: {e}")
                time.sleep(1)

        return {
            "status": "failed",
            "reason": "Unable to fetch data using any symbol format",
            "tried_formats": formats_to_try
        }

    # ----------------------------------------------------
    # SAVE DATA
    # ----------------------------------------------------
    def save_to_db(self, used_symbol: str, df: pd.DataFrame):
        """
        Save fetched dataframe into DB with logging
        """
        self.ensure_tables_exist()

        conn = None
        cur = None

        try:
            df = df.reset_index()

            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cur = conn.cursor()

            query = """
                INSERT INTO all_companies_data
                (symbol, date, open, high, low, close, volume, dividends, stock_splits)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    open=VALUES(open),
                    high=VALUES(high),
                    low=VALUES(low),
                    close=VALUES(close),
                    volume=VALUES(volume),
                    dividends=VALUES(dividends),
                    stock_splits=VALUES(stock_splits)
            """

            records = []
            for _, r in df.iterrows():
                try:
                    records.append((
                        used_symbol,
                        r["Date"].date(),
                        float(r["Open"]),
                        float(r["High"]),
                        float(r["Low"]),
                        float(r["Close"]),
                        int(r["Volume"]),
                        float(r["Dividends"]),
                        float(r["Stock Splits"]),
                    ))
                except Exception as row_err:
                    logger.warning(f"Skipping bad row for {used_symbol}: {row_err}")

            if records:
                cur.executemany(query, records)
                conn.commit()
                logger.info(f"📥 Inserted {len(records)} rows for {used_symbol}")
            else:
                logger.warning(f"⚠️ No valid rows to insert for {used_symbol}")

        except Exception as e:
            logger.error(f"❌ DB insert failed for {used_symbol}: {e}", exc_info=True)

        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()

    # ----------------------------------------------------
    # FAILED SYMBOL LOG
    # ----------------------------------------------------
    def save_failed_symbol(self, symbol: str, reason: str):
        """
        Save failed symbols with reason
        """
        self.ensure_tables_exist()

        conn = None
        cur = None
        try:
            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cur = conn.cursor()

            cur.execute(
                "INSERT INTO failed_symbols (symbol, reason) VALUES (%s,%s)",
                (symbol, reason)
            )

            conn.commit()
            logger.info(f"❌ Saved failed symbol: {symbol}")

        except Exception as e:
            logger.error(f"Failed to log failed symbol {symbol}: {e}", exc_info=True)
        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()

    # ----------------------------------------------------
    # SINGLE SYMBOL API
    # ----------------------------------------------------
    def fetch_single_symbol(
        self,
        symbol: str,
        period: str = "1mo",
        save_to_db: bool = False
    ) -> Dict[str, Any]:

        result = self.fetch_symbol_with_retry(symbol, period)

        if result["status"] == "failed":
            self.save_failed_symbol(symbol, result.get("reason"))
            return result

        df = result["df"]
        used_symbol = result["used_symbol"]

        if save_to_db:
            self.save_to_db(used_symbol, df)

        return {
            "status": "success",
            "symbol": used_symbol,
            "rows": len(df)
        }

    # ----------------------------------------------------
    # FETCH ALL LISTED SYMBOLS
    # ----------------------------------------------------
    def fetch_all_listed(self, period="1y", limit=None):
        """
        Fetch and save data for all listed companies
        """
        self.ensure_tables_exist()

        conn = None
        cur = None

        try:
            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cur = conn.cursor(pymysql.cursors.DictCursor)

            query = "SELECT symbol FROM listed_companies"
            if limit:
                query += f" LIMIT {limit}"

            cur.execute(query)
            symbols = [r["symbol"] for r in cur.fetchall()]

        except Exception as e:
            logger.error(f"❌ Failed to load symbols: {e}", exc_info=True)
            return {"status": "failed"}

        finally:
            if cur:
                cur.close()
            if conn:
                conn.close()

        success, failed = 0, 0
        logger.info(f"📊 Processing {len(symbols)} symbols")

        for sym in symbols:
            try:
                res = self.fetch_single_symbol(sym, period, True)
                if res["status"] == "success":
                    success += 1
                else:
                    failed += 1
            except Exception as e:
                failed += 1
                logger.error(f"Unhandled error for {sym}: {e}", exc_info=True)

        logger.info(
            f"🏁 Fetch completed | Total: {len(symbols)} | "
            f"Success: {success} | Failed: {failed}"
        )

        return {
            "status": "completed",
            "total": len(symbols),
            "success": success,
            "failed": failed
        }


# ----------------------------------------------------
# SERVICE INSTANCE
# ----------------------------------------------------
nse_service = NSEService()
