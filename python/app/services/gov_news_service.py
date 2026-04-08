import pymysql
import requests
import logging
from fastapi import HTTPException
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time
from datetime import datetime
from typing import Dict, Any, Optional

from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)

BASE_URL = "https://www.india.gov.in"

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://www.india.gov.in",
    "Referer": "https://www.india.gov.in/",
    "X-Requested-With": "XMLHttpRequest",
}


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
        
        # Track API health
        self.api_failure_count = 0
        self.last_failure_time = None
        self.is_api_down = False

        retry = Retry(
            total=3,  # Reduced from 5
            backoff_factor=0.5,  # Reduced backoff
            status_forcelist=[500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def check_api_health(self) -> bool:
        """Check if API is responsive before making requests"""
        
        # If API was marked down, check if enough time has passed
        if self.is_api_down and self.last_failure_time:
            time_since_failure = (datetime.now() - self.last_failure_time).seconds
            if time_since_failure < 300:  # Wait 5 minutes before retrying
                logger.warning(f"API still in cooldown (last failure {time_since_failure}s ago)")
                return False
            else:
                logger.info("Cooldown period over, retrying API...")
                self.is_api_down = False
                self.api_failure_count = 0
        
        return True

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

    def ensure_table_exists(self, table_name: str, cursor):
        table_name = sanitize_column(table_name)
        
        query = f"""
        CREATE TABLE IF NOT EXISTS `{table_name}` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            title TEXT,
            link TEXT,
            pubdate VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_link (link(255))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """
        
        cursor.execute(query)
        logger.info(f"✅ Table ensured: {table_name}")

    def ensure_created_at_column(self, table_name: str, cursor):
        table_name = sanitize_column(table_name)
        
        cursor.execute(f"""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = %s
            AND COLUMN_NAME = 'created_at'
        """, (table_name,))
        
        column = cursor.fetchone()
        
        if not column:
            cursor.execute(
                f"ALTER TABLE `{table_name}` ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            )
            logger.info(f"✅ created_at column added to {table_name}")

    def fetch(self, endpoint: str, payload: dict = None, max_retries: int = 2) -> Optional[Dict]:
        """Fetch data from government API with improved error handling"""
        
        # Check API health before attempting
        if not self.check_api_health():
            logger.warning(f"Skipping API call - API appears to be down")
            return None
        
        url = f"{BASE_URL}{endpoint}"
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                logger.debug(f"Fetching: {url} (Attempt {retry_count + 1})")
                
                # Use GET instead of POST for better compatibility
                if payload:
                    response = self.session.get(url, params=payload, timeout=20)
                else:
                    response = self.session.get(url, timeout=20)
                
                # Handle 500 errors gracefully
                if response.status_code == 500:
                    self.api_failure_count += 1
                    self.last_failure_time = datetime.now()
                    
                    if self.api_failure_count >= 3:
                        self.is_api_down = True
                        logger.error(f"API marked as DOWN after {self.api_failure_count} consecutive failures")
                        return None
                    
                    retry_count += 1
                    wait_time = retry_count * 2
                    logger.warning(f"API returned 500 (attempt {retry_count}/{max_retries}), waiting {wait_time}s")
                    time.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                
                # Reset failure counter on success
                self.api_failure_count = 0
                self.is_api_down = False
                
                # Parse JSON
                try:
                    return response.json()
                except ValueError as e:
                    logger.error(f"Invalid JSON response: {e}")
                    return None
                
            except requests.exceptions.Timeout:
                logger.warning(f"Request timeout for {endpoint}")
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Failed after {max_retries} timeouts")
                    return None
                time.sleep(retry_count)
                
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"Connection error: {e}")
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Failed after {max_retries} connection errors")
                    return None
                time.sleep(retry_count)
                
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return None
        
        return None

    def extract_results(self, endpoint: str, response: dict) -> list:
        """Extract results from API response"""
        
        if not response:
            return []
        
        try:
            # Look for results in nested responses
            if isinstance(response, dict):
                # Check for data field
                if "data" in response:
                    data = response["data"]
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict) and "results" in data:
                        return data.get("results", [])
                
                # Check for results field
                if "results" in response:
                    return response.get("results", [])
                
                # Check for items field
                if "items" in response:
                    return response.get("items", [])
            
            # If API directly returns list
            if isinstance(response, list):
                return response
            
            logger.warning(f"No results found in response for {endpoint}")
            return []
            
        except Exception as e:
            logger.exception(f"Result extraction failed: {e}")
            return []

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
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT")
        
        return columns

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

    def save_news(self, table_name: str, news_list: list) -> Dict[str, Any]:
        """Save news with better error reporting"""
        
        if not news_list:
            logger.warning(f"No news items to save for {table_name}")
            return {"saved": 0, "status": "no_data"}
        
        db_name = config.DB_NEWS
        
        try:
            self.ensure_database_exists(db_name)
            conn = db_manager.get_connection(db_name)
            
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                self.ensure_table_exists(table_name, cursor)
                self.ensure_created_at_column(table_name, cursor)
                saved = self.insert_news(table_name, news_list, cursor)
                conn.commit()
            
            conn.close()
            logger.info(f"✅ {saved} records saved in {table_name}")
            
            return {"saved": saved, "status": "success"}
            
        except Exception as e:
            logger.exception(f"❌ Database save failed for {table_name}")
            return {"saved": 0, "status": "error", "error": str(e)}

    def fetch_and_save(self, table_name: str, endpoint: str, payload: dict = None) -> Dict[str, Any]:
        """Fetch and save with comprehensive error handling"""
        
        result = {
            "table_name": table_name,
            "endpoint": endpoint,
            "status": "failed",
            "records_saved": 0,
            "error": None
        }
        
        try:
            # Fetch data
            response = self.fetch(endpoint, payload)
            
            if response is None:
                result["error"] = "API returned no response (likely down)"
                result["status"] = "api_unavailable"
                logger.warning(f"API unavailable for {table_name}")
                return result
            
            # Extract results
            results = self.extract_results(endpoint, response)
            
            if not results:
                result["error"] = "No results found in API response"
                result["status"] = "no_results"
                logger.warning(f"No results for {table_name}")
                return result
            
            # Save to database
            save_result = self.save_news(table_name, results)
            
            result["status"] = "success"
            result["records_saved"] = save_result.get("saved", 0)
            
            logger.info(f"✅ {table_name}: Saved {result['records_saved']} records")
            
        except Exception as e:
            result["error"] = str(e)
            logger.exception(f"Failed to fetch/save {table_name}")
        
        return result


# Singleton instance
gov_news_service = GovNewsCombinedService()