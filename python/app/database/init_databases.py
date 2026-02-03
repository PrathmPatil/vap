import pymysql
from app.config import config
import logging

logger = logging.getLogger(__name__)

DATABASES = [
    config.DB_STOCK_MARKET,
    config.DB_BHAVCOPY,
    config.DB_SCREENER,
    config.DB_YFINANCE,
    config.DB_IPO,
    config.DB_BSE,
    config.DB_NEWS,
    config.DB_BSE_INDICES,
    config.DB_ANNOUNCEMENT_DB_NAME
]

def init_databases():
    conn = pymysql.connect(
        host=config.DB_HOST,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        port=config.DB_PORT,
        autocommit=True
    )

    cursor = conn.cursor()

    for db in DATABASES:
        try:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db}`")
            logger.info(f"✅ Database ready: {db}")
        except Exception as e:
            logger.error(f"❌ Failed to create DB {db}: {e}")

    cursor.close()
    conn.close()
