import pymysql
from fastapi import HTTPException
from datetime import datetime
from app.config import config
from app.database.connection import db_manager


def sanitize_column(name: str) -> str:
    """Replace invalid SQL characters."""
    return name.replace(" ", "_").replace("-", "_").replace("/", "_")


class BseAnnouncementService:

    def __init__(self):
        print("✅ BseAnnouncementService initialized")

    def ensure_database_exists(self, db_name):
        """Create database dynamically if not exists."""
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

    def create_and_insert_table(self, table_name, data, cursor):
        """Creates table dynamically and inserts announcement data."""
        
        if not data:
            return

        # -------------------------------------------
        # CASE 1: data is a list of dicts
        # -------------------------------------------
        if isinstance(data, list) and isinstance(data[0], dict):
            
            # Collect dynamic columns
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

            # Insert rows
            for row in data:
                clean_row = {sanitize_column(k): v for k, v in row.items()}
                placeholders = ", ".join(["%s"] * len(columns))
                query = f"INSERT INTO `{table_name}` ({', '.join(columns)}) VALUES ({placeholders})"
                cursor.execute(query, tuple(clean_row.get(col, "") for col in columns))

        # -------------------------------------------
        # CASE 2: data is a single dict
        # -------------------------------------------
        elif isinstance(data, dict):

            cursor.execute(
                f"CREATE TABLE IF NOT EXISTS `{table_name}` (`key` TEXT, `value` TEXT)"
            )

            for k, v in data.items():
                cursor.execute(
                    f"INSERT INTO `{table_name}` (`key`, `value`) VALUES (%s, %s)",
                    (sanitize_column(k), str(v)),
                )

    def save_announcements(self, announcements: list, table_name="bse_announcements"):
        """Save dynamic announcements from BSE into MySQL."""

        db_name = config.DB_BSE   # Must exist in .env
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(db_name)
            with conn.cursor() as cursor:
                self.create_and_insert_table(table_name, announcements, cursor)
                conn.commit()
            conn.close()

            return {
                "status": "success",
                "table": table_name,
                "records": len(announcements)
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MySQL Save Error: {str(e)}")


bse_ann_service = BseAnnouncementService()
