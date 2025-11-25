# app/services/gov_news_combined.py
# Fully corrected & production-ready: Fetcher + Extractor + DB Save + Cron + Router Support

import pymysql
import requests
from fastapi import APIRouter, HTTPException
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import config
from app.database.connection import db_manager

BASE_URL = "https://india.gov.in"
HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Origin": "https://india.gov.in",
    "Referer": "https://india.gov.in",
    "X-Requested-With": "XMLHttpRequest",
}


def sanitize_column(name: str) -> str:
    return name.replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_")


class GovNewsCombinedService:

    def __init__(self):
        print("✅ GovNewsCombinedService initialized")
        self.scheduler = BackgroundScheduler()

    # -----------------------------------------------------------------
    # Ensure DB exists
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
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database creation failed: {str(e)}")

    # -----------------------------------------------------------------
    # Fetch API
    # -----------------------------------------------------------------
    def fetch(self, endpoint: str, payload: dict) -> dict:
        try:
            url = f"{BASE_URL}{endpoint}"
            res = requests.post(url, json=payload, headers=HEADERS, timeout=20)
            print("RAW RESPONSE:", res.text[:2000])
            res.raise_for_status()
            return res.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")

    # -----------------------------------------------------------------
    # FIXED Extractor (correct response keys)
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

        return response.get("data") or []

    # -----------------------------------------------------------------
    # Dynamic Table Creation + Insert
    # -----------------------------------------------------------------
    def create_and_insert_table(self, table_name: str, data, cursor):

        if not data:
            return

        # ----------------------------------------------------------
        # AUTO ID COLUMN: Create table with id if not exists
        # ----------------------------------------------------------
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # Check if id already exists (for older tables)
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}` LIKE 'id'")
        id_exists = cursor.fetchone()

        if not id_exists:
            cursor.execute(
                f"ALTER TABLE `{table_name}` "
                f"ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST"
            )

        # ----------------------------------------------------------
        # CASE 1: LIST OF DICTS
        # ----------------------------------------------------------
        if isinstance(data, list) and isinstance(data[0], dict):

            # Collect all columns
            columns = set()
            for row in data:
                columns.update(row.keys())

            columns = sorted([sanitize_column(c) for c in columns])

            # Fetch existing columns
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            existing_cols = [c["Field"] for c in cursor.fetchall()]

            # Add missing columns
            for col in columns:
                if col not in existing_cols:
                    cursor.execute(
                        f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"
                    )

            # Insert rows
            for row in data:
                clean_row = {sanitize_column(k): (v if v is not None else "") for k, v in row.items()}
                col_list = ", ".join([f"`{c}`" for c in columns])
                placeholders = ", ".join(["%s"] * len(columns))
                query = f"INSERT INTO `{table_name}` ({col_list}) VALUES ({placeholders})"
                values = tuple(clean_row.get(col, "") for col in columns)
                cursor.execute(query, values)

        # ----------------------------------------------------------
        # CASE 2: SINGLE DICT
        # ----------------------------------------------------------
        elif isinstance(data, dict):

            # Ensure default structure
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS `{table_name}` (
                    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    `key` TEXT,
                    `value` TEXT
                );
            """)

            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            existing = [c["Field"] for c in cursor.fetchall()]

            if "key" not in existing:
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `key` TEXT")
            if "value" not in existing:
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `value` TEXT")

            for k, v in data.items():
                cursor.execute(
                    f"INSERT INTO `{table_name}` (`key`, `value`) VALUES (%s, %s)",
                    (sanitize_column(k), str(v)),
                )

    # -----------------------------------------------------------------
    # Save to DB
    # -----------------------------------------------------------------
    def save_news(self, table_name: str, news_list: list):
        db_name = config.DB_NEWS
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(db_name)
            with conn.cursor() as cursor:
                self.create_and_insert_table(table_name, news_list, cursor)
                conn.commit()
            conn.close()

            return {
                "status": "success",
                "database": db_name,
                "table": table_name,
                "records": len(news_list),
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MySQL Save Error: {str(e)}")

    # -----------------------------------------------------------------
    # Fetch + Save
    # -----------------------------------------------------------------
    def fetch_and_save(self, table_name: str, endpoint: str, payload: dict):
        response = self.fetch(endpoint, payload)
        results = self.extract_results(endpoint, response)

        if not isinstance(results, list):
            raise HTTPException(status_code=500, detail="Invalid response format")

        return self.save_news(table_name, results)

    # -----------------------------------------------------------------
    # Cron Job
    # -----------------------------------------------------------------
    def daily_job(self):
        print("🔵 Running Daily Govt News Job...")

        try:
            self.fetch_and_save(
                "news_on_air",
                "/news/news-on-air/dataservices/getnewsonair",
                {"mustFilter": [], "pageNumber": 1, "pageSize": 15},
            )

            self.fetch_and_save(
                "pib_ministry",
                "/news/pib-news/dataservices/getpibministry",
                {"pageNumber": 1, "pageSize": 100},
            )

            self.fetch_and_save(
                "pib_news",
                "/news/pib-news/dataservices/getpibnews",
                {"npiFilters": [], "pageNumber": 1, "pageSize": 15},
            )

            self.fetch_and_save(
                "dd_news",
                "/news/dd-news/dataservices/getddnews",
                {"mustFilter": [], "pageNumber": 1, "pageSize": 15},
            )

            print("🟢 Govt News Fetch Completed")
        except Exception as e:
            print("❌ Gov news daily job error:", e)

    def start_cron(self, hour: int = 4, minute: int = 0):
        self.scheduler.add_job(self.daily_job, "cron", hour=hour, minute=minute)
        self.scheduler.start()
        print(f"🕒 Daily Gov News Cron Started ({hour:02d}:{minute:02d})")


# Singleton Instance
gov_news_service = GovNewsCombinedService()