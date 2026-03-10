import pymysql
import requests
import logging
from fastapi import HTTPException
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)

BASE_URL = "https://www.india.gov.in"

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Origin": "https://www.india.gov.in",
    "Referer": "https://www.india.gov.in/",
    "X-Requested-With": "XMLHttpRequest",
}


# -------------------------------------------------------
# Sanitize Column / Table Names
# -------------------------------------------------------
def sanitize_column(name: str) -> str:
    return (
        name.replace(" ", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace(".", "_")
        .replace("(", "")
        .replace(")", "")
        .lower()
    )


class GovNewsCombinedService:

    def __init__(self):

        logger.info("✅ GovNewsCombinedService initialized")

        # Create HTTP session with retry
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        retry = Retry(
            total=5,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
        )

        adapter = HTTPAdapter(max_retries=retry)

        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    # -------------------------------------------------------
    # Ensure Database Exists
    # -------------------------------------------------------
    def ensure_database_exists(self, db_name: str):

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

        except Exception:
            logger.exception("❌ Database creation failed")
            raise HTTPException(status_code=500, detail="Database creation failed")

    # -------------------------------------------------------
    # Ensure Table Exists
    # -------------------------------------------------------
    def ensure_table_exists(self, table_name: str, cursor):

        table_name = sanitize_column(table_name)

        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title TEXT,
                link TEXT,
                pubdate VARCHAR(255),
                UNIQUE KEY unique_news (link(255))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)

    # -------------------------------------------------------
    # API Fetch
    # -------------------------------------------------------
    def fetch(self, endpoint: str, payload: dict = None):

        try:

            url = f"{BASE_URL}{endpoint}"

            if payload:
                response = self.session.post(
                    url,
                    json=payload,
                    timeout=30
                )
            else:
                response = self.session.get(
                    url,
                    timeout=30
                )

            response.raise_for_status()

            return response.json()

        except Exception:
            logger.exception(f"❌ Fetch failed: {endpoint}")
            raise HTTPException(status_code=500, detail="Gov API fetch failed")

    # -------------------------------------------------------
    # Extract Results
    # -------------------------------------------------------
    def extract_results(self, endpoint: str, response: dict):

        try:

            if "getnewsonair" in endpoint:
                return response.get("newsOnAirResponse", {}).get("results", [])

            if "getpibministry" in endpoint:
                return response.get("pibnewsMinistryResponse", {}).get("results", [])

            if "getpibnews" in endpoint:
                return response.get("pibnewsResponse", {}).get("results", [])

            if "getPIBSearchNews" in endpoint:
                return response.get("pibSearchNewsResponse", {}).get("results", [])

            if "getddnews" in endpoint:
                return response.get("ddnewsResponse", {}).get("results", [])

            if "getddnewsfacet" in endpoint:
                return response.get("ddnewsFacetResponse", {}).get("results", [])

            return []

        except Exception:
            logger.exception("❌ Result extraction failed")
            return []

    # -------------------------------------------------------
    # Create Table Columns Dynamically
    # -------------------------------------------------------
    def sync_columns(self, table_name: str, data: list, cursor):

        columns = set()

        for row in data:
            if isinstance(row, dict):
                columns.update(row.keys())

        columns = sorted(sanitize_column(c) for c in columns)

        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        existing = {c["Field"] for c in cursor.fetchall()}

        for col in columns:
            if col not in existing:
                cursor.execute(
                    f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"
                )

        return columns

    # -------------------------------------------------------
    # Insert Data
    # -------------------------------------------------------
    def insert_news(self, table_name: str, data: list, cursor):

        if not data:
            return 0

        columns = self.sync_columns(table_name, data, cursor)

        col_list = ", ".join(f"`{c}`" for c in columns)
        placeholders = ", ".join(["%s"] * len(columns))

        query = f"""
            INSERT IGNORE INTO `{table_name}` ({col_list})
            VALUES ({placeholders})
        """

        values = []

        for row in data:

            clean = {sanitize_column(k): (v or "") for k, v in row.items()}

            values.append(tuple(clean.get(c, "") for c in columns))

        cursor.executemany(query, values)

        return len(values)

    # -------------------------------------------------------
    # Save News
    # -------------------------------------------------------
    def save_news(self, table_name: str, news_list: list):

        db_name = config.DB_NEWS

        self.ensure_database_exists(db_name)

        try:

            conn = db_manager.get_connection(db_name)

            with conn.cursor(pymysql.cursors.DictCursor) as cursor:

                self.ensure_table_exists(table_name, cursor)

                saved = self.insert_news(
                    table_name,
                    news_list,
                    cursor
                )

                conn.commit()

            conn.close()

            logger.info(f"✅ {saved} records saved in {table_name}")

            return saved

        except Exception:
            logger.exception("❌ Database save failed")
            raise HTTPException(status_code=500, detail="Database save failed")

    # -------------------------------------------------------
    # Fetch + Save
    # -------------------------------------------------------
    def fetch_and_save(self, table_name: str, endpoint: str, payload: dict = None):

        response = self.fetch(endpoint, payload)

        results = self.extract_results(endpoint, response)

        if not isinstance(results, list):
            raise HTTPException(status_code=500, detail="Invalid API response")

        return self.save_news(table_name, results)


gov_news_service = GovNewsCombinedService()