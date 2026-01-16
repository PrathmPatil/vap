import os
import shutil
from pathlib import Path

def create_project_structure():
    """Create the complete stock data API project structure"""
    
    # Define project base directory
    base_dir = "stock_data_api"
    
    print(f"🚀 Creating Stock Data API project in {base_dir}...")
    
    # Remove existing directory if it exists
    if os.path.exists(base_dir):
        try:
            shutil.rmtree(base_dir)
            print(f"🗑️  Removed existing {base_dir} directory")
        except Exception as e:
            print(f"⚠️  Could not remove existing directory: {e}")
    
    # Create all directories first
    directories = [
        f"{base_dir}/app",
        f"{base_dir}/app/database",
        f"{base_dir}/app/models", 
        f"{base_dir}/app/routes",
        f"{base_dir}/app/services",
        f"{base_dir}/app/utils",
        f"{base_dir}/temp_excel",
        f"{base_dir}/nse_bhavcopy_output",
        f"{base_dir}/logs"
    ]
    
    for directory in directories:
        try:
            os.makedirs(directory, exist_ok=True)
            print(f"✓ Created directory: {directory}")
        except Exception as e:
            print(f"⚠️  Could not create {directory}: {e}")
    
    # Create all files
    create_files(base_dir)
    
    print(f"\n🎉 Project created successfully in '{base_dir}' directory!")
    print("\n📝 Next steps:")
    print("1. cd stock_data_api")
    print("2. pip install -r requirements.txt")
    print("3. Update .env file with your database credentials if needed") 
    print("4. python run.py")
    print("5. Access API docs at http://localhost:8000/docs")

def write_file(filepath, content):
    """Write content to a file"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Created: {filepath}")
    except Exception as e:
        print(f"❌ Failed to create {filepath}: {e}")

def create_files(base_dir):
    """Create all project files"""
    
    # 1. Create __init__.py files
    init_files = [
        f"{base_dir}/app/__init__.py",
        f"{base_dir}/app/database/__init__.py", 
        f"{base_dir}/app/models/__init__.py",
        f"{base_dir}/app/routes/__init__.py",
        f"{base_dir}/app/services/__init__.py",
        f"{base_dir}/app/utils/__init__.py",
    ]
    
    for init_file in init_files:
        write_file(init_file, "")
    
    # 2. Create config.py
    config_content = '''import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Patil@2000")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    
    # Database Names
    DB_BHAVCOPY = os.getenv("DB_BHAVCOPY", "bhavcopy")
    DB_STOCK_MARKET = os.getenv("DB_STOCK_MARKET", "stock_market1")
    DB_SCREENER = os.getenv("DB_SCREENER", "screener_data_test")
    
    # NSE Configuration
    NSE_BHAVCOPY_URL = "https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{date}.zip"
    NSE_LISTED_COMPANIES_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    
    # Screener Configuration
    SCREENER_BASE_URL = "https://www.screener.in/company/{symbol}/{statement_type}/"
    
    # Scheduler Configuration
    SCHEDULER_TIMEZONE = "Asia/Kolkata"
    BHAVCOPY_FETCH_TIME = "18:00"  # 6:00 PM IST
    HISTORICAL_DATA_FETCH_TIME = "18:30"  # 6:30 PM IST
    SCREENER_FETCH_TIME = "19:00"  # 7:00 PM IST
    
    # Threading
    MAX_WORKERS = 5

config = Config()
'''
    write_file(f"{base_dir}/app/config.py", config_content)

    # 3. Create database/connection.py
    connection_content = '''import pymysql
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from app.config import config

class DatabaseManager:
    def __init__(self):
        self.config = config
    
    def get_connection(self, db_name=None):
        """Get raw PyMySQL connection"""
        return pymysql.connect(
            host=self.config.DB_HOST,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            database=db_name,
            port=self.config.DB_PORT,
            cursorclass=pymysql.cursors.DictCursor
        )
    
    def get_sqlalchemy_engine(self, db_name):
        """Get SQLAlchemy engine for specific database"""
        encoded_password = quote_plus(self.config.DB_PASSWORD)
        return create_engine(
            f"mysql+pymysql://{self.config.DB_USER}:{encoded_password}@{self.config.DB_HOST}:{self.config.DB_PORT}/{db_name}"
        )
    
    def ensure_database(self, db_name):
        """Ensure database exists"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        conn.commit()
        cursor.close()
        conn.close()
    
    def ensure_table_schema(self, table_name, df, db_name):
        """Ensure table has all columns from DataFrame"""
        engine = self.get_sqlalchemy_engine(db_name)
        with engine.connect() as conn:
            result = conn.execute(text(f"SHOW TABLES LIKE '{table_name}'")).fetchall()
            existing_cols = []
            if result:
                cols_result = conn.execute(text(f"SHOW COLUMNS FROM `{table_name}`")).fetchall()
                existing_cols = [row[0] for row in cols_result]
            
            for col in df.columns:
                if col not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"))
                        conn.commit()
                    except Exception as e:
                        print(f"⚠ Column add failed `{col}` → {e}")

# Global instance
db_manager = DatabaseManager()
'''
    write_file(f"{base_dir}/app/database/connection.py", connection_content)

    # 4. Create models/schemas.py
    schemas_content = '''from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class HistoricalDataRequest(BaseModel):
    symbol: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class BhavcopyRequest(BaseModel):
    start_date: str
    end_date: str

class ScreenerRequest(BaseModel):
    symbol: str

class APIResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
'''
    write_file(f"{base_dir}/app/models/schemas.py", schemas_content)

    # 5. Create utils/helpers.py
    helpers_content = '''import re

def sanitize_column_name(col: str) -> str:
    """Sanitize column names for database compatibility"""
    col = col.strip()
    col = re.sub(r"[^\\w]+", "_", col)
    col = re.sub(r"__+", "_", col)
    col = col.strip("_")
    return col

def sanitize_table_name(name: str) -> str:
    """Sanitize table names for database compatibility"""
    name = name.strip().lower()
    name = re.sub(r'\\W+', '_', name)
    if name and name[0].isdigit():
        name = "tbl_" + name
    return name or "tbl_unknown"

def format_date_for_nse(date_obj):
    """Format date for NSE URLs (DDMMYY)"""
    return date_obj.strftime("%d%m%y")
'''
    write_file(f"{base_dir}/app/utils/helpers.py", helpers_content)

    # 6. Create services/bhavcopy_service.py
    bhavcopy_service_content = '''import requests
import zipfile
import io
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import os, re
from app.config import config
from app.database.connection import db_manager
from app.utils.helpers import sanitize_column_name

class BhavcopyService:
    def __init__(self):
        self.expected_files = ["bc", "bh", "corpbond", "gl", "hl", "pd", "pr", "sme", "tt", "mcap", "fo", "debt", "eq"]
        self.headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        }
        db_manager.ensure_database(config.DB_BHAVCOPY)

    def process_zip_for_date(self, date_obj):
        """Process bhavcopy data for a specific date"""
        date_str = date_obj.strftime("%d%m%y")
        url = config.NSE_BHAVCOPY_URL.format(date=date_str)
        
        result_data = {}
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code != 200:
                return {"date": str(date_obj.date()), "status": "FAILED", "reason": f"HTTP {response.status_code}"}

            zip_bytes = io.BytesIO(response.content)
            with zipfile.ZipFile(zip_bytes) as z:
                found_files = set()

                for file_name in z.namelist():
                    if not file_name.endswith(".csv"):
                        continue
                    
                    base = os.path.splitext(os.path.basename(file_name))[0]
                    base = re.sub(r"\\d+", "", base).lower()
                    found_files.add(base)

                    with z.open(file_name) as csv_file:
                        try:
                            df = pd.read_csv(csv_file, on_bad_lines="skip")
                        except UnicodeDecodeError:
                            csv_file.seek(0)
                            df = pd.read_csv(csv_file, on_bad_lines="skip", encoding="latin1")

                        # Clean column names
                        df.columns = [sanitize_column_name(col) for col in df.columns]
                        df["source_date"] = date_obj.date()
                        df["status"] = "OK"

                        # Ensure table schema and insert data
                        db_manager.ensure_table_schema(base, df, config.DB_BHAVCOPY)
                        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
                        df.to_sql(name=base, con=engine, if_exists="append", index=False)

                        result_data[base] = df.head(5).to_dict(orient="records")

                # Handle missing files
                for expected in self.expected_files:
                    if expected not in found_files:
                        df_missing = pd.DataFrame([{"source_date": date_obj.date(), "status": "MISSING"}])
                        db_manager.ensure_table_schema(expected, df_missing, config.DB_BHAVCOPY)
                        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
                        df_missing.to_sql(name=expected, con=engine, if_exists="append", index=False)
                        result_data[expected] = [{"source_date": str(date_obj.date()), "status": "MISSING"}]

            return {"date": str(date_obj.date()), "status": "SUCCESS", "data": result_data}

        except Exception as e:
            return {"date": str(date_obj.date()), "status": "ERROR", "message": str(e)}

    def fetch_bhavcopy_range(self, start_date: str, end_date: str):
        """Fetch bhavcopy data for a date range"""
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")

        date_list = [start + timedelta(days=i) for i in range((end - start).days + 1)]
        
        results = []
        with ThreadPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
            futures = [executor.submit(self.process_zip_for_date, d) for d in date_list]
            for future in as_completed(futures):
                results.append(future.result())

        return results

    def fetch_today_bhavcopy(self):
        """Fetch today's bhavcopy data (for scheduler)"""
        today = datetime.now().date()
        return self.process_zip_for_date(today)

bhavcopy_service = BhavcopyService()
'''
    write_file(f"{base_dir}/app/services/bhavcopy_service.py", bhavcopy_service_content)

    # 7. Create services/nse_service.py
    nse_service_content = '''import pandas as pd
import yfinance as yf
from datetime import datetime
import os
from app.config import config
from app.database.connection import db_manager

class NSEService:
    def __init__(self):
        self.db_manager = db_manager
        self.config = config
        self.db_manager.ensure_database(config.DB_STOCK_MARKET)
        self.create_tables()

    def create_tables(self):
        """Create necessary tables if they don't exist"""
        conn = self.db_manager.get_connection(config.DB_STOCK_MARKET)
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
        
        conn.commit()
        cursor.close()
        conn.close()

    def update_listed_companies(self):
        """Sync NSE listed companies data"""
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

            conn = self.db_manager.get_connection(config.DB_STOCK_MARKET)
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
                        row["symbol"],
                        row["name_of_company"],
                        row["series"],
                        row["date_of_listing"],
                        int(row["paid_up_value"] or 0),
                        int(row["market_lot"] or 0),
                        row["isin_number"],
                        int(row["face_value"] or 0)
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

    def fetch_historical_data(self, period="1mo"):
        """Fetch historical data for all listed companies"""
        try:
            conn = self.db_manager.get_connection(config.DB_STOCK_MARKET)
            cursor = conn.cursor()
            cursor.execute("SELECT symbol FROM listed_companies")
            symbols = [row["symbol"].upper() + ".NS" for row in cursor.fetchall()]
            cursor.close()
            conn.close()

            os.makedirs("temp_excel", exist_ok=True)

            for symbol in symbols:
                clean_symbol = symbol.replace(".NS", "")
                try:
                    df = yf.download(symbol, period=period, interval="1d", auto_adjust=False, actions=True)
                    if df.empty:
                        continue

                    df.reset_index(inplace=True)
                    df.rename(columns={
                        "Date": "date", "Open": "open", "High": "high", "Low": "low",
                        "Close": "close", "Volume": "volume", "Dividends": "dividends",
                        "Stock Splits": "stock_splits"
                    }, inplace=True)
                    df["symbol"] = clean_symbol

                    conn = self.db_manager.get_connection(config.DB_STOCK_MARKET)
                    cursor = conn.cursor()

                    for _, r in df.iterrows():
                        cursor.execute("""
                            INSERT IGNORE INTO all_companies_data
                            (symbol, date, open, high, low, close, volume, dividends, stock_splits)
                            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """, (
                            r["symbol"],
                            pd.to_datetime(r["date"]).date(),
                            float(r["open"]),
                            float(r["high"]),
                            float(r["low"]),
                            float(r["close"]),
                            int(r["volume"]),
                            float(r["dividends"]),
                            float(r["stock_splits"])
                        ))

                    conn.commit()
                    cursor.close()
                    conn.close()

                except Exception as e:
                    print(f"Error fetching data for {symbol}: {str(e)}")
                    continue

            return {"status": "success", "message": "Historical data updated"}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_historical_data(self, symbol: str, start_date: str = None, end_date: str = None):
        """Get historical data for a specific symbol"""
        conn = self.db_manager.get_connection(config.DB_STOCK_MARKET)
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

        return data

nse_service = NSEService()
'''
    write_file(f"{base_dir}/app/services/nse_service.py", nse_service_content)

    # 8. Create services/screener_service.py
    screener_service_content = '''import requests
from bs4 import BeautifulSoup
import re
import json
import datetime
from app.config import config
from app.database.connection import db_manager

class ScreenerService:
    def __init__(self):
        self.db_manager = db_manager
        self.config = config
        self.db_manager.ensure_database(config.DB_SCREENER)

    def get_company_info(self, symbol: str):
        """Fetch company info from stock_market database"""
        conn = self.db_manager.get_connection(config.DB_STOCK_MARKET)
        with conn.cursor() as cursor:
            cursor.execute("SHOW COLUMNS FROM listed_companies;")
            columns = [row[0] for row in cursor.fetchall()]
            
            if "company_name" in columns:
                name_col = "company_name"
            elif "name_of_company" in columns:
                name_col = "name_of_company"
            elif "name" in columns:
                name_col = "name"
            else:
                raise Exception("No valid name column found in listed_companies table.")
            
            cursor.execute(f"SELECT {name_col} FROM listed_companies WHERE symbol = %s", (symbol,))
            result = cursor.fetchone()
        conn.close()
        return result[0] if result else None

    def get_screener_data(self, symbol: str, statement_type='consolidated'):
        """Scrape Screener.in for company data"""
        url = config.SCREENER_BASE_URL.format(symbol=symbol, statement_type=statement_type)
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Data not found for symbol {symbol}")

        soup = BeautifulSoup(response.content, "html.parser")
        data = {
            "symbol": symbol,
            "scraped_on": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "company_info": {},
            "financial_ratios": {},
            "profit_loss": {},
            "balance_sheet": {},
            "cash_flow": {},
            "quarterly_results": {},
            "shareholding_pattern": {},
        }

        # Basic info
        info = soup.find("div", class_="company-info")
        if info:
            h1 = info.find("h1")
            data["company_info"]["name"] = h1.text.strip() if h1 else symbol

        # Financial ratios
        ratios = soup.find_all("li", class_="flex-row")
        for r in ratios:
            name = r.find("span", class_="name")
            num = r.find("span", class_="number")
            if name and num:
                data["financial_ratios"][name.text.strip()] = num.text.strip()

        # Table extraction
        for table in soup.find_all("table"):
            title_tag = table.find_previous("h2")
            title = re.sub(r'\\W+', '_', title_tag.text.strip().lower()) if title_tag else "unknown"
            rows = table.find_all("tr")
            headers = [th.text.strip() for th in rows[0].find_all("th")] if rows else []
            records = []
            for row in rows[1:]:
                cells = [td.text.strip() for td in row.find_all("td")]
                if headers and len(cells) == len(headers):
                    records.append(dict(zip(headers, cells)))
            
            if "profit" in title or "loss" in title:
                data["profit_loss"][title] = records
            elif "balance" in title:
                data["balance_sheet"][title] = records
            elif "cash" in title:
                data["cash_flow"][title] = records
            elif "quarter" in title:
                data["quarterly_results"][title] = records
            elif "shareholding" in title:
                data["shareholding_pattern"][title] = records

        return data

    def save_to_mysql(self, data: dict):
        """Save scraped data into screener database"""
        conn = self.db_manager.get_connection(config.DB_SCREENER)
        cursor = conn.cursor()

        symbol = data["symbol"]
        scraped_date = data["scraped_on"].split(" ")[0]
        table_name = f"screener_data_{scraped_date}"

        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(50),
                scraped_on DATETIME,
                section VARCHAR(255),
                data JSON
            );
        """)

        for section, section_data in data.items():
            if section in ["symbol", "scraped_on"]:
                continue
            if section_data:
                cursor.execute(
                    f"INSERT INTO `{table_name}` (symbol, scraped_on, section, data) VALUES (%s,%s,%s,%s)",
                    (symbol, data["scraped_on"], section, json.dumps(section_data))
                )

        conn.commit()
        conn.close()

    def fetch_company_data(self, symbol: str):
        """Main method to fetch and save screener data"""
        company_name = self.get_company_info(symbol)
        if not company_name:
            raise Exception(f"Symbol '{symbol}' not found in listed_companies")

        data = self.get_screener_data(symbol)
        self.save_to_mysql(data)
        return data

screener_service = ScreenerService()
'''
    write_file(f"{base_dir}/app/services/screener_service.py", screener_service_content)

    # 9. Create services/scheduler.py
    scheduler_content = '''from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import config
from app.services.bhavcopy_service import bhavcopy_service
from app.services.nse_service import nse_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone=config.SCHEDULER_TIMEZONE)

def fetch_daily_bhavcopy():
    """Daily task to fetch bhavcopy data"""
    try:
        logger.info("Starting daily bhavcopy fetch...")
        result = bhavcopy_service.fetch_today_bhavcopy()
        logger.info(f"Bhavcopy fetch completed: {result['status']}")
    except Exception as e:
        logger.error(f"Bhavcopy fetch failed: {str(e)}")

def fetch_daily_historical_data():
    """Daily task to fetch historical data"""
    try:
        logger.info("Starting daily historical data fetch...")
        result = nse_service.fetch_historical_data("1d")
        logger.info(f"Historical data fetch completed: {result['status']}")
    except Exception as e:
        logger.error(f"Historical data fetch failed: {str(e)}")

def update_listed_companies():
    """Daily task to update listed companies"""
    try:
        logger.info("Updating listed companies...")
        result = nse_service.update_listed_companies()
        logger.info(f"Listed companies update completed: {result}")
    except Exception as e:
        logger.error(f"Listed companies update failed: {str(e)}")

def start_scheduler():
    """Start the scheduled tasks"""
    if not scheduler.running:
        # Schedule bhavcopy fetch at 6:00 PM IST
        scheduler.add_job(
            fetch_daily_bhavcopy,
            trigger=CronTrigger(hour=18, minute=0),  # 6:00 PM
            id="daily_bhavcopy"
        )
        
        # Schedule historical data fetch at 6:30 PM IST
        scheduler.add_job(
            fetch_daily_historical_data,
            trigger=CronTrigger(hour=18, minute=30),  # 6:30 PM
            id="daily_historical_data"
        )
        
        # Schedule listed companies update at 7:00 PM IST
        scheduler.add_job(
            update_listed_companies,
            trigger=CronTrigger(hour=19, minute=0),  # 7:00 PM
            id="daily_listed_companies"
        )
        
        scheduler.start()
        logger.info("Scheduler started with daily tasks")

def stop_scheduler():
    """Stop the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
'''
    write_file(f"{base_dir}/app/services/scheduler.py", scheduler_content)

    # 10. Create routes/bhavcopy.py
    bhavcopy_routes_content = '''from fastapi import APIRouter, Query, HTTPException
from app.services.bhavcopy_service import bhavcopy_service

router = APIRouter()

@router.get("/fetch-range")
async def fetch_bhavcopy_range(
    start_date: str = Query(..., example="2024-01-01"),
    end_date: str = Query(..., example="2024-01-10")
):
    """
    Fetch and store NSE Bhavcopy data between start_date and end_date.
    Useful for fetching historical data.
    """
    try:
        results = bhavcopy_service.fetch_bhavcopy_range(start_date, end_date)
        return {
            "status": "success", 
            "records_processed": len(results), 
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/fetch-today")
async def fetch_today_bhavcopy():
    """Fetch today's bhavcopy data"""
    try:
        result = bhavcopy_service.fetch_today_bhavcopy()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def bhavcopy_health():
    return {"status": "bhavcopy_service_healthy"}
'''
    write_file(f"{base_dir}/app/routes/bhavcopy.py", bhavcopy_routes_content)

    # 11. Create routes/nse.py
    nse_routes_content = '''from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.nse_service import nse_service

router = APIRouter()

@router.post("/update-listed-companies")
async def update_listed_companies():
    """Sync NSE listed companies data"""
    result = nse_service.update_listed_companies()
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.post("/fetch-historical-data")
async def fetch_historical_data(period: str = Query("1mo", description="Period for historical data")):
    """Fetch historical data for all listed companies"""
    result = nse_service.fetch_historical_data(period)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/get-historical-data/{symbol}")
async def get_historical_data(
    symbol: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get historical data for a specific symbol"""
    data = nse_service.get_historical_data(symbol, start_date, end_date)
    if not data:
        raise HTTPException(status_code=404, detail="No data found")
    return {"symbol": symbol, "count": len(data), "data": data}

@router.get("/listed-companies")
async def get_listed_companies():
    """Get all listed companies"""
    conn = nse_service.db_manager.get_connection(nse_service.config.DB_STOCK_MARKET)
    cursor = conn.cursor()
    cursor.execute("SELECT symbol, company_name FROM listed_companies")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"count": len(data), "companies": data}
'''
    write_file(f"{base_dir}/app/routes/nse.py", nse_routes_content)

    # 12. Create routes/screener.py
    screener_routes_content = '''from fastapi import APIRouter, HTTPException
from app.services.screener_service import screener_service

router = APIRouter()

@router.get("/fetch/{symbol}")
async def fetch_company_data(symbol: str):
    """Fetch Screener data for a given company symbol"""
    try:
        data = screener_service.fetch_company_data(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-batch")
async def fetch_batch_companies(symbols: list[str]):
    """Fetch Screener data for multiple companies"""
    results = []
    for symbol in symbols:
        try:
            data = screener_service.fetch_company_data(symbol)
            results.append({"symbol": symbol, "status": "success", "data": data})
        except Exception as e:
            results.append({"symbol": symbol, "status": "error", "message": str(e)})
    
    return {"results": results}

@router.get("/health")
async def screener_health():
    return {"status": "screener_service_healthy"}
'''
    write_file(f"{base_dir}/app/routes/screener.py", screener_routes_content)

    # 13. Create main.py
    main_content = '''from fastapi import FastAPI
from app.routes import bhavcopy, nse, screener
from app.services.scheduler import start_scheduler, stop_scheduler

app = FastAPI(
    title="Unified Stock Data API",
    description="Combined API for NSE Bhavcopy, Listed Companies, and Screener Data",
    version="2.0"
)

# Include routers
app.include_router(bhavcopy.router, prefix="/bhavcopy", tags=["Bhavcopy"])
app.include_router(nse.router, prefix="/nse", tags=["NSE Data"])
app.include_router(screener.router, prefix="/screener", tags=["Screener Data"])

@app.on_event("startup")
async def startup_event():
    """Start scheduler when application starts"""
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler when application shuts down"""
    stop_scheduler()

@app.get("/")
async def root():
    return {
        "message": "Unified Stock Data API is running",
        "endpoints": {
            "bhavcopy": "/bhavcopy",
            "nse": "/nse", 
            "screener": "/screener"
        },
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "stock_data_api"}
'''
    write_file(f"{base_dir}/app/main.py", main_content)

    # 14. Create requirements.txt
    requirements_content = '''fastapi==0.104.1
uvicorn==0.24.0
pymysql==1.1.0
sqlalchemy==2.0.23
pandas==2.1.3
requests==2.31.0
beautifulsoup4==4.12.2
yfinance==0.2.18
apscheduler==3.10.4
python-dotenv==1.0.0
python-multipart==0.0.6
'''
    write_file(f"{base_dir}/requirements.txt", requirements_content)

    # 15. Create run.py
    run_content = '''import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
'''
    write_file(f"{base_dir}/run.py", run_content)

    # 16. Create .env file
    env_content = '''DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Patil@2000
DB_PORT=3306
DB_BHAVCOPY=bhavcopy
DB_STOCK_MARKET=stock_market1
DB_SCREENER=screener_data_test
'''
    write_file(f"{base_dir}/.env", env_content)

   