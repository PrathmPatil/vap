import pymysql
from sqlalchemy import create_engine, inspect, text
from urllib.parse import quote_plus
from app.config import config


class DatabaseManager:
    def __init__(self):
        self.config = config

    # --------------------------------------------------
    # PYMYSQL CONNECTION
    # --------------------------------------------------
    def get_connection(self, db_name=None, dict_cursor=False):
        cursorclass = (
            pymysql.cursors.DictCursor
            if dict_cursor
            else pymysql.cursors.Cursor
        )

        return pymysql.connect(
            host=self.config.DB_HOST,
            user=self.config.DB_USER,
            password=self.config.DB_PASSWORD,
            database=db_name,
            port=self.config.DB_PORT,
            cursorclass=cursorclass,
            autocommit=False
        )

    # --------------------------------------------------
    # SQLALCHEMY ENGINE
    # --------------------------------------------------
    def get_sqlalchemy_engine(self, db_name):
        encoded_password = quote_plus(self.config.DB_PASSWORD)
        return create_engine(
            f"mysql+pymysql://{self.config.DB_USER}:{encoded_password}"
            f"@{self.config.DB_HOST}:{self.config.DB_PORT}/{db_name}",
            pool_pre_ping=True
        )

    # --------------------------------------------------
    # DATABASE
    # --------------------------------------------------
    def ensure_database(self, db_name):
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        conn.commit()
        cur.close()
        conn.close()

    # --------------------------------------------------
    # 🔥 TABLE + SCHEMA (FINAL VERSION)
    # --------------------------------------------------
    def ensure_table_schema(
        self,
        table_name: str,
        df,
        db_name: str,
        with_id: bool = True
    ):
        """
        ✔ Creates table if not exists
        ✔ Optional AUTO_INCREMENT id
        ✔ Adds missing columns only
        ✔ Cron safe
        ✔ Docker safe
        """

        engine = self.get_sqlalchemy_engine(db_name)
        inspector = inspect(engine)

        with engine.begin() as conn:
            # -----------------------------
            # 1️⃣ Create table if not exists
            # -----------------------------
            if not inspector.has_table(table_name):
                if with_id:
                    conn.execute(text(f"""
                        CREATE TABLE `{table_name}` (
                            id BIGINT AUTO_INCREMENT PRIMARY KEY
                        )
                    """))
                else:
                    conn.execute(text(f"""
                        CREATE TABLE `{table_name}` ()
                    """))

            # -----------------------------
            # 2️⃣ Fetch existing columns
            # -----------------------------
            existing_columns = {
                col["name"].lower()
                for col in inspector.get_columns(table_name)
            }

            # -----------------------------
            # 3️⃣ Add missing DataFrame columns
            # -----------------------------
            for column in df.columns:
                col_l = column.lower()
                if col_l in existing_columns:
                    continue

                try:
                    conn.execute(text(f"""
                        ALTER TABLE `{table_name}`
                        ADD COLUMN `{column}` TEXT NULL
                    """))
                except Exception as e:
                    # Ignore race condition
                    if "Duplicate column" not in str(e):
                        raise


# ✅ SINGLETON
db_manager = DatabaseManager()
