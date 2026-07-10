import requests
import pymysql
from datetime import datetime
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager
from app.services.nse_ipo_service import (
    IPO_TABLE_COLUMNS,
    ensure_ipo_table,
    insert_rows as insert_ipo_rows,
    nse_ipo_service,
)

# =====================================================
# FIELD MAPPING (Chittorgarh API → DB COLUMNS)
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
        "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_",
}


def normalize_row(row: dict) -> dict:
    clean = {}
    for api_key, db_col in FIELD_MAP.items():
        if api_key in row:
            clean[db_col] = row[api_key]
    return clean


def _infer_security_type(report_type: str, row: dict) -> str:
    symbol = str(row.get("_id") or row.get("_URLRewrite_Folder_Name") or "").upper()
    company = str(row.get("Company_Name") or "").upper()
    if report_type == "sme" or "SME" in company:
        return "SME"
    return "EQ"


def _build_chittorgarh_row(report_type: str, row: dict) -> dict:
    mapped = {column: None for column in IPO_TABLE_COLUMNS}
    mapped.update(row)
    mapped["data_source"] = "chittorgarh"
    mapped["security_type"] = _infer_security_type(report_type, row)
    return {column: mapped.get(column) for column in IPO_TABLE_COLUMNS}


def sync_chittorgarh_rows(table_name: str, report_type: str, rows: list, cursor) -> int:
    if not rows:
        return 0

    ensure_ipo_table(table_name, cursor)
    prepared = [_build_chittorgarh_row(report_type, row) for row in rows]

    cursor.execute(
        f"DELETE FROM `{table_name}` WHERE data_source = %s",
        ("chittorgarh",),
    )
    return insert_ipo_rows(table_name, prepared, cursor)


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
            "user-agent": "Mozilla/5.0",
        }

        res = requests.get(url, headers=headers, timeout=60)
        res.raise_for_status()
        return res.json()

    def process_report(self, report_type, month=None, year=None, fy=None):
        report_id = self.resolve_report_id(report_type)
        raw = self.fetch_data(report_id, month, year, fy)

        rows = raw.get("reportTableData", []) if isinstance(raw, dict) else []
        normalized = [normalize_row(r) for r in rows]

        if not normalized:
            return nse_ipo_service.sync_to_database()

        conn = db_manager.get_connection(config.DB_IPO)
        table_name = f"{report_type}_data"
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                count = sync_chittorgarh_rows(
                    table_name, report_type, normalized, cursor
                )
                conn.commit()
        finally:
            conn.close()

        return {
            "status": "success",
            "report_type": report_type,
            "source": "Chittorgarh",
            "records_inserted": count,
            "raw_records": len(rows),
        }


ipo_scraper_service = IpoScraperService()
