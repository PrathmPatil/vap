from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.screener_service import screener_service

router = APIRouter()

# ---------- Health ----------
@router.get("/health")
def health():
    return {"status": "screener_service_healthy"}

# ---------- Company Info ----------
@router.get("/company-info/{symbol}")
def company_info(symbol: str):
    try:
        company_name = screener_service.get_company_info(symbol)
        return {"symbol": symbol, "company_name": company_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------- Scrape only ----------
@router.get("/scrape/{symbol}")
def scrape(symbol: str, statement_type: str = Query("consolidated")):
    try:
        data = screener_service.get_screener_data(symbol, statement_type)
        return {"status": "success", "symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Save scraped data ----------
@router.post("/save")
def save_data(payload: BaseModel = None):
    try:
        screener_service.save_to_mysql(payload.data, payload.symbol)
        return {"status": "success", "message": f"Data saved for {payload.symbol}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Fetch and save ----------
@router.get("/fetch-and-save/{symbol}")
def fetch_and_save(symbol: str, statement_type: str = Query("consolidated")):
    try:
        data = screener_service.fetch_and_save(symbol, statement_type)
        return {"status": "success", "symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Fetch only ----------
@router.get("/fetch/{symbol}")
def fetch_only(symbol: str, statement_type: str = Query("consolidated")):
    try:
        data = screener_service.get_screener_data(symbol, statement_type)
        return {"status": "success", "symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
