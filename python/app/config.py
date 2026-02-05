import os
from dotenv import load_dotenv

load_dotenv()


def require_env(key: str) -> str:
    value = os.getenv(key)
    if value is None or value == "":
        raise RuntimeError(f"❌ Missing required environment variable: {key}")
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
    DB_SCREENER = require_env("DB_SCREENER")
    DB_YFINANCE = require_env("DB_YFINANCE")
    DB_IPO = require_env("DB_IPO")
    DB_BSE = require_env("DB_BSE")
    DB_NEWS = require_env("DB_NEWS")
    DB_BSE_INDICES = require_env("DB_BSE_INDICES")
    DB_ANNOUNCEMENT_DB_NAME = require_env("DB_ANNOUNCEMENT_DB_NAME")

    # =====================================================
    # 🌐 NSE / SCREENER CONFIG
    # =====================================================
    NSE_BHAVCOPY_URL = require_env("NSE_BHAVCOPY_URL")
    NSE_LISTED_COMPANIES_URL = require_env("NSE_LISTED_COMPANIES_URL")
    SCREENER_BASE_URL = require_env("SCREENER_BASE_URL")

    # =====================================================
    # 🕓 SCHEDULER CONFIG
    # =====================================================
    SCHEDULER_TIMEZONE = require_env("SCHEDULER_TIMEZONE")
    ENABLE_SCHEDULER = env_bool("ENABLE_SCHEDULER")

    SCHEDULER_CONFIG = {
        "enable_scheduler": ENABLE_SCHEDULER,
        "bhavcopy_update": require_env("BHAVCOPY_UPDATE_CRON"),
        "historical_update": require_env("HISTORICAL_UPDATE_CRON"),
        "listed_update": require_env("LISTED_UPDATE_CRON"),
        "ipo_update": require_env("IPO_UPDATE_CRON"),
    }

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
