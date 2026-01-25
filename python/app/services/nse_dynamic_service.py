import json
import pymysql
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager
import keyword


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
#  NSE DYNAMIC SERVICE
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
            raise HTTPException(
                status_code=500,
                detail=f"Database creation failed: {str(e)}"
            )

    # --------------------------------------------------------
    # CREATE TABLE + ADD COLUMNS + INSERT
    # --------------------------------------------------------
    def create_and_insert(self, table_name: str, data, cursor):
        if not data:
            print(f"⚠ No data for table {table_name}")
            return 0

        # ------------------------------
        # CASE 1 → LIST OF DICTS
        # ------------------------------
        if isinstance(data, list) and isinstance(data[0], dict):

           # Normalize + deduplicate columns safely
            columns_map = {}

            for row in data:
                for k in row.keys():
                    col = sanitize_column(k)
                    columns_map[col.lower()] = col  # ensure uniqueness

            columns = list(columns_map.values())

            # Create table
            col_defs = ", ".join([f"`{col}` LONGTEXT NULL" for col in columns])
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS `{table_name}` (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    {col_defs}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)

            # 🔥 FIX: DictCursor-safe column fetch
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            existing = {row["Field"].lower() for row in cursor.fetchall()}

            # Add missing columns
            for col in columns:
                if col.lower() not in existing:
                    cursor.execute(
                        f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` LONGTEXT NULL"
                    )
                    print(f"➕ Added column: {col}")

            # Insert rows
            for row in data:
                cleaned = {
                    sanitize_column(k): (
                        json.dumps(v) if isinstance(v, (dict, list)) else v
                    )
                    for k, v in row.items()
                }

                values = [cleaned.get(col) for col in columns]
                placeholders = ",".join(["%s"] * len(columns))

                insert_sql = f"""
                    INSERT INTO `{table_name}`
                    ({",".join([f"`{c}`" for c in columns])})
                    VALUES ({placeholders})
                """

                cursor.execute(insert_sql, values)

            print(f"✅ Inserted {len(data)} rows into {table_name}")
            return len(data)

        # ------------------------------
        # CASE 2 → SINGLE DICT
        # ------------------------------
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

            return len(data)

        return 0

    # --------------------------------------------------------
    # SAVE INTO DB
    # --------------------------------------------------------
    def save(self, table_name: str, data, db_name="nse_dynamic"):
        self.ensure_database_exists(db_name)

        try:
            # 🔥 FIX: FORCE DictCursor
            conn = db_manager.get_connection(
                db_name=db_name,
                dict_cursor=True
            )

            with conn.cursor() as cursor:
                records = self.create_and_insert(table_name, data, cursor)
                conn.commit()

            conn.close()

            return {
                "status": "success",
                "table": table_name,
                "records": records
            }

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"MySQL Save Error: {str(e)}"
            )


# ✅ Singleton
nse_dynamic = NseDynamicService()
