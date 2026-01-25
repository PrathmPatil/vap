import time
import random
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple
from fastapi import APIRouter, Query, HTTPException
import pandas as pd
import pymysql
import yfinance as yf
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class NSEService:
    def __init__(self):
        db_manager.ensure_database(config.DB_STOCK_MARKET)
        self._setup_session()
        self._create_tables()

    # -------------------- HTTP SESSION --------------------
    def _setup_session(self):
        self.session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=1.2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("https://", adapter)
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        })

    # -------------------- TABLES --------------------
    def _create_tables(self):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS all_companies_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            symbol VARCHAR(20),
            date DATE,
            open FLOAT,
            high FLOAT,
            low FLOAT,
            close FLOAT,
            adj_close FLOAT,
            volume BIGINT,
            dividends FLOAT,
            stock_splits FLOAT,
            UNIQUE KEY uq_symbol_date (symbol, date)
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS failed_symbols (
            id INT AUTO_INCREMENT PRIMARY KEY,
            symbol VARCHAR(20),
            error_message TEXT,
            retry_count INT DEFAULT 0,
            last_retry TIMESTAMP NULL,
            failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS symbol_metadata (
            symbol VARCHAR(20) PRIMARY KEY,
            last_fetched DATE,
            data_points INT DEFAULT 0,
            status ENUM('active','failed','pending') DEFAULT 'pending'
        )
        """)

        conn.commit()
        cur.close()
        conn.close()

    # -------------------- UTILS --------------------
    def _safe_float(self, v): 
        return float(v) if pd.notna(v) else 0.0

    def _safe_int(self, v): 
        return int(v) if pd.notna(v) else 0

    def _resolve_formats(self, symbol: str) -> List[str]:
        base = symbol.upper().replace(".NS", "").replace(".BO", "")
        return [f"{base}.NS", f"{base}.BO", base]

    # -------------------- FETCH YAHOO --------------------
    def fetch_symbol_data(self, symbol: str, period: str) -> Tuple[bool, pd.DataFrame, str]:
        for fmt in self._resolve_formats(symbol):
            try:
                time.sleep(random.uniform(0.5, 1.2))
                df = yf.Ticker(fmt, session=self.session).history(
                    period=period, interval="1d", auto_adjust=False
                )
                if not df.empty:
                    return True, df, fmt
            except Exception as e:
                logger.warning(f"{fmt} failed: {e}")
        return False, pd.DataFrame(), "Yahoo empty"

    # -------------------- SAVE --------------------
    def save_symbol_data(self, symbol: str, df: pd.DataFrame, used: str) -> Dict[str, Any]:
        df = df.copy()

        if isinstance(df.index, pd.DatetimeIndex):
            df.reset_index(inplace=True)

        df.rename(columns={df.columns[0]: "Date"}, inplace=True)
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df.dropna(subset=["Date"], inplace=True)

        exchange = used.split(".")[-1].lower() if "." in used else "global"
        table = "all_companies_data" if exchange == "ns" else f"company_price_{exchange}"
        clean = symbol.upper().replace(".NS", "").replace(".BO", "")

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor()

        if table != "all_companies_data":
            cur.execute(f"""
            CREATE TABLE IF NOT EXISTS `{table}` LIKE all_companies_data
            """)

        records = []
        for _, r in df.iterrows():
            records.append((
                clean,
                r["Date"].date(),
                self._safe_float(r.get("Open")),
                self._safe_float(r.get("High")),
                self._safe_float(r.get("Low")),
                self._safe_float(r.get("Close")),
                self._safe_float(r.get("Adj Close", r.get("Close"))),
                self._safe_int(r.get("Volume")),
                self._safe_float(r.get("Dividends")),
                self._safe_float(r.get("Stock Splits"))
            ))

        cur.executemany(f"""
        INSERT INTO `{table}`
        (symbol,date,open,high,low,close,adj_close,volume,dividends,stock_splits)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            open=VALUES(open), high=VALUES(high), low=VALUES(low),
            close=VALUES(close), adj_close=VALUES(adj_close),
            volume=VALUES(volume), dividends=VALUES(dividends),
            stock_splits=VALUES(stock_splits)
        """, records)

        cur.execute("""
        INSERT INTO symbol_metadata (symbol,last_fetched,data_points,status)
        VALUES (%s,%s,%s,'active')
        ON DUPLICATE KEY UPDATE
            last_fetched=VALUES(last_fetched),
            data_points=data_points+VALUES(data_points),
            status='active'
        """, (clean, datetime.now().date(), len(records)))

        conn.commit()
        cur.close()
        conn.close()

        return {"status": "success", "symbol": clean, "rows": len(records), "table": table}

    # -------------------- SINGLE --------------------
    def fetch_single_symbol(
        symbol: str,
        period: str = Query("1mo", description="Data period"),
        save_to_db: bool = Query(False, description="Save to database")
    ):
        """Fetch data for single symbol with retry logic"""
        try:
            from app.services.nse_service import nse_service
            
            # Clean symbol
            clean_symbol = symbol.upper().replace(".NS", "")
            
            # Try different formats
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
                        if save_to_db:
                            # Call your service method to save
                            pass
                        
                        return {
                            "status": "success",
                            "symbol": sym_format,
                            "rows": len(df),
                            "data": df.reset_index().to_dict("records"),
                            "columns": list(df.columns)
                        }
                        
                except Exception as e:
                    logger.warning(f"Failed with {sym_format}: {e}")
                    time.sleep(1)  # Delay before next try
            
            return {
                "status": "failed",
                "message": "Could not fetch data with any symbol format",
                "tried_formats": formats_to_try
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # -------------------- FETCH ALL LISTED --------------------
    def fetch_all_listed(self, period="1mo", limit=None):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor(pymysql.cursors.DictCursor)

        q = "SELECT symbol FROM listed_companies"
        if limit:
            q += f" LIMIT {limit}"

        cur.execute(q)
        symbols = [r["symbol"] for r in cur.fetchall()]
        cur.close()
        conn.close()

        results = {"success": 0, "failed": 0}

        for sym in symbols:
            res = self.fetch_single_symbol(sym, period, True)
            if res["status"] == "success":
                results["success"] += 1
            else:
                results["failed"] += 1

        return {"status": "completed", **results}


nse_service = NSEService()
