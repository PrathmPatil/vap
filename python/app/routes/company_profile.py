from fastapi import APIRouter, Query
from app.services.company_profile_service_copy import company_profile_service

router = APIRouter()

# -------------------------------------------------
# FETCH SINGLE COMPANY
# -------------------------------------------------
@router.get("/fetch/{symbol}")
def fetch_single_company(symbol: str):
    data = company_profile_service.fetch_company_info(symbol)

    if not data:
        return {"status": "failed", "message": "No data found"}

    company_profile_service.save_company(data)
    return {"status": "success", "data": data}


# -------------------------------------------------
# FETCH ALL LISTED COMPANIES
# -------------------------------------------------
@router.post("/fetch-all")
def fetch_all_companies():
    return company_profile_service.fetch_and_save_all()
