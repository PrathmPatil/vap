# app/services/gov_news_db_service.py

from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager


def sanitize_column(name: str) -> str:
    """Clean column names for MySQL."""
    return name.replace(" ", "_").replace("-", "_").replace("/", "_").replace(".", "_")


class GovNewsService:

    def __init__(self):
        print("✅ GovNewsService initialized")


    # ---------------------------------------------------------
    # ✔ Dynamic table creation + column creation + insertion
    # ---------------------------------------------------------
    def create_and_insert_table(self, table_name, data, cursor):
        if not data:
            return

        # -----------------------------------
        # CASE 1: LIST OF DICTS
        # -----------------------------------
        if isinstance(data, list) and isinstance(data[0], dict):

            # Collect all columns dynamically
            columns = {sanitize_column(k) for row in data for k in row.keys()}

            # Base table create
            cols_sql = ", ".join([f"`{col}` TEXT" for col in columns])
            cursor.execute(
                f"CREATE TABLE IF NOT EXISTS `{table_name}` ({cols_sql})"
            )

            # Ensure missing columns exist
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            existing_cols = [c["Field"] for c in cursor.fetchall()]

            for col in columns:
                if col not in existing_cols:
                    cursor.execute(
                        f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"
                    )

            # Insert rows
            for row in data:
                clean_row = {sanitize_column(k): v for k, v in row.items()}

                placeholders = ", ".join(["%s"] * len(columns))
                query = f"INSERT INTO `{table_name}` ({', '.join(columns)}) VALUES ({placeholders})"

                cursor.execute(
                    query,
                    tuple(clean_row.get(col, "") for col in columns)
                )

        # -----------------------------------
        # CASE 2: SINGLE DICT
        # -----------------------------------
        elif isinstance(data, dict):

            cursor.execute(
                f"CREATE TABLE IF NOT EXISTS `{table_name}` (`key` TEXT, `value` TEXT)"
            )

            for k, v in data.items():
                cursor.execute(
                    f"INSERT INTO `{table_name}` (`key`, `value`) VALUES (%s, %s)",
                    (sanitize_column(k), str(v)),
                )

    # ---------------------------------------------------------
    # ✔ Main save function
    # ---------------------------------------------------------
    def save_gov_news(self, news_data: list, table_name="gov_news"):
        db_name = config.DB_NEWS  # add in .env → DB_GOV_NEWS=gov_news_db

        try:
            # (2) Get DB connection from DatabaseManager
            conn = db_manager.get_connection(db_name)

            with conn.cursor() as cursor:
                # (3) Create table & insert all data dynamically
                self.create_and_insert_table(table_name, news_data, cursor)
                conn.commit()

            conn.close()

            return {
                "status": "success",
                "table": table_name,
                "records": len(news_data),
            }

        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Gov News Save Error: {str(e)}"
            )


gov_news_db_service = GovNewsService()
