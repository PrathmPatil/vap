import requests
import zipfile
import io
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import os, re
from sqlalchemy import MetaData, Table, inspect, text
from sqlalchemy.dialects.mysql import insert
import logging
import time
from typing import List, Dict, Any, Optional, Tuple

from app.config import config
from app.database.connection import db_manager
from app.utils.helpers import sanitize_column_name

logger = logging.getLogger(__name__)

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

        # Enhanced headers to avoid blocking
        self.headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "referer": "https://www.nseindia.com/",
            "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        
        # Session for maintaining cookies
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.processed_dates = set()  # Track processed dates in current run
        self.verbose_logging = os.getenv("BHAVCOPY_VERBOSE_LOGS", "true").lower() in (
            "true",
            "1",
            "yes",
            "y",
        )

    def _info(self, message: str):
        if self.verbose_logging:
            logger.info(message)

    def _with_duration(self, started_at: float, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload["duration_seconds"] = round(time.perf_counter() - started_at, 3)
        return payload

    def ensure_bhavcopy_database(self):
        db_manager.ensure_database(config.DB_BHAVCOPY)

    def build_bhavcopy_urls(self, date_obj: datetime) -> List[str]:
        """Build the NSE PR bhavcopy zip URL for a trade date (DDMMYY)."""
        ddmmyy = date_obj.strftime("%d%m%y")
        template = config.NSE_BHAVCOPY_URL

        if "{year}" in template and "{month}" in template:
            return [
                template.format(
                    year=date_obj.strftime("%Y"),
                    month=date_obj.strftime("%b").upper(),
                    date=date_obj.strftime("%d"),
                )
            ]

        if "{date}" not in template:
            raise ValueError(
                "NSE_BHAVCOPY_URL must include {date} placeholder "
                "(example: https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{date}.zip)"
            )

        return [template.format(date=ddmmyy)]

    def build_bhavcopy_url(self, date_obj: datetime) -> str:
        return self.build_bhavcopy_urls(date_obj)[0]

    def latest_trade_date(self, from_date: Optional[datetime] = None) -> datetime:
        """Return the most recent weekday on or before from_date."""
        target = (from_date or datetime.now()).date()
        while target.weekday() >= 5:
            target -= timedelta(days=1)
        return datetime.combine(target, datetime.min.time())

    def resolve_table_name(self, file_name: str) -> str:
        stem = os.path.splitext(os.path.basename(file_name))[0].lower()
        if stem.startswith("bhavcopy_nse_cm"):
            return "eq"
        if stem.startswith("sec_bhavdata_full"):
            return "eq"
        return re.sub(r"\d+", "", stem).lower() or "eq"

    def is_trade_date_processed(self, date_obj: datetime) -> bool:
        """True when core bhavcopy segments exist for the trade date."""
        for table_name in ("pr", "eq"):
            if self.is_date_processed(table_name, date_obj):
                return True
        return False

    def process_csv_bytes(
        self,
        csv_bytes: bytes,
        file_name: str,
        date_obj: datetime,
        force_refresh: bool,
        result_data: Dict[str, Any],
        source_url: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> int:
        table_name = self.resolve_table_name(file_name)
        date_key = date_obj.date()

        if not force_refresh and self.is_date_processed(table_name, date_obj):
            self._info(f"⏭ {table_name} data for {date_key} already exists, skipping")
            result_data[table_name] = {"status": "ALREADY_EXISTS"}
            return 0

        self._info(f"📄 Processing {table_name} for {date_key}")
        try:
            df = pd.read_csv(io.BytesIO(csv_bytes), on_bad_lines="skip", encoding="latin1")
        except Exception:
            df = pd.read_csv(io.BytesIO(csv_bytes), on_bad_lines="skip", encoding="utf-8")

        df.columns = [sanitize_column_name(c) for c in df.columns]
        df["source_date"] = date_key
        df["fetched_at"] = datetime.now()
        df["status"] = "OK"
        if source_file:
            df["source_file"] = source_file
        if source_url:
            df["source_url"] = source_url

        df = clean_dataframe_for_mysql(df)
        self.upsert_dataframe(table_name, df, skip_row_checks=True)

        result_data[table_name] = {
            "status": "SUCCESS",
            "records": len(df),
            "sample": df.head(3).to_dict(orient="records"),
        }
        return 1

    # -----------------------------------------------------
    # 🔥 GET NSE COOKIES FIRST (IMPORTANT!)
    # -----------------------------------------------------
    def get_nse_cookies(self):
        """Get initial cookies from NSE before downloading"""
        try:
            self._info("🍪 Getting NSE cookies...")
            for warmup_url in (
                "https://www.nseindia.com/",
                "https://www.nseindia.com/all-reports",
            ):
                self.session.get(warmup_url, timeout=30)
                time.sleep(1)
            return True
        except Exception as e:
            logger.error(f"Failed to get NSE cookies: {e}")
            return False

    def download_bhavcopy(self, date_obj: datetime) -> Tuple[Optional[requests.Response], Optional[str]]:
        """Download bhavcopy from the configured PR zip URL."""
        self.get_nse_cookies()
        url = self.build_bhavcopy_url(date_obj)
        self._info(f"🔗 Fetching bhavcopy: {url}")

        try:
            resp = self.session.get(url, timeout=30)
        except requests.exceptions.RequestException as exc:
            logger.error(f"Network error for {url}: {exc}")
            return None, None

        if resp.status_code == 404:
            logger.warning(f"Bhavcopy not found: {url}")
            return None, None

        if resp.status_code != 200:
            logger.error(f"Bhavcopy request failed ({resp.status_code}): {url}")
            return None, None

        return resp, url

    def process_downloaded_bhavcopy(
        self,
        resp: requests.Response,
        source_url: str,
        date_obj: datetime,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        result_data: Dict[str, Any] = {}
        files_processed = 0
        date_key = date_obj.date()

        if source_url.endswith(".csv"):
            file_name = os.path.basename(source_url)
            files_processed += self.process_csv_bytes(
                resp.content,
                file_name,
                date_obj,
                force_refresh,
                result_data,
                source_url=source_url,
                source_file=file_name,
            )
            return {
                "files_processed": files_processed,
                "data": result_data,
            }

        zip_bytes = io.BytesIO(resp.content)
        with zipfile.ZipFile(zip_bytes) as z:
            found_files = set()

            for file_name in z.namelist():
                if not file_name.endswith(".csv"):
                    continue

                base = self.resolve_table_name(file_name)
                found_files.add(base)

                with z.open(file_name) as f:
                    files_processed += self.process_csv_bytes(
                        f.read(),
                        file_name,
                        date_obj,
                        force_refresh,
                        result_data,
                        source_url=source_url,
                        source_file=file_name,
                    )

            for expected in self.expected_files:
                if expected not in found_files:
                    if not force_refresh and self.is_date_processed(expected, date_obj):
                        continue

                    self._info(f"📝 Creating MISSING record for {expected} on {date_key}")
                    df_missing = pd.DataFrame([{
                        "source_date": date_key,
                        "status": "MISSING",
                        "fetched_at": datetime.now(),
                    }])
                    df_missing = clean_dataframe_for_mysql(df_missing)
                    self.upsert_dataframe(expected, df_missing)
                    result_data[expected] = {"status": "MISSING"}

        return {
            "files_processed": files_processed,
            "data": result_data,
        }

    # -----------------------------------------------------
    # 🔥 CHECK IF DATE ALREADY PROCESSED
    # -----------------------------------------------------
    def is_date_processed(self, table_name: str, date_obj: datetime) -> bool:
        """Check if data for this date already exists in database"""
        self.ensure_bhavcopy_database()
        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
        date_str = date_obj.date()
        
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text(
                        f"SELECT COUNT(*) FROM `{table_name}` "
                        f"WHERE source_date = :date_val LIMIT 1"
                    ),
                    {"date_val": date_str}
                ).scalar()
                
                return result > 0 if result else False
        except Exception as e:
            logger.warning(f"Could not check processed date for {table_name}: {e}")
            return False

    # -----------------------------------------------------
    # 🔥 ENSURE TABLE + COLUMNS + AUTO ID + INDEXES
    # -----------------------------------------------------
    def ensure_table_schema_with_id(self, table_name, df):
        self.ensure_bhavcopy_database()
        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
        inspector = inspect(engine)

        with engine.begin() as conn:
            if not inspector.has_table(table_name):
                self._info(f"🛠 Creating table: {table_name}")
                df.head(0).to_sql(table_name, conn, index=False, if_exists="append")

            inspector = inspect(engine)
            columns = {col["name"].lower() for col in inspector.get_columns(table_name)}

            for column in df.columns:
                if column.lower() not in columns:
                    self._info(f"➕ Adding column {column} to {table_name}")
                    try:
                        conn.execute(text(f"ALTER TABLE `{table_name}` ADD COLUMN `{column}` TEXT NULL"))
                    except Exception as exc:
                        if "Duplicate column" not in str(exc):
                            raise

            inspector = inspect(engine)
            column_names = [col["name"] for col in inspector.get_columns(table_name)]

            if "id" not in {name.lower() for name in column_names}:
                self._info(f"🔧 Adding ID column to {table_name}")
                conn.execute(text(f"ALTER TABLE `{table_name}` ADD COLUMN `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST"))
            
            # Create index on source_date for faster queries
            index_name = f"idx_{table_name}_source_date"
            try:
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS `{index_name}` ON `{table_name}` (`source_date`)"))
            except Exception as e:
                logger.debug(f"Index creation skipped for {table_name}: {e}")

    # -----------------------------------------------------
    # UPSERT (NO DUPLICATES, SAFE ON SERVER)
    # -----------------------------------------------------
    def upsert_dataframe(self, table_name, df, skip_row_checks: bool = False):
        if df is None or df.empty:
            return

        self.ensure_bhavcopy_database()
        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
        self.ensure_table_schema_with_id(table_name, df)

        meta = MetaData()
        table = Table(table_name, meta, autoload_with=engine)

        records = df.to_dict(orient="records")
        if not records:
            return

        if skip_row_checks:
            filtered_records = records
        else:
            filtered_records = []
            for record in records:
                if 'source_date' in record:
                    if not self.record_exists(table_name, record):
                        filtered_records.append(record)
                else:
                    filtered_records.append(record)
        
        if not filtered_records:
            logger.debug(f"No new records for {table_name}")
            return

        stmt = insert(table).values(filtered_records)
        inserted_columns = set(filtered_records[0].keys())
        update_cols = {
            c.name: stmt.inserted[c.name]
            for c in table.columns
            if c.name not in ["id", "source_date"] and c.name in inserted_columns
        }

        if update_cols:
            stmt = stmt.on_duplicate_key_update(**update_cols)

        with engine.begin() as conn:
            result = conn.execute(stmt)
            self._info(f"✅ Inserted/Updated {result.rowcount} records in {table_name}")

    # -----------------------------------------------------
    # CHECK IF RECORD EXISTS
    # -----------------------------------------------------
    def record_exists(self, table_name: str, record: dict) -> bool:
        """Check if a specific record already exists based on symbol and date"""
        self.ensure_bhavcopy_database()
        engine = db_manager.get_sqlalchemy_engine(config.DB_BHAVCOPY)
        
        symbol = record.get('SYMBOL') or record.get('SC_CODE')
        source_date = record.get('source_date')
        
        if not symbol or not source_date:
            return False
        
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text(
                        f"SELECT COUNT(*) FROM `{table_name}` "
                        f"WHERE (SYMBOL = :symbol OR SC_CODE = :symbol) "
                        f"AND source_date = :date_val LIMIT 1"
                    ),
                    {"symbol": str(symbol), "date_val": source_date}
                ).scalar()
                
                return result > 0 if result else False
        except Exception:
            return False

    # -----------------------------------------------------
    # 🆕 MANUAL URL FETCH (NEW METHOD)
    # -----------------------------------------------------
    def fetch_from_manual_url(self, url: str, date_obj: Optional[datetime] = None):
        """
        Fetch Bhavcopy from a manually provided URL
        
        Args:
            url: Direct URL to the Bhavcopy zip file
            date_obj: Optional date object (if not provided, extracted from URL)
        """
        started_at = time.perf_counter()

        try:
            # Extract date from URL if not provided
            if date_obj is None:
                match = re.search(r'BhavCopy_CM_(\d{2})(\d{2})(\d{2})_FTP\.zip', url)
                if match:
                    day, month, year = match.groups()
                    date_obj = datetime.strptime(f"{day}{month}{year}", "%d%m%y")
                else:
                    match = re.search(r'PR(\d{2})(\d{2})(\d{2})\.zip', url, re.IGNORECASE)
                    if match:
                        day, month, year = match.groups()
                        date_obj = datetime.strptime(f"{day}{month}{year}", "%d%m%y")
                    else:
                        date_obj = datetime.now()
            
            date_key = date_obj.date()
            self._info(f"📥 Manually fetching Bhavcopy from URL: {url}")
            
            # Get cookies first
            self.get_nse_cookies()
            
            # Download the file
            resp = self.session.get(url, timeout=30)
            
            if resp.status_code != 200:
                logger.error(f"❌ Failed to fetch: HTTP {resp.status_code}")
                return self._with_duration(started_at, {
                    "date": str(date_key),
                    "status": "FAILED",
                    "url": url,
                    "message": f"HTTP {resp.status_code}"
                })

            processed = self.process_downloaded_bhavcopy(
                resp,
                url,
                date_obj,
                force_refresh=True,
            )
            files_processed = processed["files_processed"]
            result_data = processed["data"]
            
            self._info(f"✅ Manual URL fetch successful: {files_processed} files")
            
            return self._with_duration(started_at, {
                "date": str(date_key),
                "status": "SUCCESS",
                "url": url,
                "files_processed": files_processed,
                "data": result_data
            })
            
        except Exception as e:
            logger.error(f"❌ Manual URL fetch failed: {e}", exc_info=True)
            return self._with_duration(started_at, {
                "date": str(date_obj.date()) if date_obj else "unknown",
                "status": "ERROR",
                "url": url,
                "message": str(e)
            })

    # -----------------------------------------------------
    # 🆕 FETCH MULTIPLE MANUAL URLS (NEW METHOD)
    # -----------------------------------------------------
    def fetch_multiple_manual_urls(self, urls: List[str]) -> List[Dict]:
        """
        Fetch multiple manual URLs
        
        Args:
            urls: List of URLs to fetch
        """
        results = []
        
        for url in urls:
            logger.info(f"Processing URL: {url}")
            result = self.fetch_from_manual_url(url)
            results.append(result)
            time.sleep(2)  # Delay between requests
        
        return results

    # -----------------------------------------------------
    # PROCESS SINGLE DATE
    # -----------------------------------------------------
    def process_zip_for_date(self, date_obj: datetime, force_refresh: bool = False):
        """Process Bhavcopy for a specific date"""
        started_at = time.perf_counter()
        result_data = {}
        date_key = date_obj.date()

        if date_key in self.processed_dates and not force_refresh:
            self._info(f"⏭ Date {date_key} already processed in this run, skipping")
            return self._with_duration(started_at, {
                "date": str(date_key),
                "status": "SKIPPED",
                "message": "Already processed in this session"
            })

        try:
            self._info(f"📥 Fetching Bhavcopy for {date_key}")
            resp, source_url = self.download_bhavcopy(date_obj)

            if resp is None or source_url is None:
                logger.warning(f"⚠ No Bhavcopy found for {date_key}")
                return self._with_duration(started_at, {
                    "date": str(date_key),
                    "status": "NOT_FOUND",
                    "message": "No Bhavcopy available for this date",
                })

            processed = self.process_downloaded_bhavcopy(
                resp,
                source_url,
                date_obj,
                force_refresh=force_refresh,
            )
            files_processed = processed["files_processed"]
            result_data = processed["data"]

            self.processed_dates.add(date_key)
            self._info(f"✅ Successfully processed {date_key}: {files_processed} files")

            return self._with_duration(started_at, {
                "date": str(date_key),
                "status": "SUCCESS",
                "files_processed": files_processed,
                "source_url": source_url,
                "data": result_data
            })

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error for {date_key}: {e}")
            return self._with_duration(started_at, {"date": str(date_key), "status": "ERROR", "message": f"Network error: {str(e)}"})
        except Exception as e:
            logger.error(f"❌ Error processing {date_key}: {e}", exc_info=True)
            return self._with_duration(started_at, {"date": str(date_key), "status": "ERROR", "message": str(e)})

    # -----------------------------------------------------
    # DATE RANGE
    # -----------------------------------------------------
    def fetch_bhavcopy_range(self, start_date: str, end_date: str, force_refresh: bool = False):
        """Fetch Bhavcopy for a date range"""
        started_at = time.perf_counter()
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        dates = [start + timedelta(days=i) for i in range((end - start).days + 1)]
        dates = [d for d in dates if d.weekday() < 5]  # Exclude weekends
        
        self._info(f"📅 Processing {len(dates)} dates from {start_date} to {end_date}")
        
        results = []
        successful = 0
        failed = 0

        with ThreadPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
            futures = {executor.submit(self.process_zip_for_date, d, force_refresh): d for d in dates}

            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                
                if result.get("status") == "SUCCESS":
                    successful += 1
                elif result.get("status") not in ["SKIPPED", "NOT_FOUND"]:
                    failed += 1
                
                self._info(f"Progress: {successful + failed}/{len(dates)}")

            self._info(f"🎉 Bhavcopy range complete: {successful} successful, {failed} failed")
        
            return self._with_duration(started_at, {
            "total_dates": len(dates),
            "successful": successful,
            "failed": failed,
            "results": results
            })

    # -----------------------------------------------------
    # TODAY
    # -----------------------------------------------------
    def fetch_today_bhavcopy(self, force_refresh: bool = False):
        """Fetch the most recent available bhavcopy (yesterday on weekdays)."""
        yesterday = datetime.now() - timedelta(days=1)

        if yesterday.weekday() >= 5:
            days_back = (yesterday.weekday() - 4) % 7
            if days_back == 0:
                days_back = 3
            yesterday = yesterday - timedelta(days=days_back)

        self._info(f"📅 Fetching Bhavcopy for latest trade date: {yesterday.date()}")
        return self.process_zip_for_date(
            datetime.combine(yesterday.date(), datetime.min.time()),
            force_refresh,
        )
    
    # -----------------------------------------------------
    # FETCH MISSING DATES
    # -----------------------------------------------------
    def fetch_missing_dates(self, start_date: str, end_date: str):
        """Fetch only dates that are missing from the database"""
        started_at = time.perf_counter()
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        dates = [start + timedelta(days=i) for i in range((end - start).days + 1) if (start + timedelta(days=i)).weekday() < 5]
        
        missing_dates = []
        for date_obj in dates:
            if not self.is_trade_date_processed(date_obj):
                missing_dates.append(date_obj)
        
        self._info(f"Found {len(missing_dates)} missing dates out of {len(dates)} total")
        
        results = []
        for date_obj in missing_dates:
            result = self.process_zip_for_date(date_obj, force_refresh=False)
            results.append(result)
        
        return self._with_duration(started_at, {
            "total_dates": len(dates),
            "missing_dates": len(missing_dates),
            "processed": len(results),
            "results": results
        })


# ✅ SINGLE INSTANCE
bhavcopy_service = BhavcopyService()