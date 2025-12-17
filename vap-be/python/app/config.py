import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # -----------------------------------------------------
    # 🔐 API KEYS
    # -----------------------------------------------------
    ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    FINANCIAL_MODELING_PREP_API_KEY = os.getenv("FMP_API_KEY", "")

    # -----------------------------------------------------
    # 🗄️ DATABASE CONFIGURATION
    # -----------------------------------------------------
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Patil@2000")
    DB_PORT = int(os.getenv("DB_PORT", 3306))

    # Database Names
    DB_BHAVCOPY = os.getenv("DB_BHAVCOPY", "bhavcopy_fastapi")
    DB_STOCK_MARKET = os.getenv("DB_STOCK_MARKET", "stock_market_fastapi")
    DB_SCREENER = os.getenv("DB_SCREENER", "screener_data_fastapi")
    DB_YFINANCE = os.getenv("DB_YFINANCE", "yfinance_data_fastapi")
    DB_IPO = os.getenv("DB_IPO", "ipo_data_fastapi")
    DB_BSE = os.getenv("DB_BSE", "bse_data_fastapi")  
    DB_NEWS = os.getenv("DB_NEWS", "gov_news_data_fastapi")
    DB_BSE_INDICES = os.getenv("DB_BSE_INDICES", "bse_indices_fastapi")

    # SQLite fallback or additional storage paths
    DATABASE_CONFIG = {
        "db_path": "stock_data.db",
        "ipo_db_path": "ipo_data.db",  # IPO data
        "backup_path": "backups/",
    }

    # -----------------------------------------------------
    # 🌐 NSE / SCREENER CONFIGURATION
    # -----------------------------------------------------
    NSE_BHAVCOPY_URL = "https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{date}.zip"
    NSE_LISTED_COMPANIES_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"

    SCREENER_BASE_URL = "https://www.screener.in/company/{symbol}/{statement_type}/"

    # -----------------------------------------------------
    # 🕓 SCHEDULER CONFIGURATION
    # -----------------------------------------------------
    SCHEDULER_TIMEZONE = "Asia/Kolkata"

    SCHEDULER_CONFIG = {
        # Enable or disable scheduler globally
        "enable_scheduler": True,

        # Individual cron schedules (or fallback time strings)
        "bhavcopy_update": "0 18 * * *",     # Every day at 6:00 PM
        "historical_update": "30 18 * * *",  # Every day at 6:30 PM
        "listed_update": "0 19 * * *",       # Every day at 7:00 PM
        "ipo_update": "0 9 * * *",           # Every day at 9:00 AM
    }

    # -----------------------------------------------------
    # 💹 IPO SOURCES CONFIGURATION
    # -----------------------------------------------------
    IPO_SOURCES = {
        "chittorgarh": {"enabled": True, "refresh_hours": 6},
        "nse": {"enabled": True, "refresh_hours": 4},
        "bse": {"enabled": True, "refresh_hours": 4},
        "yahoo_finance": {"enabled": True, "refresh_hours": 12},
    }

    # -----------------------------------------------------
    # ⚙️ SCRAPING CONFIGURATION
    # -----------------------------------------------------
    SCRAPING_CONFIG = {
        "delay_between_requests": 1,
        "max_retries": 3,
        "timeout": 30,
    }

    # -----------------------------------------------------
    # 🧵 THREADING CONFIGURATION
    # -----------------------------------------------------
    MAX_WORKERS = 5


config = Config()
