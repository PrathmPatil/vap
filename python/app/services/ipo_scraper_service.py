import re
import requests
import pymysql
from datetime import datetime
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager

# ---------- Helper Functions ----------
def sanitize_column(col):
    col = col.strip()
    col = re.sub(r"\W+", "_", col)
    if col and col[0].isdigit():
        col = "col_" + col
    return col or "col_unknown"


def create_and_insert_table(table_name, data, cursor):
    if not data:
        return

    if isinstance(data, list) and isinstance(data[0], dict):
        columns = set()
        for row in data:
            columns.update(row.keys())
        columns = [sanitize_column(c) for c in columns]

        # Add created_at column
        cols_sql = ", ".join([f"`{col}` TEXT" for col in columns])
        cursor.execute(
            f"CREATE TABLE IF NOT EXISTS `{table_name}` ({cols_sql}, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP)"
        )

        # Add missing columns dynamically
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        existing_cols = [c["Field"] for c in cursor.fetchall()]
        for col in columns:
            if col not in existing_cols:
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT")
        if "created_at" not in existing_cols:
            cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP")

        # Insert data
        for row in data:
            row = {sanitize_column(k): v for k, v in row.items()}
            placeholders = ", ".join(["%s"] * len(columns))
            insert_query = (
                f"INSERT INTO `{table_name}` ({', '.join(columns)}) VALUES ({placeholders})"
            )
            cursor.execute(insert_query, tuple(row.get(col, "") for col in columns))

    elif isinstance(data, dict):
        cursor.execute(
            f"CREATE TABLE IF NOT EXISTS `{table_name}` (`key` TEXT, `value` TEXT, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP)"
        )
        for k, v in data.items():
            cursor.execute(
                f"INSERT INTO `{table_name}` (`key`, `value`) VALUES (%s,%s)",
                (sanitize_column(k), str(v))
            )


# ---------- IPO Scraper Service ----------
class IpoScraperService:
    def __init__(self):
        print("✅ IpoScraperService initialized")

    def ensure_database_exists(self, db_name):
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

    def get_current_date_params(self):
        now = datetime.now()
        month = now.month
        year = now.year
        fy = f"{year}-{str(year + 1)[-2:]}" if month > 3 else f"{year-1}-{str(year)[-2:]}"
        return month, year, fy

    def resolve_report_id(self, name_or_id):
        mapping = {"mainboard": 21, "sme": 22}
        if str(name_or_id).isdigit():
            return int(name_or_id)
        report_id = mapping.get(name_or_id.lower())
        if not report_id:
            raise HTTPException(status_code=400, detail=f"Invalid report type: {name_or_id}")
        return report_id

    def fetch_data_from_chittorgarh(self, report_id: int, month=None, year=None, fy=None, version="15-25"):
        if not (month and year and fy):
            month, year, fy = self.get_current_date_params()

        url = f"https://webnodejs.chittorgarh.com/cloud/report/data-read/{report_id}/1/{month}/{year}/{fy}/0/0/0?search=&v={version}"
        headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-IN,en;q=0.9',
            'origin': 'https://www.chittorgarh.com',
            'priority': 'u=1, i',
            'referer': 'https://www.chittorgarh.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
        }

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")

    def save_to_mysql(self, data: dict, table_name: str):
        db_name = config.DB_IPO
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(db_name)
            with conn.cursor() as cursor:
                if "reportTableData" in data:
                    create_and_insert_table(table_name, data["reportTableData"], cursor)
                else:
                    create_and_insert_table(table_name, [data], cursor)
                conn.commit()
            conn.close()
            return {"status": "success", "table": table_name}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MySQL Save Error: {str(e)}")

    def process_report(self, report_type_or_id, month=None, year=None, fy=None, version="15-25"):
        report_id = self.resolve_report_id(report_type_or_id)
        data = self.fetch_data_from_chittorgarh(report_id, month, year, fy, version)
        table_name = f"{report_type_or_id.lower()}_data"
        result = self.save_to_mysql(data, table_name)
        return {
            "status": "ok",
            "report_type": report_type_or_id,
            "report_id": report_id,
            "table": result["table"],
            "records": len(data.get("reportTableData", [])),
        }

ipo_scraper_service = IpoScraperService()
