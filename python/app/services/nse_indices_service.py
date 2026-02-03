import json
import pymysql
import keyword
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager

# ------------------------------
# MySQL reserved keywords
# ------------------------------
MYSQL_RESERVED = {
    "index", "key", "open", "close", "change", "date", "group", "order",
    "desc", "asc", "limit", "table", "column", "values", "primary", "json"
}


def sanitize_column(name: str) -> str:
    name = (
        name.replace(" ", "_")
            .replace("-", "_")
            .replace("/", "_")
            .replace(".", "_")
            .replace("(", "")
            .replace(")", "")
            .replace("%", "percent")
            .replace("&", "and")
    )

    check = name.lower()

    if check in MYSQL_RESERVED or keyword.iskeyword(check):
        name = f"col_{name}"

    if name and name[0].isdigit():
        name = f"col_{name}"

    return name.lower()


# ============================================================
#  NSE DYNAMIC SERVICE (DUPLICATE SAFE)
# ============================================================

class NseIndicesService:

    def __init__(self):
        print("🔥 NseIndicesService Loaded")

    # --------------------------------------------------------
    # ENSURE DATABASE
    # --------------------------------------------------------
    def ensure_database_exists(self, db_name: str):
        try:
            root_conn = pymysql.connect(
                host=config.DB_HOST,
                user=config.DB_USER,
                password=config.DB_PASSWORD,
                charset="utf8mb4",
                cursorclass=pymysql.cursors.DictCursor
            )

            with root_conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")

            root_conn.close()
            print(f"🗄 Database Ready → {db_name}")

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Database creation failed: {str(e)}"
            )

    # --------------------------------------------------------
    # CREATE TABLE + UPSERT (NO DUPLICATES)
    # --------------------------------------------------------
    def create_and_upsert(self, table_name: str, data: list, cursor):
        if not data:
            print(f"⚠ No data for table {table_name}")
            return 0

        if not isinstance(data, list) or not isinstance(data[0], dict):
            return 0

        # Normalize columns
        columns_map = {}
        for row in data:
            for k in row.keys():
                col = sanitize_column(k)
                columns_map[col] = col

        columns = list(columns_map.values())

        # Create table
        col_defs = ", ".join([f"`{c}` LONGTEXT NULL" for c in columns])
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                {col_defs},
                UNIQUE KEY uq_{table_name} (col_key, indexsymbol)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # Existing columns
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        existing_cols = {r["Field"].lower() for r in cursor.fetchall()}

        for col in columns:
            if col.lower() not in existing_cols:
                cursor.execute(
                    f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` LONGTEXT NULL"
                )

        # UPSERT
        unique_keys = {"col_key", "indexsymbol"}

        update_clause = ", ".join(
            f"`{c}` = VALUES(`{c}`)"
            for c in columns
            if c.lower() not in unique_keys
        )

        inserted = 0

        for row in data:
            cleaned = {
                sanitize_column(k): (
                    json.dumps(v) if isinstance(v, (dict, list)) else v
                )
                for k, v in row.items()
            }

            values = [cleaned.get(col) for col in columns]
            placeholders = ",".join(["%s"] * len(columns))

            sql = f"""
                INSERT INTO `{table_name}`
                ({",".join(f"`{c}`" for c in columns)})
                VALUES ({placeholders})
                ON DUPLICATE KEY UPDATE
                {update_clause}
            """

            cursor.execute(sql, values)
            inserted += cursor.rowcount

        return inserted

    # --------------------------------------------------------
    # PUBLIC SAVE METHOD
    # --------------------------------------------------------
    def save(self, table_name: str, data, db_name="nse_indices"):
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(
                db_name=db_name,
                dict_cursor=True
            )

            with conn.cursor() as cursor:
                records = self.create_and_upsert(table_name, data, cursor)
                conn.commit()

            conn.close()

            return {
                "status": "success",
                "table": table_name,
                "affected_rows": records
            }

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"MySQL Save Error: {str(e)}"
            )


# ✅ SINGLETON
nse_indices = NseIndicesService()
