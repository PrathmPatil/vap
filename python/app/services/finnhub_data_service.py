import os
import requests
import pymysql
from dotenv import load_dotenv

from app.database.connection import db_manager
from app.config import config

load_dotenv()

FINNHUB_BASE_URL = os.getenv("FINNHUB_BASE_URL", "https://finnhub.io/api/v1")
API_KEY = os.getenv("FINNHUB_API_KEY")


class MarketService:

    # =====================================================
    # 🔹 FETCH DATA FROM FINNHUB
    # =====================================================

    def fetch_data(self, endpoint: str, params: dict):
        params["token"] = API_KEY
        url = f"{FINNHUB_BASE_URL}/{endpoint}"

        response = requests.get(url, params=params)

        if response.status_code != 200:
            raise Exception(f"Finnhub API Error: {response.text}")

        return response.json()

    def fetch_market_data(self):
        return {
            "marketStatus": self.fetch_data(
                "stock/market-status", {"exchange": "US"}
            ),
            "marketHoliday": self.fetch_data(
                "stock/market-holiday", {"exchange": "US"}
            ),
            "ipoCalendar": self.fetch_data("calendar/ipo", {}),
            "earningsCalendar": self.fetch_data("calendar/earnings", {})
        }

    # =====================================================
    # 🔹 SQL TYPE DETECTION (FIXED VERSION)
    # =====================================================

    def detect_sql_type(self, value):

        if isinstance(value, bool):
            return "BOOLEAN"

        if isinstance(value, int):
            return "BIGINT"

        if isinstance(value, float):
            return "DOUBLE"

        if value is None:
            return "VARCHAR(255)"

        if isinstance(value, str):

            # Detect DATE format YYYY-MM-DD
            if len(value) == 10 and value.count("-") == 2:
                return "DATE"

            if len(value) <= 255:
                return "VARCHAR(255)"

            return "TEXT"

        return "VARCHAR(255)"

    # =====================================================
    # 🔹 CREATE TABLE
    # =====================================================

    def create_table_if_not_exists(self, cursor, table_name, sample_row, unique_fields=None):

        columns_sql = []

        for key, value in sample_row.items():
            sql_type = self.detect_sql_type(value)
            columns_sql.append(f"`{key}` {sql_type} NULL")

        unique_sql = ""
        if unique_fields:
            unique_columns = ", ".join([f"`{col}`" for col in unique_fields])
            unique_sql = f", UNIQUE KEY unique_record ({unique_columns})"

        create_query = f"""
        CREATE TABLE IF NOT EXISTS `{table_name}` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            {", ".join(columns_sql)},
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                ON UPDATE CURRENT_TIMESTAMP
            {unique_sql}
        ) ENGINE=InnoDB;
        """

        print(f"🛠 Creating table: {table_name}")
        cursor.execute(create_query)

    # =====================================================
    # 🔹 INSERT OR UPDATE (UPSERT)
    # =====================================================

    def insert_or_update(self, cursor, table_name, row):

        columns = list(row.keys())
        values = [row[col] for col in columns]

        columns_sql = ", ".join([f"`{col}`" for col in columns])
        placeholders = ", ".join(["%s"] * len(columns))

        update_sql = ", ".join(
            [f"`{col}` = VALUES(`{col}`)" for col in columns]
        )

        query = f"""
        INSERT INTO `{table_name}` ({columns_sql})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_sql};
        """

        cursor.execute(query, values)

    # =====================================================
    # 🔹 SAVE MARKET DATA
    # =====================================================

    def save_market_data(self, data):

        print("🔥 SAVE FUNCTION CALLED")

        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        try:
            # ---------------------------
            # 1️⃣ MARKET STATUS
            # ---------------------------
            market_status = data.get("marketStatus", {})

            if market_status:
                self.create_table_if_not_exists(
                    cursor,
                    "market_status",
                    market_status,
                    unique_fields=["exchange"]
                )
                self.insert_or_update(cursor, "market_status", market_status)

            # ---------------------------
            # 2️⃣ MARKET HOLIDAY
            # ---------------------------
            holidays = data.get("marketHoliday", {}).get("data", [])

            if holidays:
                self.create_table_if_not_exists(
                    cursor,
                    "market_holiday",
                    holidays[0],
                    unique_fields=["eventName", "atDate"]
                )

                for row in holidays:
                    self.insert_or_update(cursor, "market_holiday", row)

            # ---------------------------
            # 3️⃣ IPO CALENDAR
            # ---------------------------
            ipos = data.get("ipoCalendar", {}).get("ipoCalendar", [])

            if ipos:
                self.create_table_if_not_exists(
                    cursor,
                    "ipo_calendar",
                    ipos[0],
                    unique_fields=["symbol", "date"]
                )

                for row in ipos:
                    self.insert_or_update(cursor, "ipo_calendar", row)

            # ---------------------------
            # 4️⃣ EARNINGS CALENDAR
            # ---------------------------
            earnings = data.get("earningsCalendar", {}).get("earningsCalendar", [])

            if earnings:
                self.create_table_if_not_exists(
                    cursor,
                    "earnings_calendar",
                    earnings[0],
                    unique_fields=["symbol", "date", "quarter", "year"]
                )

                for row in earnings:
                    self.insert_or_update(cursor, "earnings_calendar", row)

            conn.commit()
            print("✅ Data committed successfully")

        except Exception as e:
            conn.rollback()
            print("❌ ERROR:", str(e))
            raise e

        finally:
            cursor.close()
            conn.close()