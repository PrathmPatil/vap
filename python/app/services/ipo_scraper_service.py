import re
import requests
import pymysql
from datetime import datetime
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager

# =====================================================
# 🔥 FIELD MAPPING (API → EXISTING DB COLUMNS)
# =====================================================
FIELD_MAP = {
    "Company": "Company_Name",
    "Closing Date": "Close_Date",
    "QIB (x)": "QIB_x_",
    "sNII (x)": "sNII_x_",
    "bNII (x)": "bNII_x_",
    "NII (x)": "NII_x_",
    "Retail (x)": "Retail_x_",
    "Employee (x)": "Employee_x_",
    "Shareholder (x)": "Shareholder_x_",
    "Others (x)": "Others_x_",
    "Total (x)": "Total_x_",
    "Applications": "Applications",
    "~Issue_Open_Date": "_Issue_Open_Date",
    "~Issue_Close_Date": "_Issue_Close_Date",
    "~Highlight_Row": "_Highlight_Row",
    "~URLRewrite_Folder_Name": "_URLRewrite_Folder_Name",
    "~id": "_id",
    "Total Issue Amount (Incl.Firm reservations) (Rs.cr.)":
        "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_"
}


# =====================================================
# 🔧 NORMALIZE RAW API ROW
# =====================================================
def normalize_row(row: dict) -> dict:
    clean = {}
    for api_key, db_col in FIELD_MAP.items():
        if api_key in row:
            clean[db_col] = row[api_key]
    return clean


# =====================================================
# 💾 INSERT DATA (NO SCHEMA CHANGES)
# =====================================================
def insert_rows(table_name: str, rows: list, cursor):
    if not rows:
        return 0

    columns = rows[0].keys()

    # ----------------------------------------
    # 1️⃣ Create table if not exists
    # ----------------------------------------
    col_defs = []
    for col in columns:
        col_defs.append(f"`{col}` VARCHAR(255) NULL")

    col_defs.append("`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP")

    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS `{table_name}` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            {", ".join(col_defs)}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # ----------------------------------------
    # 2️⃣ Insert Data
    # ----------------------------------------
    cols_sql = ", ".join(f"`{c}`" for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))

    sql = f"""
        INSERT INTO `{table_name}` ({cols_sql})
        VALUES ({placeholders})
    """

    inserted = 0

    for row in rows:
        cursor.execute(sql, tuple(row.get(c) for c in columns))
        inserted += 1

    return inserted

# =====================================================
# 🚀 IPO SCRAPER SERVICE
# =====================================================
class IpoScraperService:
    def __init__(self):
        print("✅ IpoScraperService initialized")

    def resolve_report_id(self, report_type):
        mapping = {"mainboard": 21, "sme": 22}
        if report_type not in mapping:
            raise HTTPException(status_code=400, detail="Invalid report type")
        return mapping[report_type]

    def get_current_params(self):
        now = datetime.now()
        month = now.month
        year = now.year
        fy = f"{year}-{str(year+1)[-2:]}" if month > 3 else f"{year-1}-{str(year)[-2:]}"
        return month, year, fy

    def fetch_data(self, report_id, month=None, year=None, fy=None):
        if not (month and year and fy):
            month, year, fy = self.get_current_params()

        url = (
            f"https://webnodejs.chittorgarh.com/cloud/report/data-read/"
            f"{report_id}/1/{month}/{year}/{fy}/0/0/0"
        )

        headers = {
            "accept": "application/json",
            "referer": "https://www.chittorgarh.com/",
            "user-agent": "Mozilla/5.0"
        }

        res = requests.get(url, headers=headers)
        res.raise_for_status()
        return res.json()

    def process_report(self, report_type, month=None, year=None, fy=None):
        report_id = self.resolve_report_id(report_type)
        raw = self.fetch_data(report_id, month, year, fy)

        rows = raw.get("reportTableData", [])
        normalized = [normalize_row(r) for r in rows]

        if not normalized:
            return {
                "status": "empty",
                "report_type": report_type,
                "raw": raw
            }

        conn = db_manager.get_connection(config.DB_IPO)
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                count = insert_rows(f"{report_type}_data", normalized, cursor)
                conn.commit()
        finally:
            conn.close()

        return {
            "status": "success",
            "report_type": report_type,
            "records_inserted": count,
            "raw_records": len(rows)
        }


# =====================================================
# ✅ SINGLETON
# =====================================================
ipo_scraper_service = IpoScraperService()
