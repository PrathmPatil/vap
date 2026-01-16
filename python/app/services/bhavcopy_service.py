import requests
import zipfile
import io
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import os, re
from app.config import config
from app.database.connection import db_manager
from app.utils.helpers import sanitize_column_name
import math

class BhavcopyService:
    def __init__(self):
        self.expected_files = ["bc", "bh", "corpbond", "gl", "hl", "pd", "pr", "sme", "tt", "mcap", "fo", "debt", "eq"]
        self.headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        }
        db_manager.ensure_database(config.DB_BHAVCOPY)

    def process_zip_for_date(self, date_obj):
        """Process bhavcopy data for a specific date"""
        date_str = date_obj.strftime("%d%m%y")
        url = config.NSE_BHAVCOPY_URL.format(date=date_str)
        
        result_data = {}
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code != 200:
                return {"date": str(date_obj.date()), "status": "FAILED", "reason": f"HTTP {response.status_code}"}

            zip_bytes = io.BytesIO(response.content)
            with zipfile.ZipFile(zip_bytes) as z:
                found_files = set()

                for file_name in z.namelist():
                    if not file_name.endswith(".csv"):
                        continue
                    
                    base = os.path.splitext(os.path.basename(file_name))[0]
                    base = re.sub(r"\d+", "", base).lower()
                    found_files.add(base)

                    with z.open(file_name) as csv_file:
                        try:
                            df = pd.read_csv(csv_file, on_bad_lines="skip")
                        except UnicodeDecodeError:
                            csv_file.seek(0)
                            df = pd.read_csv(csv_file, on_bad_lines="skip", encoding="latin1")

                        # Clean column names
                        df.columns = [sanitize_column_name(col) for col in df.columns]
                        df["source_date"] = date_obj.date()
                        df["status"] = "OK"

                        # Ensure table schema and insert data
                        db_manager.ensure_table_schema(base, df, config.DB_BHAVCOPY)
                        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
                        df.to_sql(name=base, con=engine, if_exists="append", index=False)

                        result_data[base] = df.head(5).to_dict(orient="records")

                # Handle missing files
                for expected in self.expected_files:
                    if expected not in found_files:
                        df_missing = pd.DataFrame([{"source_date": date_obj.date(), "status": "MISSING"}])
                        db_manager.ensure_table_schema(expected, df_missing, config.DB_BHAVCOPY)
                        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
                        df_missing.to_sql(name=expected, con=engine, if_exists="append", index=False)
                        result_data[expected] = [{"source_date": str(date_obj.date()), "status": "MISSING"}]

            return {"date": str(date_obj.date()), "status": "SUCCESS", "data": result_data}

        except Exception as e:
            return {"date": str(date_obj.date()), "status": "ERROR", "message": str(e)}

    def fetch_bhavcopy_range(self, start_date: str, end_date: str):
        """Fetch bhavcopy data for a date range"""
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")

        date_list = [start + timedelta(days=i) for i in range((end - start).days + 1)]
        
        results = []
        with ThreadPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
            futures = [executor.submit(self.process_zip_for_date, d) for d in date_list]
            for future in as_completed(futures):
                results.append(future.result())

        return results

    def fetch_today_bhavcopy(self):
        """
        Fetch today's Bhavcopy data, process it, save into the database,
        and return a JSON-safe result (no NaN values).
        """
        today = datetime.now().date()
        print(f"Fetching Bhavcopy for {today}")

        try:
            # ✅ Pass a datetime object (not string)
            result = self.process_zip_for_date(datetime.combine(today, datetime.min.time()))

            def clean_value(value):
                """Clean non-JSON-safe values (NaN, datetime, etc.)."""
                if isinstance(value, float) and math.isnan(value):
                    return 0
                elif isinstance(value, (datetime,)):
                    return value.strftime("%Y-%m-%d")
                elif isinstance(value, timedelta):
                    return str(value)
                elif value is None:
                    return ""
                return value

            # ✅ Recursively clean all data before returning
            if "data" in result:
                for table_name, records in result["data"].items():
                    cleaned_records = []
                    for rec in records:
                        cleaned_rec = {k: clean_value(v) for k, v in rec.items()}
                        cleaned_records.append(cleaned_rec)
                    result["data"][table_name] = cleaned_records

            return {
                "status": result.get("status", "UNKNOWN"),
                "date": today.strftime("%Y-%m-%d"),
                "data": result.get("data", {}),
                "message": result.get("message", "")
            }

        except Exception as e:
            return {
                "status": "error",
                "date": today.strftime("%Y-%m-%d"),
                "message": str(e),
                "data": {}
            }
bhavcopy_service = BhavcopyService()