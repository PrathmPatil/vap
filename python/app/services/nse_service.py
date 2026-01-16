import os
import pandas as pd
import yfinance as yf
from datetime import datetime
from app.config import config
from app.database.connection import db_manager


class NSEService:
    def __init__(self):
        db_manager.ensure_database(config.DB_STOCK_MARKET)
        self.create_tables()

    # ======================================================
    # 🔹 TABLE CREATION
    # ======================================================
    def create_tables(self):
        """Create necessary tables if they don't exist."""
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        # Listed companies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS listed_companies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(50) UNIQUE,
                company_name VARCHAR(255),
                series VARCHAR(20),
                date_of_listing DATE,
                paid_up_value INT,
                market_lot INT,
                isin VARCHAR(50),
                face_value INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Historical data table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS all_companies_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20),
                date DATE,
                open FLOAT,
                high FLOAT,
                low FLOAT,
                close FLOAT,
                volume BIGINT,
                dividends FLOAT,
                stock_splits FLOAT,
                UNIQUE KEY unique_record (symbol, date)
            )
        """)

        # Failed symbols table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS failed_symbols (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20),
                error_message TEXT,
                failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        cursor.close()
        conn.close()

    # ======================================================
    # 🔹 UPDATE LISTED COMPANIES
    # ======================================================
    def update_listed_companies(self):
        """Sync NSE listed companies data from official CSV."""
        try:
            df = pd.read_csv(config.NSE_LISTED_COMPANIES_URL)
            df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
            df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)

            # Convert date format
            if "date_of_listing" in df.columns:
                df["date_of_listing"] = df["date_of_listing"].apply(
                    lambda x: datetime.strptime(x, "%d-%b-%Y").strftime("%Y-%m-%d")
                    if isinstance(x, str) and "-" in x else None
                )

            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cursor = conn.cursor()

            inserted, skipped = 0, 0
            for _, row in df.iterrows():
                cursor.execute("SELECT COUNT(*) AS c FROM listed_companies WHERE symbol=%s", (row["symbol"],))
                if cursor.fetchone()["c"] == 0:
                    cursor.execute("""
                        INSERT INTO listed_companies
                        (symbol, company_name, series, date_of_listing, paid_up_value, market_lot, isin, face_value)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """, (
                        row.get("symbol", ""),
                        row.get("name_of_company", ""),
                        row.get("series", ""),
                        row.get("date_of_listing", None),
                        int(row.get("paid_up_value") or 0),
                        int(row.get("market_lot") or 0),
                        row.get("isin_number", ""),
                        int(row.get("face_value") or 0)
                    ))
                    inserted += 1
                else:
                    skipped += 1

            conn.commit()
            cursor.close()
            conn.close()
            return {"status": "success", "inserted": inserted, "skipped": skipped}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ======================================================
    # 🔹 FETCH HISTORICAL STOCK DATA
    # ======================================================
    def fetch_historical_data(self, period="1mo"):
        """Fetch historical stock data for all listed companies."""
        try:
            # Get all listed symbols
            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cursor = conn.cursor()
            cursor.execute("SELECT symbol FROM listed_companies")
            symbols = [row["symbol"].upper() + ".NS" for row in cursor.fetchall()]
            cursor.close()
            conn.close()

            os.makedirs("temp_excel", exist_ok=True)
            success_count, fail_count = 0, 0

            for symbol in symbols:
                clean_symbol = symbol.replace(".NS", "")
                print(f"📈 Fetching {symbol} ...")

                try:
                    df = yf.download(symbol, period=period, interval="1d", auto_adjust=False, actions=True)

                    if df.empty:
                        print(f"⚠️ No data for {symbol}, skipping...")
                        continue

                    # Reset and flatten DataFrame
                    df.reset_index(inplace=True)
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = ['_'.join([str(c).strip() for c in tup if c]) for tup in df.columns.values]

                    # Rename columns
                    rename_map = {
                        "Date": "date", "Open": "open", "High": "high", "Low": "low",
                        "Close": "close", "Volume": "volume", "Dividends": "dividends",
                        "Stock Splits": "stock_splits"
                    }
                    df.rename(columns={c: rename_map.get(c.split("_")[0], c) for c in df.columns}, inplace=True)
                    df["symbol"] = clean_symbol

                    # Build insert records
                    records = []
                    for _, r in df.iterrows():
                        try:
                            record_date = (
                                r["date"].date() if hasattr(r["date"], "date")
                                else pd.to_datetime(r["date"]).date()
                            )
                            records.append((
                                r["symbol"],
                                record_date,
                                float(r.get("open", 0) or 0),
                                float(r.get("high", 0) or 0),
                                float(r.get("low", 0) or 0),
                                float(r.get("close", 0) or 0),
                                int(r.get("volume", 0) or 0),
                                float(r.get("dividends", 0) or 0),
                                float(r.get("stock_splits", 0) or 0)
                            ))
                        except Exception as row_err:
                            print(f"   ⚠️ Bad row for {symbol}: {row_err}")

                    # Insert batch into DB
                    if records:
                        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
                        cursor = conn.cursor()
                        cursor.executemany("""
                            INSERT IGNORE INTO all_companies_data
                            (symbol, date, open, high, low, close, volume, dividends, stock_splits)
                            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """, records)
                        conn.commit()
                        cursor.close()
                        conn.close()

                    print(f"✅ Inserted {len(records)} rows for {symbol}")
                    success_count += 1

                except Exception as e:
                    fail_count += 1
                    print(f"❌ Error fetching {symbol}: {e}")
                    self.log_failed_symbol(clean_symbol, str(e))
                    continue

            return {
                "status": "success",
                "message": f"Data fetch completed. Success: {success_count}, Failed: {fail_count}"
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ======================================================
    # 🔹 LOG FAILED SYMBOL
    # ======================================================
    def get_failed_symbols(self):
        """Fetch all failed symbols from DB."""
        try:
            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM failed_symbols ORDER BY failed_at DESC")
            data = cursor.fetchall()
            cursor.close()
            conn.close()
            return data
        except Exception as e:
            print(f"❌ Failed to fetch failed symbols: {e}")
            return []


    # ======================================================
    # 🔹 GET HISTORICAL DATA
    # ======================================================
    def get_historical_data(self, symbol: str, start_date: str = None, end_date: str = None):
        """Get historical data for a specific symbol."""
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        query = "SELECT * FROM all_companies_data WHERE symbol = %s"
        params = [symbol]

        if start_date and end_date:
            query += " AND date BETWEEN %s AND %s"
            params.extend([start_date, end_date])
        elif start_date:
            query += " AND date >= %s"
            params.append(start_date)
        elif end_date:
            query += " AND date <= %s"
            params.append(end_date)

        query += " ORDER BY date DESC"
        cursor.execute(query, params)
        data = cursor.fetchall()
        cursor.close()
        conn.close()

        return {"status": "success", "count": len(data), "data": data}


# ✅ Singleton instance for FastAPI routes
nse_service = NSEService()
