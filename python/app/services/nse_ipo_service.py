import logging
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import pymysql
import requests

from app.config import config
from app.database.connection import db_manager
from app.services._utils_retry import with_retries

logger = logging.getLogger(__name__)

NSE_BASE = "https://www.nseindia.com"

IPO_TABLE_COLUMNS = [
    "Company_Name",
    "Close_Date",
    "QIB_x_",
    "NII_x_",
    "Retail_x_",
    "Employee_x_",
    "Others_x_",
    "Applications",
    "Total_x_",
    "_Highlight_Row",
    "_Issue_Open_Date",
    "_Issue_Close_Date",
    "_id",
    "_URLRewrite_Folder_Name",
    "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_",
    "bNII_x_",
    "sNII_x_",
    "Shareholder_x_",
    "issue_status",
    "price_band",
    "issue_size_shares",
    "lot_size",
    "listing_date",
]


def ensure_ipo_table(table_name: str, cursor):
    col_defs = ", ".join(f"`{col}` TEXT NULL" for col in IPO_TABLE_COLUMNS)
    cursor.execute(
        f"""
        CREATE TABLE IF NOT EXISTS `{table_name}` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            {col_defs},
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    )


def insert_rows(table_name: str, rows: list, cursor):
    if not rows:
        return 0

    ensure_ipo_table(table_name, cursor)

    cols_sql = ", ".join(f"`{c}`" for c in IPO_TABLE_COLUMNS)
    placeholders = ", ".join(["%s"] * len(IPO_TABLE_COLUMNS))
    sql = f"INSERT INTO `{table_name}` ({cols_sql}) VALUES ({placeholders})"

    inserted = 0
    for row in rows:
        cursor.execute(
            sql, tuple(row.get(column) for column in IPO_TABLE_COLUMNS)
        )
        inserted += 1

    return inserted


class NseIpoService:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
                "Origin": "https://www.nseindia.com",
            }
        )
        self._session_ready = False

    def _warm_session(self) -> None:
        if self._session_ready:
            return
        with_retries(lambda: self.session.get(NSE_BASE, timeout=30))
        time.sleep(1)
        self._session_ready = True

    def _get_json(self, path: str):
        self._warm_session()

        def fetch():
            response = self.session.get(f"{NSE_BASE}{path}", timeout=30)
            response.raise_for_status()
            return response.json()

        return with_retries(fetch)

    @staticmethod
    def _format_times(value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        try:
            return f"{float(value):.2f}"
        except (TypeError, ValueError):
            return str(value)

    @staticmethod
    def _parse_issue_date(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        normalized = value.strip().title()
        for fmt in ("%d-%b-%Y", "%d-%B-%Y", "%d-%b-%y", "%d-%B-%y"):
            try:
                return datetime.strptime(normalized, fmt)
            except ValueError:
                continue
        return None

    @staticmethod
    def _is_sme(item: Dict) -> bool:
        series = str(item.get("series") or "").upper()
        security_type = str(item.get("securityType") or "").upper()
        return series == "SME" or security_type == "SME"

    @staticmethod
    def _extract_issue_amount_cr(issue_info: Optional[Dict]) -> Optional[str]:
        if not issue_info:
            return None

        for entry in issue_info.get("dataList", []):
            title = str(entry.get("title") or "").strip().lower()
            value = str(entry.get("value") or "")
            if title != "issue size":
                continue

            million_match = re.search(
                r"rs\.?\s*([\d,]+(?:\.\d+)?)\s*million",
                value,
                re.IGNORECASE,
            )
            if million_match:
                million = float(million_match.group(1).replace(",", ""))
                return f"{million / 10:.2f}"

            crore_match = re.search(
                r"rs\.?\s*([\d,]+(?:\.\d+)?)\s*crore",
                value,
                re.IGNORECASE,
            )
            if crore_match:
                return crore_match.group(1).replace(",", "")

        return None

    def _map_bid_details(self, bid_details: List[Dict]) -> Dict[str, str]:
        mapped = {}
        for item in bid_details or []:
            sr_no = str(item.get("srNo") or "").strip()
            category = str(item.get("category") or "").lower()
            times = self._format_times(item.get("noOfTime"))
            if not times:
                continue

            if sr_no == "1":
                mapped["QIB_x_"] = times
            elif sr_no == "2":
                mapped["NII_x_"] = times
            elif sr_no == "2.1":
                mapped["bNII_x_"] = times
            elif sr_no == "2.2":
                mapped["sNII_x_"] = times
            elif sr_no == "3" or "retail individual" in category:
                mapped["Retail_x_"] = times
            elif "employee" in category:
                mapped["Employee_x_"] = times
            elif "shareholder" in category:
                mapped["Shareholder_x_"] = times
            elif sr_no in {"4", "5", "6", "7"} or category == "total":
                mapped["Total_x_"] = times
            elif "others" in category and sr_no.startswith("1"):
                mapped.setdefault("Others_x_", times)

        return mapped

    def _build_row(
        self,
        *,
        company_name: str,
        open_date: Optional[str],
        close_date: Optional[str],
        symbol: Optional[str],
        issue_status: Optional[str] = None,
        price_band: Optional[str] = None,
        issue_size_shares: Optional[str] = None,
        lot_size: Optional[str] = None,
        listing_date: Optional[str] = None,
        issue_amount_cr: Optional[str] = None,
        bid_details: Optional[List[Dict]] = None,
    ) -> Dict:
        row = {
            "Company_Name": company_name,
            "_Issue_Open_Date": open_date,
            "_Issue_Close_Date": close_date,
            "Close_Date": close_date,
            "_id": symbol,
            "_URLRewrite_Folder_Name": symbol,
            "issue_status": issue_status,
            "price_band": price_band,
            "issue_size_shares": issue_size_shares,
            "lot_size": lot_size,
            "listing_date": listing_date,
            "Total_Issue_Amount_Incl_Firm_reservations_Rs_cr_": issue_amount_cr,
        }
        row.update(self._map_bid_details(bid_details or []))
        return {column: row.get(column) for column in IPO_TABLE_COLUMNS}

    def _fetch_issue_detail(self, symbol: str) -> Dict:
        if not symbol:
            return {"bidDetails": [], "issueInfo": None}
        try:
            payload = self._get_json(f"/api/ipo-detail?symbol={symbol}")
            return {
                "bidDetails": payload.get("bidDetails", []),
                "issueInfo": payload.get("issueInfo"),
            }
        except Exception as error:
            logger.warning("NSE IPO detail failed for %s: %s", symbol, error)
            return {"bidDetails": [], "issueInfo": None}

    def _resolve_past_status(
        self,
        *,
        open_date: Optional[str],
        close_date: Optional[str],
        listing_date: Optional[str],
    ) -> str:
        today = datetime.now().date()
        listing_dt = self._parse_issue_date(listing_date)
        close_dt = self._parse_issue_date(close_date)
        open_dt = self._parse_issue_date(open_date)

        if listing_dt and listing_dt.date() <= today:
            return "Listed"
        if close_dt and close_dt.date() < today:
            return "Closed"
        if open_dt and open_dt.date() > today:
            return "Forthcoming"
        if open_dt and close_dt and open_dt.date() <= today <= close_dt.date():
            return "Active"
        return "Closed"

    def collect_issues(self, past_days: int = 120) -> Dict[str, List[Dict]]:
        self._session_ready = False

        upcoming = self._get_json("/api/all-upcoming-issues?category=ipo")
        current = self._get_json("/api/ipo-current-issue")
        past = self._get_json("/api/public-past-issues")

        if not isinstance(upcoming, list):
            upcoming = []
        if not isinstance(current, list):
            current = []
        if not isinstance(past, list):
            past = []

        cutoff = datetime.now() - timedelta(days=past_days)
        merged: Dict[str, Dict] = {}

        def add_live_issue(item: Dict, default_status: str = "Forthcoming") -> None:
            symbol = str(item.get("symbol") or "").strip()
            if not symbol:
                return

            status = str(item.get("status") or default_status).strip()
            merged[symbol] = {
                "company_name": item.get("companyName") or symbol,
                "symbol": symbol,
                "open_date": item.get("issueStartDate"),
                "close_date": item.get("issueEndDate"),
                "price_band": item.get("issuePrice") or item.get("priceBand"),
                "issue_size_shares": item.get("issueSize"),
                "lot_size": item.get("lotSize"),
                "listing_date": None,
                "issue_status": status,
                "is_sme": self._is_sme(item),
                "fetch_detail": status.lower() == "active",
            }

        for item in upcoming:
            add_live_issue(item)

        for item in current:
            symbol = str(item.get("symbol") or "").strip()
            if not symbol:
                continue
            if symbol not in merged:
                add_live_issue(item, default_status="Active")
            elif str(merged[symbol].get("issue_status") or "").lower() != "active":
                merged[symbol]["issue_status"] = "Active"
                merged[symbol]["fetch_detail"] = True

        for item in past:
            symbol = str(item.get("symbol") or "").strip()
            if not symbol or symbol in merged:
                continue

            close_dt = self._parse_issue_date(item.get("ipoEndDate"))
            if close_dt and close_dt < cutoff:
                continue

            open_date = item.get("ipoStartDate")
            close_date = item.get("ipoEndDate")
            listing_date = item.get("listingDate")

            merged[symbol] = {
                "company_name": item.get("companyName") or item.get("company") or symbol,
                "symbol": symbol,
                "open_date": open_date,
                "close_date": close_date,
                "price_band": item.get("priceRange") or item.get("issuePrice"),
                "issue_size_shares": None,
                "lot_size": None,
                "listing_date": listing_date,
                "issue_status": self._resolve_past_status(
                    open_date=open_date,
                    close_date=close_date,
                    listing_date=listing_date,
                ),
                "is_sme": self._is_sme(item),
                "fetch_detail": False,
            }

        mainboard_rows: List[Dict] = []
        sme_rows: List[Dict] = []

        status_rank = {
            "Active": 0,
            "Forthcoming": 1,
            "Closed": 2,
            "Listed": 3,
        }

        sorted_issues = sorted(
            merged.values(),
            key=lambda issue: (
                status_rank.get(str(issue.get("issue_status") or ""), 9),
                self._parse_issue_date(issue.get("open_date"))
                or datetime.max,
            ),
        )

        for issue in sorted_issues:
            bid_details: List[Dict] = []
            issue_amount_cr = None

            if issue.get("fetch_detail"):
                detail = self._fetch_issue_detail(issue["symbol"])
                bid_details = detail["bidDetails"]
                issue_amount_cr = self._extract_issue_amount_cr(detail["issueInfo"])

            row = self._build_row(
                company_name=issue["company_name"],
                open_date=issue.get("open_date"),
                close_date=issue.get("close_date"),
                symbol=issue.get("symbol"),
                issue_status=issue.get("issue_status"),
                price_band=issue.get("price_band"),
                issue_size_shares=issue.get("issue_size_shares"),
                lot_size=issue.get("lot_size"),
                listing_date=issue.get("listing_date"),
                issue_amount_cr=issue_amount_cr,
                bid_details=bid_details,
            )

            if issue.get("is_sme"):
                sme_rows.append(row)
            else:
                mainboard_rows.append(row)

        return {"mainboard": mainboard_rows, "sme": sme_rows}

    def sync_to_database(self, past_days: int = 120) -> Dict:
        grouped = self.collect_issues(past_days=past_days)
        conn = db_manager.get_connection(config.DB_IPO)

        inserted = {"mainboard_data": 0, "sme_data": 0}
        replaced_symbols = {"mainboard_data": 0, "sme_data": 0}

        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                for table_name, rows in (
                    ("mainboard_data", grouped["mainboard"]),
                    ("sme_data", grouped["sme"]),
                ):
                    symbols = [
                        row.get("_id")
                        for row in rows
                        if row.get("_id")
                    ]

                    if symbols:
                        placeholders = ", ".join(["%s"] * len(symbols))
                        cursor.execute(
                            f"DELETE FROM `{table_name}` WHERE `_id` IN ({placeholders})",
                            symbols,
                        )
                        replaced_symbols[table_name] = cursor.rowcount

                    if rows:
                        inserted[table_name] = insert_rows(table_name, rows, cursor)

                conn.commit()
        finally:
            conn.close()

        return {
            "status": "success",
            "source": "NSE API",
            "records_inserted": inserted,
            "records_replaced": replaced_symbols,
            "raw_records": sum(inserted.values()),
        }


nse_ipo_service = NseIpoService()
