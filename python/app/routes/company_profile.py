from fastapi import APIRouter, Query
from app.services.company_profile_service import company_service

router = APIRouter()

@router.post("/refresh-single-day")
def refresh_single_day():
    saved = company_service.refresh_single_day()
    return {
        "status": "success",
        "message": "Single day market data refreshed",
        "rows_saved": saved
    }

@router.post("/refresh-range")
def refresh_range(
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)")
):
    saved = company_service.refresh_range(start, end)
    return {
        "status": "success",
        "message": "Historical market data refreshed",
        "start_date": start,
        "end_date": end,
        "rows_saved": saved
    }

@router.get("/symbol/{symbol}")
def fetch_symbol(symbol: str):
    rows = company_service.fetch_single_day(symbol)
    if not rows:
        return {
            "status": "failed",
            "message": "No data found"
        }
    return {
        "status": "success",
        "data": rows
    }