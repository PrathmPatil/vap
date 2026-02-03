import pymysql
import requests
from bs4 import BeautifulSoup
import re
import time
import logging
from fastapi import HTTPException

from app.config import config
from app.database.connection import db_manager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ----------------------------------------------------
# HELPERS
# ----------------------------------------------------
def sanitize_column(col):
    col = col.strip()
    col = re.sub(r'\W+', '_', col)
    if col and col[0].isdigit():
        col = "col_" + col
    return col or "col_unknown"


def ensure_table(cursor, table_name, columns):
    cols_sql = ", ".join([f"`{c}` TEXT" for c in columns])
    cursor.execute(
        f"CREATE TABLE IF NOT EXISTS `{table_name}` "
        f"(symbol TEXT, {cols_sql})"
    )

    cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
    existing = [c["Field"] for c in cursor.fetchall()]

    for col in columns:
        if col not in existing:
            cursor.execute(
                f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT"
            )


def create_and_insert_table(table_name, data, cursor, symbol):
    if not data:
        return

    # ---------- LIST OF DICTS ----------
    if isinstance(data, list) and isinstance(data[0], dict):
        columns = set()
        for row in data:
            columns.update(row.keys())

        columns = [sanitize_column(c) for c in columns]
        ensure_table(cursor, table_name, columns)

        for row in data:
            clean_row = {sanitize_column(k): v for k, v in row.items()}
            clean_row["symbol"] = symbol

            all_cols = ["symbol"] + columns
            placeholders = ", ".join(["%s"] * len(all_cols))

            query = (
                f"INSERT INTO `{table_name}` "
                f"({', '.join(all_cols)}) VALUES ({placeholders})"
            )

            cursor.execute(
                query,
                tuple(clean_row.get(c, "") for c in all_cols)
            )

    # ---------- DICT ----------
    elif isinstance(data, dict):
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                symbol TEXT,
                `key` TEXT,
                `value` TEXT
            )
            """
        )

        for k, v in data.items():
            cursor.execute(
                f"INSERT INTO `{table_name}` (symbol, `key`, value) VALUES (%s,%s,%s)",
                (symbol, k, v)
            )


# ----------------------------------------------------
# SERVICE
# ----------------------------------------------------
class ScreenerService:
    def __init__(self):
        logger.info("✅ ScreenerService initialized")

    # ----------------------------------------------------
    # SCRAPER
    # ----------------------------------------------------
    def get_screener_data(self, symbol, statement_type):
        url = f"https://www.screener.in/company/{symbol}/{statement_type}/"
        headers = {"User-Agent": "Mozilla/5.0"}

        time.sleep(1.5)
        res = requests.get(url, headers=headers, timeout=20)
        res.raise_for_status()

        soup = BeautifulSoup(res.text, "html.parser")

        data = {
            "company_info": {},
            "financial_ratios": {},
            "tables": {}
        }

        # ---------- RATIOS ----------
        for card in soup.select("div.flex-row"):
            name = card.select_one(".name")
            value = card.select_one(".number")
            if name:
                data["financial_ratios"][
                    name.get_text(strip=True)
                ] = value.get_text(strip=True) if value else ""

        # ---------- TABLES ----------
        for table in soup.find_all("table"):
            title = table.find_previous("h2")
            name = sanitize_column(
                title.get_text(strip=True).lower()
                if title else "unknown_table"
            )

            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            rows = []

            for tr in table.find_all("tr")[1:]:
                tds = tr.find_all("td")
                values = [td.get_text(strip=True) for td in tds]
                if len(headers) == len(values):
                    rows.append(dict(zip(headers, values)))

            if rows:
                data["tables"][name] = rows

        return data

    # ----------------------------------------------------
    # SAVE
    # ----------------------------------------------------
    def fetch_and_save(self, symbol, statement_type="consolidated"):
        conn = None
        cursor = None

        try:
            data = self.get_screener_data(symbol, statement_type)

            conn = db_manager.get_connection(config.DB_SCREENER)
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            for section, content in data.items():
                if isinstance(content, dict):
                    for name, rows in content.items():
                        if rows:
                            table_name = f"{section}_{sanitize_column(name)}"
                            create_and_insert_table(
                                table_name,
                                rows,
                                cursor,
                                symbol
                            )

            conn.commit()
            logger.info(f"📥 Screener saved for {symbol}")

        except Exception as e:
            logger.error(f"❌ Screener error for {symbol}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()


# ✅ SINGLETON
screener_service = ScreenerService()
