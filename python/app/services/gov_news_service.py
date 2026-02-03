import pymysql
import requests
import logging
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)

BASE_URL = "https://india.gov.in"
HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Origin": "https://india.gov.in",
    "Referer": "https://india.gov.in",
    "X-Requested-With": "XMLHttpRequest",
}


def sanitize_column(name: str) -> str:
    return name.replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_")


class GovNewsCombinedService:

    def __init__(self):
        logger.info("✅ GovNewsCombinedService initialized")

    # -----------------------------------------------------------------
    # Ensure Database Exists
    # -----------------------------------------------------------------
    def ensure_database_exists(self, db_name: str):
        try:
            root_conn = pymysql.connect(
                host=config.DB_HOST,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor,
            )
            with root_conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
            root_conn.close()
        except Exception:
            logger.exception("❌ Failed to ensure database exists")
            raise HTTPException(status_code=500, detail="Database creation failed")

    # -----------------------------------------------------------------
    # Ensure Base Table Exists
    # -----------------------------------------------------------------
    def ensure_table_exists(self, table_name: str, cursor):
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

    # -----------------------------------------------------------------
    # Fetch API
    # -----------------------------------------------------------------
    def fetch(self, endpoint: str, payload: dict) -> dict:
        try:
            url = f"{BASE_URL}{endpoint}"
            res = requests.post(url, json=payload, headers=HEADERS, timeout=20)
            res.raise_for_status()
            return res.json()
        except Exception:
            logger.exception(f"❌ Fetch failed for endpoint: {endpoint}")
            raise HTTPException(status_code=500, detail="Gov API fetch failed")

    # -----------------------------------------------------------------
    # Extract Results
    # -----------------------------------------------------------------
    def extract_results(self, endpoint: str, response: dict):
        if "getnewsonair" in endpoint:
            return response.get("newsOnAirResponse", {}).get("results", [])

        if "getpibministry" in endpoint:
            return response.get("pibnewsMinistryResponse", {}).get("results", [])

        if "getpibnews" in endpoint:
            return response.get("pibnewResponse", {}).get("results", [])

        if "getddnews" in endpoint:
            return response.get("ddnewResponse", {}).get("results", [])

        return []

    # -----------------------------------------------------------------
    # Dynamic Table + Insert
    # -----------------------------------------------------------------
    def create_and_insert_table(self, table_name: str, data: list, cursor):
        if not data:
            return 0

        self.ensure_table_exists(table_name, cursor)

        columns = set()
        for row in data:
            if isinstance(row, dict):
                columns.update(row.keys())

        columns = sorted(sanitize_column(c) for c in columns)

        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        existing_cols = {c["Field"] for c in cursor.fetchall()}

        for col in columns:
            if col not in existing_cols:
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT")

        for row in data:
            clean = {sanitize_column(k): (v or "") for k, v in row.items()}
            col_list = ", ".join(f"`{c}`" for c in columns)
            placeholders = ", ".join(["%s"] * len(columns))
            cursor.execute(
                f"INSERT INTO `{table_name}` ({col_list}) VALUES ({placeholders})",
                tuple(clean.get(c, "") for c in columns),
            )

        return len(data)

    # -----------------------------------------------------------------
    # Save News
    # -----------------------------------------------------------------
    def save_news(self, table_name: str, news_list: list):
        db_name = config.DB_NEWS
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(db_name)
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                saved = self.create_and_insert_table(table_name, news_list, cursor)
                conn.commit()
            conn.close()

            logger.info(f"✅ Saved {saved} records into {table_name}")
            return saved

        except Exception:
            logger.exception("❌ DB save failed")
            raise HTTPException(status_code=500, detail="Database save failed")

    # -----------------------------------------------------------------
    # Fetch + Save
    # -----------------------------------------------------------------
    def fetch_and_save(self, table_name: str, endpoint: str, payload: dict):
        response = self.fetch(endpoint, payload)
        results = self.extract_results(endpoint, response)

        if not isinstance(results, list):
            logger.error("❌ Invalid response format")
            raise HTTPException(status_code=500, detail="Invalid response format")

        return self.save_news(table_name, results)


# ✅ Singleton
gov_news_service = GovNewsCombinedService()
