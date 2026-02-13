import pandas as pd
import yfinance as yf
import requests
import io
import time
import random
from datetime import datetime
from yfinance import Ticker
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager
import pymysql

class YFINANCEService:
    def __init__(self):
        self.create_tables()

    def create_tables(self):
        
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # UPDATED: Companies table with all necessary columns
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
        
        # Historical table
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

    def get_indian_tickers(self):
        """Fetches active symbols from NSE India."""
        try:
            url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                return []

            df = pd.read_csv(io.StringIO(response.content.decode('utf-8')))
            # Clean symbols and add .NS suffix
            return [f"{sym.strip()}.NS" for sym in df['SYMBOL'].tolist()]
        except Exception as e:
            print(f"Ticker Fetch Error: {e}")
            return []

    # def fetch_company_info(self, symbol: str):
    #     try:
    #         ticker = yf.Ticker(symbol)
    #         info = ticker.info
            
    #         cp = info.get('currentPrice') or info.get('regularMarketPrice')
    #         pc = info.get('previousClose') or info.get('regularMarketPreviousClose')
            
    #         change = round(cp - pc, 2) if cp and pc else 0
    #         p_change = round((change / pc) * 100, 2) if change and pc else 0

    #         return {
    #             "symbol": symbol,
    #             "name": info.get('longName') or info.get('shortName'),
    #             "sector": info.get('sector'),
    #             "industry": info.get('industry'),
    #             "currency": info.get('currency', 'INR'),
    #             "exchange": info.get('exchange'),
    #             "marketCap": info.get('marketCap'),
    #             "currentPrice": cp,
    #             "previousClose": pc,
    #             "change": change,
    #             "changePercent": p_change,
    #             "volume": info.get('volume'),
    #             "website": info.get('website'),
    #             "addedAt": datetime.now()
    #         }
    #     except Exception as e:
    #         print(f"Fetch failed for {symbol}: {e}")
    #         return None
    
    def fetch_company_info(self, symbol: str, retry=3):
        for attempt in range(retry):
            try:
                time.sleep(random.uniform(1.2, 2.5))  # ⏱️ throttle

                ticker = Ticker(symbol)

                # 🔹 FAST & SAFE fields
                fast_info = ticker.fast_info
                info = ticker.get_info()

                cp = fast_info.get("lastPrice")
                pc = fast_info.get("previousClose")

                if not cp or not pc:
                    raise Exception("Price data missing")

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
                    "volume": fast_info.get("lastVolume"),
                    "website": info.get("website"),
                    "addedAt": datetime.now()
                }

            except Exception as e:
                if "429" in str(e) and attempt < retry - 1:
                    time.sleep(5 * (attempt + 1))  # exponential backoff
                    continue

                print(f"❌ Fetch failed for {symbol}: {e}")
                return None

    def save_company_info(self, data: dict):
        if not data: return
        
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        # Logic now matches the CREATE TABLE schema
        sql = """
            INSERT INTO companies 
            (symbol, name, sector, industry, currency, exchange, marketCap, 
             currentPrice, previousClose, `change`, changePercent, volume, website, addedAt)
            VALUES (%(symbol)s, %(name)s, %(sector)s, %(industry)s, %(currency)s, %(exchange)s, %(marketCap)s,
                    %(currentPrice)s, %(previousClose)s, %(change)s, %(changePercent)s, %(volume)s, %(website)s, %(addedAt)s)
            ON DUPLICATE KEY UPDATE
                name=VALUES(name),
                sector=VALUES(sector),
                currentPrice=VALUES(currentPrice),
                `change`=VALUES(`change`),
                changePercent=VALUES(changePercent),
                volume=VALUES(volume),
                addedAt=VALUES(addedAt)
        """
        cursor.execute(sql, data)
        conn.commit()
        cursor.close()
        conn.close()

    # def fetch_and_store_listed_companies(self, limit=None):
    #     tickers = self.get_indian_tickers()
    #     if limit: tickers = tickers[:limit]
        
    #     for symbol in tickers:
    #         data = self.fetch_company_info(symbol)
    #         if data:
    #             self.save_company_info(data)
    #             print(f"Success: {symbol}")
    #     return {"status": "Done"}
    def fetch_and_store_listed_companies(self, limit=50, batch_size=5):
        tickers = self.get_indian_tickers()[:limit]

        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i + batch_size]

            for symbol in batch:
                data = self.fetch_company_info(symbol)
                if data:
                    self.save_company_info(data)

            time.sleep(8)  # 🧊 cool down after each batch

        return {"status": "completed", "processed": len(tickers)}

    
    def fetch_historical_data(self, symbol: str, start_date: str, end_date: str):
        try:
            df = yf.download(symbol, start=start_date, end=end_date, auto_adjust=False)
            if df.empty:
                return {"status": "empty", "inserted_rows": 0}

            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            for record_date, row in df.iterrows():
                cursor.execute("""
                    INSERT INTO company_price_history 
                    (symbol, recordDate, open, high, low, close, volume, createdAt)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        open=VALUES(open), high=VALUES(high), low=VALUES(low), 
                        close=VALUES(close), volume=VALUES(volume)
                """, (symbol, record_date.date(), float(row['Open']), float(row['High']), 
                      float(row['Low']), float(row['Close']), int(row['Volume']), datetime.now()))

            conn.commit()
            conn.close()
            return {"status": "success", "inserted_rows": len(df)}
        except Exception as e:
            raise Exception(f"History Fetch Error: {e}")

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



    # def scrape_and_store_nse_symbols(self):
    #         url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    #         headers = {"User-Agent": "Mozilla/5.0"}
    #         res = requests.get(url, headers=headers)
    #         res.raise_for_status()

    #         df = pd.read_csv(io.StringIO(res.text))

    #         conn = db_manager.get_connection(config.DB_STOCK_MARKET)
    #         cursor = conn.cursor()

    #         for _, row in df.iterrows():
    #             symbol = row["SYMBOL"].strip() + ".NS"
    #             name = row["NAME OF COMPANY"].strip()
    #             series = row["SERIES"].strip()
    #             date_of_listing = row["DATE OF LISTING"].strip()
    #             paid_up_value = row["PAID UP VALUE"].strip()
    #             market_lot = row["MARKET LOT"].strip()
    #             isin = row[" ISIN NUMBER"].strip()
    #             face_value = row["FACE VALUE"].strip()
                

    #             cursor.execute("""
    #                 INSERT IGNORE INTO listed_companies
    #                 (symbol, name, series, date_of_listing, paid_up_value, market_lot, isin, face_value)
    #                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    #             """, (symbol, name, series, date_of_listing, paid_up_value, market_lot, isin, face_value))

    #         conn.commit()
    #         cursor.close()
    #         conn.close()

    #         return {"status": f"Inserted {len(df)} NSE symbols"}


yfinance_service = YFINANCEService()