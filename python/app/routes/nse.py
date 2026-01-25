from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.screener_service import screener_service  # your service file

router = APIRouter()

# -------------------- Health Check --------------------
@router.get("/health")
async def health():
    """Check if Screener service is running"""
    return {"status": "screener_service_healthy"}


# -------------------- Get Company Info --------------------
@router.get("/company-info/{symbol}")
async def company_info(symbol: str):
    """Get company name for a given symbol"""
    try:
        company_name = screener_service.get_company_info(symbol)
        return {"symbol": symbol, "company_name": company_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------- Scrape Screener.in Data --------------------
@router.get("/scrape/{symbol}")
async def scrape(symbol: str, statement_type: str = Query("consolidated", description="financial statement type")):
    """Scrape data from Screener.in without saving to MySQL"""
    try:
        data = screener_service.get_screener_data(symbol, statement_type)
        return {"status": "success", "symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Save Data to MySQL --------------------
@router.post("/save")
async def save_data(symbol: str, statement_type: str = Query("consolidated", description="financial statement type")):
    """Scrape and save data to MySQL for a specific symbol"""
    try:
        data = screener_service.get_screener_data(symbol, statement_type)
        screener_service.save_to_mysql(data, symbol)
        return {"status": "success", "message": f"Data saved for {symbol}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Fetch and Save Pipeline --------------------
@router.get("/fetch-and-save/{symbol}")
async def fetch_and_save(symbol: str, statement_type: str = Query("consolidated", description="financial statement type")):
    """Full pipeline: fetch data from Screener.in and save to MySQL"""
    try:
        data = screener_service.fetch_and_save(symbol, statement_type)
        return {"status": "success", "symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Fetch Only (No Save) --------------------
@router.get("/fetch/{symbol}")
async def fetch_only(symbol: str, statement_type: str = Query("consolidated", description="financial statement type")):
    """Fetch data from Screener.in without saving to MySQL"""
    try:
        data = screener_service.get_screener_data(symbol, statement_type)
        return {"status": "success", "symbol": symbol, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


