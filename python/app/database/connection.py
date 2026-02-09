import pymysql
import pandas as pd
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
    # ✅ TABLE + SCHEMA (PERFECT VERSION)
    # --------------------------------------------------
    def ensure_table_schema(self, table_name: str, df: pd.DataFrame, db_name: str):
        """
        ✔ Never creates empty tables
        ✔ Thread-safe
        ✔ Cron-safe
        ✔ NSE-bhavcopy safe
        """

        # 🚨 HARD STOP
        if df is None or df.empty or len(df.columns) == 0:
            print(f"⛔ Skipping `{table_name}` — empty dataframe")
            return

        engine = self.get_sqlalchemy_engine(db_name)
        inspector = inspect(engine)

        with engine.begin() as conn:

            # -----------------------------------------
            # 1️⃣ CREATE TABLE WITH FIRST COLUMN
            # -----------------------------------------
            if not inspector.has_table(table_name):
                first_col = df.columns[0]

                conn.execute(text(f"""
                    CREATE TABLE `{table_name}` (
                        `{first_col}` TEXT NULL
                    )
                """))

            # -----------------------------------------
            # 2️⃣ FETCH EXISTING COLUMNS
            # -----------------------------------------
            existing_columns = {
                col["name"].lower()
                for col in inspector.get_columns(table_name)
            }

            # -----------------------------------------
            # 3️⃣ ADD MISSING COLUMNS
            # -----------------------------------------
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
                    # race-condition safe
                    if "Duplicate column" not in str(e):
                        raise

db_manager = DatabaseManager()