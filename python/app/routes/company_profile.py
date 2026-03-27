from fastapi import APIRouter, Query
from app.services.company_profile_service_copy import company_profile_service

router = APIRouter()

# # -------------------------------------------------
# # FETCH SINGLE COMPANY
# # -------------------------------------------------
# @router.get("/fetch/{symbol}")
# def fetch_single_company(symbol: str):
#     data = company_profile_service.fetch_company_info(symbol)

#     if not data:
#         return {"status": "failed", "message": "No data found"}

#     company_profile_service.save_company(data)
#     return {"status": "success", "data": data}


# # -------------------------------------------------
# # FETCH ALL LISTED COMPANIES
# # -------------------------------------------------
# @router.post("/fetch-all")
# def fetch_all_companies():
#     return company_profile_service.fetch_and_save_all()

# -------------------------------------------------
# FETCH SINGLE DAY DATA FOR ALL STOCKS
# -------------------------------------------------
@router.post("/refresh-single-day")
def refresh_single_day():

    saved = company_profile_service.refresh_single_day()

    return {
        "status": "success",
        "message": "Single day market data refreshed",
        "rows_saved": saved
    }


# -------------------------------------------------
# FETCH DATA FOR DATE RANGE
# -------------------------------------------------
@router.post("/refresh-range")
def refresh_range(
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)")
):

    saved = company_profile_service.refresh_range(start, end)

    return {
        "status": "success",
        "message": "Historical market data refreshed",
        "start_date": start,
        "end_date": end,
        "rows_saved": saved
    }


# -------------------------------------------------
# FETCH DATA FOR ONE SYMBOL (LAST DAY)
# -------------------------------------------------
@router.get("/symbol/{symbol}")
def fetch_symbol(symbol: str):

    rows = company_profile_service.fetch_single_day(symbol)

    if not rows:
        return {
            "status": "failed",
            "message": "No data found"
        }

    return {
        "status": "success",
        "data": rows
    }