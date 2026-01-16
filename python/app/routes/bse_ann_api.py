from fastapi import APIRouter, Query
import requests
from datetime import datetime
from typing import Optional
from app.services.bse_ann_service import bse_ann_service

router = APIRouter()

# Base URL
BASE_URL = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w"

# Real headers (no placeholders)
HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9,hi;q=0.8,mr;q=0.7",
    "cache-control": "no-cache",
    "origin": "https://www.bseindia.com",
    "pragma": "no-cache",
    "referer": "https://www.bseindia.com/",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
}


@router.get("/ann-subcategory")
def fetch_and_save_bse_announcements(
    pageno: int = 1,
    strCat: int = -1,
    strPrevDate: Optional[str] = None,
    strScrip: str = "",
    strSearch: str = "P",
    strToDate: Optional[str] = None,
    strType: str = "C",
    subcategory: int = -1,
    save: bool = False
):
    """Fetch BSE announcements + optionally save to DB"""

    today = datetime.now().strftime("%Y%m%d")
    strPrevDate = strPrevDate or today
    strToDate = strToDate or today

    params = {
        "pageno": pageno,
        "strCat": strCat,
        "strPrevDate": strPrevDate,
        "strScrip": strScrip,
        "strSearch": strSearch,
        "strToDate": strToDate,
        "strType": strType,
        "subcategory": subcategory,
    }

    response = requests.get(BASE_URL, headers=HEADERS, params=params)

    try:
        data = response.json()
    except Exception:
        return {"status": "error", "raw": response.text}

    announcements = data.get("Table", [])

    # SAVE TO MYSQL ONLY IF save=true
    save_result = None
    if save:
        save_result = bse_ann_service.save_announcements(
            announcements,
            table_name="announcements"
        )

    return {
        "status": "success",
        "count": len(announcements),
        "saved": save_result,
        "params": params,
        "data": announcements
    }
