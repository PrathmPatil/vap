import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()


def require_env(key: str) -> str:
    value = os.getenv(key)
    if value is None or value == "":
        raise RuntimeError(f"❌ Missing required environment variable: {key}")
    return value


def require_url(key: str) -> str:
    """Require an env var and validate it contains a URL scheme (http/https)."""
    value = require_env(key)
    parsed = urlparse(value)
    if not parsed.scheme or parsed.scheme not in ("http", "https"):
        raise RuntimeError(
            f"❌ Invalid URL in environment variable {key}: '{value}'. Provide a full URL including scheme (https://...)."
        )
    return value


def env_int(key: str) -> int:
    return int(require_env(key))


def env_bool(key: str) -> bool:
    return require_env(key).lower() in ("true", "1", "yes", "y")


class Config:
    # =====================================================
    # 🔐 API KEYS
    # =====================================================
    ALPHA_VANTAGE_API_KEY = require_env("ALPHA_VANTAGE_API_KEY")
    FINANCIAL_MODELING_PREP_API_KEY = require_env("FMP_API_KEY")
    
    # Add these to your config
    MAX_WORKERS = 3  # Reduced from default to avoid rate limiting

    # =====================================================
    # 🗄️ DATABASE CONNECTION
    # =====================================================
    DB_HOST = require_env("DB_HOST")
    DB_PORT = env_int("DB_PORT")
    DB_USER = require_env("DB_USER")
    DB_PASSWORD = require_env("DB_PASSWORD")

    # =====================================================
    # 🗄️ DATABASE NAMES
    # =====================================================
    DB_BHAVCOPY = require_env("DB_BHAVCOPY")
    DB_STOCK_MARKET = require_env("DB_STOCK_MARKET")

    # Legacy data categories are consolidated into stock_market_fastapi.
    DB_SCREENER = DB_STOCK_MARKET
    DB_YFINANCE = DB_STOCK_MARKET
    DB_IPO = DB_STOCK_MARKET
    DB_BSE = DB_STOCK_MARKET
    DB_NEWS = DB_STOCK_MARKET
    DB_BSE_INDICES = DB_STOCK_MARKET
    DB_ANNOUNCEMENT_DB_NAME = DB_STOCK_MARKET
    DB_FORMULA_DATA = DB_STOCK_MARKET

    # =====================================================
    # 🌐 NSE / SCREENER CONFIG
    # =====================================================
    # PR bhavcopy zip: .../pr/PR{date}.zip where {date} = DDMMYY
    NSE_BHAVCOPY_URL = os.getenv(
        "NSE_BHAVCOPY_URL",
        "https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{date}.zip",
    )
    parsed_bhavcopy = urlparse(NSE_BHAVCOPY_URL)
    if not parsed_bhavcopy.scheme or parsed_bhavcopy.scheme not in ("http", "https"):
        raise RuntimeError(
            f"Invalid NSE_BHAVCOPY_URL: '{NSE_BHAVCOPY_URL}'. Use https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{{date}}.zip"
        )
    NSE_LISTED_COMPANIES_URL = require_url("NSE_LISTED_COMPANIES_URL")
    SCREENER_BASE_URL = require_url("SCREENER_BASE_URL")

    # =====================================================
    # 🕓 SCHEDULER CONFIG
    # =====================================================
    SCHEDULER_TIMEZONE = require_env("SCHEDULER_TIMEZONE")
    ENABLE_SCHEDULER = env_bool("ENABLE_SCHEDULER")
    ENABLE_COMPANY_PROFILE_CRON = os.getenv(
        "ENABLE_COMPANY_PROFILE_CRON", "false"
    ).lower() in ("true", "1", "yes", "y")

    SCHEDULER_CONFIG = {
        "enable_scheduler": ENABLE_SCHEDULER,
        "bhavcopy_update": require_env("BHAVCOPY_UPDATE_CRON"),
        "historical_update": require_env("HISTORICAL_UPDATE_CRON"),
        "listed_update": require_env("LISTED_UPDATE_CRON"),
        "ipo_update": require_env("IPO_UPDATE_CRON"),
    }

    # Scheduler tuning (optional, uses defaults if not set in .env)
    MARKET_FETCH_BATCH_SIZE = int(os.getenv("MARKET_FETCH_BATCH_SIZE", "20"))
    COMPANY_PROFILE_DELAY_SECONDS = int(os.getenv("COMPANY_PROFILE_DELAY_SECONDS", "60"))

    SCHEDULER_MARKET_FETCH_INTERVAL_MINUTES = int(os.getenv("SCHEDULER_MARKET_FETCH_INTERVAL_MINUTES", "30"))
    SCHEDULER_MARKET_FETCH_MAX_INSTANCES = int(os.getenv("SCHEDULER_MARKET_FETCH_MAX_INSTANCES", "1"))

    # =====================================================
    # 💹 IPO SOURCES
    # =====================================================
    IPO_SOURCES = {
        "chittorgarh": {
            "enabled": env_bool("IPO_CHITTORGARH_ENABLED"),
            "refresh_hours": env_int("IPO_CHITTORGARH_REFRESH_HOURS"),
        },
        "nse": {
            "enabled": env_bool("IPO_NSE_ENABLED"),
            "refresh_hours": env_int("IPO_NSE_REFRESH_HOURS"),
        },
        "bse": {
            "enabled": env_bool("IPO_BSE_ENABLED"),
            "refresh_hours": env_int("IPO_BSE_REFRESH_HOURS"),
        },
        "yahoo_finance": {
            "enabled": env_bool("IPO_YAHOO_FINANCE_ENABLED"),
            "refresh_hours": env_int("IPO_YAHOO_FINANCE_REFRESH_HOURS"),
        },
    }

    # =====================================================
    # ⚙️ SCRAPING CONFIG
    # =====================================================
    SCRAPING_CONFIG = {
        "delay_between_requests": env_int("SCRAPING_DELAY_BETWEEN_REQUESTS"),
        "max_retries": env_int("SCRAPING_MAX_RETRIES"),
        "timeout": env_int("SCRAPING_TIMEOUT"),
    }

    # =====================================================
    # 🧵 THREADING CONFIG
    # =====================================================
    MAX_WORKERS = env_int("MAX_WORKERS")


# ✅ Singleton
config = Config()
