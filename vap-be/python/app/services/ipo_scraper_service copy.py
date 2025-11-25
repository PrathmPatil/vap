import re
import os
import requests
import pymysql
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
    """Creates table dynamically and inserts IPO data."""
    if not data:
        return

    if isinstance(data, list) and isinstance(data[0], dict):
        # Gather all columns
        columns = set()
        for row in data:
            columns.update(row.keys())
        columns = [sanitize_column(c) for c in columns]

        cols_sql = ", ".join([f"`{col}` TEXT" for col in columns])
        cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` ({cols_sql})")

        # Add missing columns dynamically
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        existing_cols = [c["Field"] for c in cursor.fetchall()]
        for col in columns:
            if col not in existing_cols:
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT")

        for row in data:
            row = {sanitize_column(k): v for k, v in row.items()}
            placeholders = ", ".join(["%s"] * len(columns))
            insert_query = f"INSERT INTO `{table_name}` ({', '.join(columns)}) VALUES ({placeholders})"
            cursor.execute(insert_query, tuple(row.get(col, "") for col in columns))

    elif isinstance(data, dict):
        cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` (`key` TEXT, `value` TEXT)")
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
        """Ensure the database exists; create if missing."""
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
            print(f"✅ Verified database: {db_name}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create database '{db_name}': {str(e)}")

    def save_to_mysql(self, data: dict):
        """Save parsed Chittorgarh IPO data into MySQL dynamically."""
        db_name = config.DB_IPO
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(db_name)
            with conn.cursor() as cursor:
                if "reportTableData" in data:
                    table_name = "chittorgarh_report_data"
                    create_and_insert_table(table_name, data["reportTableData"], cursor)
                else:
                    table_name = "chittorgarh_raw_data"
                    create_and_insert_table(table_name, [data], cursor)

                conn.commit()
            conn.close()
            return {"status": "success", "table": table_name}

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MySQL Save Error: {str(e)}")

# ---------- Singleton ----------
ipo_scraper_service = IpoScraperService()
