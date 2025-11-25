from fastapi import APIRouter, Query, HTTPException
import requests
import logging
from app.services.ipo_scraper_service import ipo_scraper_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/fetch-data")
async def fetch_ipo_data(
    report_id: int = Query(21),
    page: int = Query(1),
    category_id: int = Query(10),
    year: int = Query(2025),
    financial_year: str = Query("2025-26"),
    sector_id: int = Query(0),
    sub_sector_id: int = Query(0),
    company_id: int = Query(0),
    search: str = Query(""),
    v: str = Query("15-25")
):
    """Fetch and Save IPO Data from Chittorgarh dynamically into MySQL."""
    url = (
        f"https://webnodejs.chittorgarh.com/cloud/report/data-read/"
        f"{report_id}/{page}/{category_id}/{year}/{financial_year}/"
        f"{sector_id}/{sub_sector_id}/{company_id}?search={search}&v={v}"
    )

    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-IN,en;q=0.9",
        "origin": "https://www.chittorgarh.com",
        "referer": "https://www.chittorgarh.com/",
        "user-agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/142.0.0.0 Safari/537.36"
        ),
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        json_data = response.json()

        if not isinstance(json_data, dict):
            raise HTTPException(status_code=502, detail="Invalid data format from Chittorgarh")

        if "reportTableData" not in json_data:
            raise HTTPException(status_code=404, detail="No reportTableData found in response")

        save_result = ipo_scraper_service.save_to_mysql(json_data)

        return {
            "status": "success",
            "source": "chittorgarh",
            "saved_to": save_result["table"],
            "url": url,
            "record_count": len(json_data.get("reportTableData", [])),
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


