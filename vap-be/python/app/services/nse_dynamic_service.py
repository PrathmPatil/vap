import json
import pymysql
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager


import keyword

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

    # Lowercase for checking
    check = name.lower()

    # If MySQL reserved word → prefix with "col_"
    if check in MYSQL_RESERVED or keyword.iskeyword(check):
        name = f"col_{name}"

    # If column starts with a number
    if name[0].isdigit():
        name = f"col_{name}"

    return name


# ============================================================
#  MAIN NSE SERVICE CLASS
# ============================================================

class NseDynamicService:

    def __init__(self):
        print("🔥 NseDynamicService Loaded")

    # --------------------------------------------------------
    # AUTO CREATE DATABASE
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
            raise HTTPException(status_code=500, detail=f"Database creation failed: {str(e)}")

    # --------------------------------------------------------
    # CREATE TABLE + ADD COLUMNS + INSERT
    # --------------------------------------------------------
    def create_and_insert(self, table_name: str, data, cursor):
        if not data:
            print(f"⚠ No data for table {table_name}")
            return

        # CASE 1 → LIST OF DICTS
        if isinstance(data, list) and isinstance(data[0], dict):

            # Collect columns
            cols = set()
            for row in data:
                cols.update(sanitize_column(k) for k in row.keys())
            columns = list(cols)

            # CREATE TABLE safely
            col_defs = ", ".join([f"`{col}` LONGTEXT NULL" for col in columns])
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS `{table_name}` (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    {col_defs}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            # FETCH existing columns
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            existing = {row["Field"] for row in cursor.fetchall()}

            # ADD missing columns
            for col in columns:
                if col not in existing:
                    cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` LONGTEXT NULL")
                    print(f"➕ Added column: {col}")

            # INSERT rows
            for row in data:
                cleaned = {
                    sanitize_column(k): json.dumps(v) if isinstance(v, (dict, list)) else v
                    for k, v in row.items()
                }

                values = [cleaned.get(col, None) for col in columns]
                placeholders = ",".join(["%s"] * len(columns))

                insert_sql = f"""
                    INSERT INTO `{table_name}` ({','.join([f'`{c}`' for c in columns])})
                    VALUES ({placeholders})
                """

                cursor.execute(insert_sql, values)

            print(f"✅ Inserted {len(data)} rows into {table_name}")

        # CASE 2 → SINGLE DICT
        elif isinstance(data, dict):

            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS `{table_name}` (
                    `key` VARCHAR(255),
                    `value` LONGTEXT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            for k, v in data.items():
                cursor.execute(
                    f"INSERT INTO `{table_name}` (`key`, `value`) VALUES (%s, %s)",
                    (sanitize_column(k), json.dumps(v))
                )

    # --------------------------------------------------------
    # SAVE INTO DB
    # --------------------------------------------------------
    def save(self, table_name: str, data, db_name="nse_dynamic"):
        self.ensure_database_exists(db_name)

        try:
            conn = db_manager.get_connection(db_name)
            with conn.cursor() as cursor:
                self.create_and_insert(table_name, data, cursor)
                conn.commit()
            conn.close()

            return {
                "status": "success",
                "table": table_name,
                "records": len(data) if isinstance(data, list) else 1
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MySQL Save Error: {str(e)}")


# Instantiate service
nse_dynamic = NseDynamicService()
