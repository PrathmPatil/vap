from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.yfinance_service import yfinance_service

router = APIRouter()


# -------------------- Health Check --------------------
@router.get("/health")
async def health():
    return {"status": "yfinance service healthy"}


# -------------------- Get Company Info --------------------
@router.get("/company-info/{symbol}")
async def company_info(symbol: str):
    try:
        data = yfinance_service.fetch_company_info(symbol)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------- Save Company Info --------------------
@router.post("/save-company/{symbol}")
async def save_company(symbol: str):
    try:
        data = yfinance_service.fetch_company_info(symbol)
        yfinance_service.save_company_info(data)
        return {"status": "success", "message": f"Company info saved for {symbol}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------- Fetch Historical Data --------------------
@router.post("/fetch-history/{symbol}")
async def fetch_history(
    symbol: str,
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD")
):
    """Fetch historical data for a symbol between given dates and save to DB"""
    try:
        # Call class method
        data = yfinance_service.fetch_historical_data(symbol, start_date, end_date)
        return {
            "status": "success",
            "message": f"Historical data saved for {symbol}",
            "inserted_rows": data.get("inserted_rows", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))