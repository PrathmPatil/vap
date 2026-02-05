# app/startup.py
import time
import pymysql
from app.database.connection import db_manager
from app.config import config

def wait_for_mysql(max_retries=30, delay=2):
    for i in range(max_retries):
        try:
            conn = pymysql.connect(
                host=config.DB_HOST,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                port=config.DB_PORT,
                connect_timeout=5
            )
            conn.close()
            print("✅ MySQL is ready")
            return
        except Exception:
            print(f"⏳ Waiting for MySQL... ({i+1}/{max_retries})")
            time.sleep(delay)

    raise RuntimeError("❌ MySQL not reachable after retries")


def ensure_databases():
    wait_for_mysql()

    # ✅ Ensure ALL databases
    db_manager.ensure_database(config.DB_BHAVCOPY)
    db_manager.ensure_database(config.DB_STOCK_MARKET)
    db_manager.ensure_database(config.DB_NEWS)

    print("✅ All databases ensured")
