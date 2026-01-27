import time
import logging
import pandas as pd
import yfinance as yf
import pymysql
from datetime import datetime
from typing import Dict, Any

from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class NSEService:

    # -------------------- CORE FETCH (YOUR WORKING LOGIC) --------------------
    def fetch_symbol_with_retry(self, symbol: str, period: str) -> Dict[str, Any]:
        clean_symbol = symbol.upper().replace(".NS", "").replace(".BO", "")

        formats_to_try = [
            clean_symbol,
            f"{clean_symbol}.NS",
            f"{clean_symbol}.BO",
            f"{clean_symbol}.NSE"
        ]

        for sym_format in formats_to_try:
            try:
                logger.info(f"Trying: {sym_format}")
                ticker = yf.Ticker(sym_format)
                df = ticker.history(period=period)

                if not df.empty:
                    return {
                        "status": "success",
                        "used_symbol": sym_format,
                        "df": df
                    }

            except Exception as e:
                logger.warning(f"Failed with {sym_format}: {e}")
                time.sleep(1)

        return {
            "status": "failed",
            "reason": "Could not fetch data with any symbol format",
            "tried_formats": formats_to_try
        }

    # -------------------- SAVE TO DB --------------------
    def save_to_db(self, symbol: str, used_symbol: str, df: pd.DataFrame):
        df = df.reset_index()

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor(pymysql.cursors.DictCursor)

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

        records = [
            (
                used_symbol,
                r["Date"].date(),
                float(r["Open"]),
                float(r["High"]),
                float(r["Low"]),
                float(r["Close"]),
                int(r["Volume"]),
                float(r["Dividends"]),
                float(r["Stock Splits"]),
            )
            for _, r in df.iterrows()
        ]

        cur.executemany(query, records)
        conn.commit()
        cur.close()
        conn.close()

    # -------------------- SINGLE PUBLIC METHOD --------------------
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
            self.save_to_db(symbol, used_symbol, df)

        return {
            "status": "success",
            "symbol": used_symbol,
            "rows": len(df),
            "data": df.reset_index().to_dict("records"),
            "columns": list(df.columns)
        }

    # -------------------- FETCH ALL LISTED --------------------
    def fetch_all_listed(self, period="1mo", limit=None):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor(pymysql.cursors.DictCursor)

        query = "SELECT symbol FROM listed_companies"
        if limit:
            query += f" LIMIT {limit}"

        cur.execute(query)
        symbols = [r["symbol"] for r in cur.fetchall()]
        cur.close()
        conn.close()

        success, failed = 0, 0

        for sym in symbols:
            res = self.fetch_single_symbol(sym, period, True)
            if res["status"] == "success":
                success += 1
            else:
                failed += 1

        return {
            "status": "completed",
            "total": len(symbols),
            "success": success,
            "failed": failed
        }

    # -------------------- FAILED SYMBOLS --------------------
    def save_failed_symbol(self, symbol: str, reason: str):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

        cur.execute(
            "INSERT INTO failed_symbols (symbol, reason) VALUES (%s,%s)",
            (symbol, reason)
        )

        conn.commit()
        cur.close()
        conn.close()


nse_service = NSEService()
