import requests
import zipfile
import io
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import os, re
from sqlalchemy import MetaData, Table, inspect, text
from sqlalchemy.dialects.mysql import insert

from app.config import config
from app.database.connection import db_manager
from app.utils.helpers import sanitize_column_name


# =========================================================
# 🔥 CLEAN DATAFRAME FOR MYSQL
# =========================================================
def clean_dataframe_for_mysql(df: pd.DataFrame) -> pd.DataFrame:
    """
    Force-clean dataframe so MySQL NEVER sees NaN / NaT / inf
    """
    df = df.astype(object)
    df = df.replace(
        [pd.NA, pd.NaT, float("nan"), float("inf"), float("-inf")],
        None
    )
    return df


# =========================================================
# SERVICE CLASS
# =========================================================
class BhavcopyService:
    def __init__(self):
        self.expected_files = [
            "bc", "bh", "corpbond", "gl", "hl",
            "pd", "pr", "sme", "tt", "mcap", "fo", "debt", "eq"
        ]

        self.headers = {
            "accept": "*/*",
            "user-agent": "Mozilla/5.0"
        }

    # -----------------------------------------------------
    # 🔥 ENSURE TABLE + COLUMNS + AUTO ID
    # -----------------------------------------------------
    def ensure_table_schema_with_id(self, table_name, df):
        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
        inspector = inspect(engine)

        with engine.begin() as conn:

            # 1️⃣ CREATE TABLE IF NOT EXISTS
            if not inspector.has_table(table_name):
                df.head(0).to_sql(
                    table_name,
                    conn,
                    index=False,
                    if_exists="append"
                )

            # Refresh inspector
            inspector = inspect(engine)
            columns = [col["name"] for col in inspector.get_columns(table_name)]

            # 2️⃣ ADD MISSING DATAFRAME COLUMNS
            for column in df.columns:
                if column not in columns:
                    conn.execute(
                        text(
                            f"ALTER TABLE `{table_name}` "
                            f"ADD COLUMN `{column}` TEXT NULL"
                        )
                    )

            # Refresh columns again
            inspector = inspect(engine)
            columns = [col["name"] for col in inspector.get_columns(table_name)]

            # 3️⃣ ENSURE ID COLUMN EXISTS
            if "id" not in columns:
                print(f"🔧 Adding ID column to {table_name}")

                conn.execute(
                    text(
                        f"""
                        ALTER TABLE `{table_name}`
                        ADD COLUMN `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST
                        """
                    )
                )

    # -----------------------------------------------------
    # UPSERT (NO DUPLICATES, SAFE ON SERVER)
    # -----------------------------------------------------
    def upsert_dataframe(self, table_name, df):
        if df is None or df.empty:
            return

        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)

        # 🔥 Ensure table + id + columns
        self.ensure_table_schema_with_id(table_name, df)

        meta = MetaData()
        table = Table(table_name, meta, autoload_with=engine)

        records = df.to_dict(orient="records")
        if not records:
            return

        stmt = insert(table).values(records)

        # 🔥 Do NOT update ID column
        update_cols = {
            c.name: stmt.inserted[c.name]
            for c in table.columns
            if c.name != "id"
        }

        stmt = stmt.on_duplicate_key_update(**update_cols)

        with engine.begin() as conn:
            conn.execute(stmt)

    # -----------------------------------------------------
    # PROCESS SINGLE DATE
    # -----------------------------------------------------
    def process_zip_for_date(self, date_obj: datetime):
        date_str = date_obj.strftime("%d%m%y")
        url = config.NSE_BHAVCOPY_URL.format(date=date_str)
        result_data = {}

        try:
            resp = requests.get(url, headers=self.headers, timeout=30)
            if resp.status_code != 200:
                return {"date": str(date_obj.date()), "status": "FAILED"}

            zip_bytes = io.BytesIO(resp.content)

            with zipfile.ZipFile(zip_bytes) as z:
                found_files = set()

                for file_name in z.namelist():
                    if not file_name.endswith(".csv"):
                        continue

                    base = re.sub(r"\d+", "", os.path.splitext(file_name)[0]).lower()
                    found_files.add(base)

                    with z.open(file_name) as f:
                        df = pd.read_csv(f, on_bad_lines="skip", encoding="latin1")

                        df.columns = [sanitize_column_name(c) for c in df.columns]
                        df["source_date"] = date_obj.date()
                        df["status"] = "OK"

                        df = clean_dataframe_for_mysql(df)

                        # 🔥 Upsert (auto schema + id handled inside)
                        self.upsert_dataframe(base, df)

                        result_data[base] = df.head(5).to_dict(orient="records")

                # Handle missing expected files
                for expected in self.expected_files:
                    if expected not in found_files:
                        df_missing = pd.DataFrame(
                            [{"source_date": date_obj.date(), "status": "MISSING"}]
                        )
                        df_missing = clean_dataframe_for_mysql(df_missing)

                        self.upsert_dataframe(expected, df_missing)

                        result_data[expected] = df_missing.to_dict(orient="records")

            return {
                "date": str(date_obj.date()),
                "status": "SUCCESS",
                "data": result_data
            }

        except Exception as e:
            return {
                "date": str(date_obj.date()),
                "status": "ERROR",
                "message": str(e)
            }

    # -----------------------------------------------------
    # DATE RANGE
    # -----------------------------------------------------
    def fetch_bhavcopy_range(self, start_date: str, end_date: str):
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        dates = [
            start + timedelta(days=i)
            for i in range((end - start).days + 1)
        ]

        results = []

        with ThreadPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
            futures = [
                executor.submit(self.process_zip_for_date, d)
                for d in dates
            ]

            for f in as_completed(futures):
                results.append(f.result())

        return results

    # -----------------------------------------------------
    # TODAY
    # -----------------------------------------------------
    def fetch_today_bhavcopy(self):
        today = datetime.now().date()
        return self.process_zip_for_date(
            datetime.combine(today, datetime.min.time())
        )


# ✅ SINGLE INSTANCE
bhavcopy_service = BhavcopyService()
