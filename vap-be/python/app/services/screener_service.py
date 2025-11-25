import requests
from bs4 import BeautifulSoup
import re
import time
import os
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager

# ---------- Data folder ----------
DATA_FOLDER = "screener_data_json"
os.makedirs(DATA_FOLDER, exist_ok=True)

# ---------- Helper functions ----------
def sanitize_column(col):
    col = col.strip()
    col = re.sub(r'\W+', '_', col)
    if col and col[0].isdigit():
        col = "col_" + col
    return col or "col_unknown"

def create_and_insert_table(table_name, data, cursor, symbol):
    if not data:
        return

    # Case 1: List of dicts
    if isinstance(data, list) and isinstance(data[0], dict):
        columns = set()
        for row in data:
            columns.update(row.keys())
        columns = [sanitize_column(col) for col in columns]

        cols_sql = ", ".join([f"`{col}` TEXT" for col in columns])
        cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` (`symbol` TEXT, {cols_sql})")

        # Add missing columns dynamically
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        existing_cols = [c['Field'] for c in cursor.fetchall()]
        for col in columns:
            if col not in existing_cols:
                cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{col}` TEXT")

        for row in data:
            row = {sanitize_column(k): v for k, v in row.items()}
            row["symbol"] = symbol
            all_cols = ["symbol"] + columns
            placeholders = ", ".join(["%s"] * len(all_cols))
            insert_query = f"INSERT INTO `{table_name}` ({', '.join(all_cols)}) VALUES ({placeholders})"
            cursor.execute(insert_query, tuple(row.get(col, "") for col in all_cols))

    # Case 2: Dict
    elif isinstance(data, dict):
        cursor.execute(f"CREATE TABLE IF NOT EXISTS `{table_name}` (`symbol` TEXT, `key` TEXT, `value` TEXT)")
        def insert_dict(d, parent=""):
            for k, v in d.items():
                key = f"{parent}.{k}" if parent else k
                if isinstance(v, dict):
                    insert_dict(v, key)
                else:
                    cursor.execute(
                        f"INSERT INTO `{table_name}` (`symbol`, `key`, `value`) VALUES (%s,%s,%s)",
                        (symbol, key, v)
                    )
        insert_dict(data)

# ---------- Screener Service ----------
class ScreenerService:
    def __init__(self):
        print("✅ ScreenerService initialized")

    def get_company_info(self, symbol: str):
        try:
            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            with conn.cursor() as cursor:
                cursor.execute("SHOW COLUMNS FROM listed_companies;")
                columns = [row['Field'] for row in cursor.fetchall()]
                name_col = next((c for c in ["company_name", "name_of_company", "name"] if c in columns), None)
                if not name_col:
                    raise Exception("No valid company name column found")
                cursor.execute(f"SELECT {name_col} FROM listed_companies WHERE symbol=%s", (symbol,))
                result = cursor.fetchone()
            conn.close()
            if not result:
                raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found")
            return result[name_col]
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def get_screener_data(symbol, statement_type="consolidated"):
        url = f"https://www.screener.in/company/{symbol}/{statement_type}/"
        headers = {"User-Agent": "Mozilla/5.0"}
        time.sleep(1.5)  # avoid getting blocked
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        all_data = {
            "company_info": {}, "financial_ratios": {}, "profit_loss": {},
            "balance_sheet": {}, "cash_flow": {}, "quarterly_results": {},
            "shareholding_pattern": {}, "other_data": {}
        }

        # Company info
        info_section = soup.find("div", class_="company-info")
        if info_section:
            all_data["company_info"]["name"] = info_section.find("h1").get_text(strip=True) if info_section.find("h1") else symbol
            for item in info_section.find_all("div", class_="company-ratios"):
                spans = item.find_all("span")
                if len(spans) >= 2:
                    key = spans[0].get_text(strip=True).replace(":", "")
                    value = spans[1].get_text(strip=True)
                    all_data["company_info"][key] = value

        # Financial ratios
        for card in soup.find_all("div", class_="flex-row"):
            title_elem = card.find("span", class_="name")
            value_elem = card.find("span", class_="number")
            if title_elem:
                all_data["financial_ratios"][title_elem.get_text(strip=True)] = value_elem.get_text(strip=True) if value_elem else ""

        # Tables
        for table in soup.find_all("table"):
            table_name_elem = table.find_previous("h2")
            table_name = table_name_elem.get_text(strip=True) if table_name_elem else "unknown_table"
            table_name = re.sub(r'\W+', '_', table_name.lower())
            table_data = []
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            for row in table.find_all("tr")[1:]:
                cells = row.find_all("td")
                row_data = [c.get_text(strip=True) for c in cells]
                if row_data and headers and len(row_data) == len(headers):
                    table_data.append(dict(zip(headers, row_data)))
            if any(t in table_name for t in ["profit", "loss", "income"]):
                all_data["profit_loss"][table_name] = table_data
            elif any(t in table_name for t in ["balance", "sheet"]):
                all_data["balance_sheet"][table_name] = table_data
            elif any(t in table_name for t in ["cash", "flow"]):
                all_data["cash_flow"][table_name] = table_data
            elif any(t in table_name for t in ["quarterly", "results"]):
                all_data["quarterly_results"][table_name] = table_data
            elif any(t in table_name for t in ["shareholding", "pattern"]):
                all_data["shareholding_pattern"][table_name] = table_data
            else:
                all_data["other_data"][table_name] = table_data

        return all_data

    def save_to_mysql(self, data: dict, symbol: str):
        conn = db_manager.get_connection(config.DB_SCREENER)
        with conn.cursor() as cursor:
            for section, content in data.items():
                if isinstance(content, dict):
                    for sub_name, sub_content in content.items():
                        if sub_content:
                            table_name = f"{section}_{sanitize_column(sub_name)}"
                            create_and_insert_table(table_name, sub_content, cursor, symbol)
                else:
                    if content:
                        table_name = f"{section}"
                        create_and_insert_table(table_name, content, cursor, symbol)
            conn.commit()
        conn.close()

    def fetch_and_save(self, symbol: str, statement_type='consolidated'):
        data = self.get_screener_data(symbol, statement_type)
        self.save_to_mysql(data, symbol)
        return data

# ---------- Singleton ----------
screener_service = ScreenerService()
