import pymysql
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager


def sanitize_column(name: str) -> str:
    return name.replace(" ", "_").replace("-", "_").replace("/", "_")


class BseAnnouncementService:

    def __init__(self):
        print("✅ BseAnnouncementService initialized")

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

    def create_and_insert_table(self, cursor, data):
        """Creates `announcements` table and inserts data."""

        table_name = "announcements"

        if not data:
            return

        # If list of rows
        if isinstance(data, list) and isinstance(data[0], dict):

            # Extract dynamic columns
            columns = set()
            for row in data:
                columns.update(row.keys())

            columns = [sanitize_column(c) for c in columns]
            cols_sql = ", ".join([f"`{col}` TEXT" for col in columns])

            # Create table if not exists
            cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` ({cols_sql})")

            # Add missing columns
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

    def save_announcements(self, announcements, table_name="announcements"):
        if not announcements:
            return 0

        inserted = 0
        conn = None

        try:
            conn = db_manager.get_connection(config.DB_ANNOUNCEMENT_DB_NAME)

            with conn.cursor(pymysql.cursors.DictCursor) as cursor:

                # -------- 1️⃣ Collect All Columns ----------
                all_columns = set()
                for row in announcements:
                    all_columns.update(row.keys())

                columns = [sanitize_column(col) for col in all_columns]

                column_definitions = []

                for col in columns:
                    if col == "NEWSID":
                        column_definitions.append(f"`{col}` VARCHAR(50)")
                    else:
                        column_definitions.append(f"`{col}` TEXT")

                column_sql = ", ".join(column_definitions)

                # -------- 2️⃣ Create Table ----------
                cursor.execute(f"""
                    CREATE TABLE IF NOT EXISTS `{table_name}` (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        {column_sql},
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_news (NEWSID)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)

                # -------- 3️⃣ Add Missing Columns ----------
                cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
                existing_cols = [col["Field"] for col in cursor.fetchall()]

                for col in columns:
                    if col not in existing_cols:
                        if col == "NEWSID":
                            cursor.execute(
                                f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` VARCHAR(50)"
                            )
                        else:
                            cursor.execute(
                                f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"
                            )

                # -------- 4️⃣ Insert Data ----------
                placeholders = ", ".join(["%s"] * len(columns))

                insert_sql = f"""
                    INSERT IGNORE INTO `{table_name}`
                    ({', '.join(columns)})
                    VALUES ({placeholders})
                """

                for row in announcements:
                    clean_row = {
                        sanitize_column(k): str(v) if v is not None else None
                        for k, v in row.items()
                    }

                    values = [clean_row.get(col) for col in columns]

                    cursor.execute(insert_sql, values)
                    inserted += cursor.rowcount

            conn.commit()

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        finally:
            if conn:
                conn.close()

        return inserted

bse_ann_service = BseAnnouncementService()
