from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.yfinance_service import yfinance_service
from app.database.connection import db_manager
from app.config import config
from datetime import date, timedelta

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
    
@router.get("/companies")
async def get_companies(
    limit: int = Query(100, ge=1),
    offset: int = Query(0, ge=0)
):
    """
    Fetch company symbols from DB to be used by scrapers
    """
    try:
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT symbol, name
            FROM companies
            ORDER BY symbol
            LIMIT %s OFFSET %s
        """, (limit, offset))

        data = cursor.fetchall()
        conn.close()

        return {
            "status": "success",
            "count": len(data),
            "companies": data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# get_indian_tickers
@router.get("/indian-tickers")
async def get_indian_tickers():
    try:
        conn = db_manager.get_connection(
            config.DB_STOCK_MARKET,
            dict_cursor=True  # ✅ clean fix
        )
        cursor = conn.cursor()

        cursor.execute("""
            SELECT symbol
            FROM companies
            WHERE symbol LIKE '%.NS' OR symbol LIKE '%.BO'
        """)

        rows = cursor.fetchall()
        symbols = [row["symbol"] for row in rows]

        cursor.close()
        conn.close()

        return {
            "status": "success",
            "count": len(symbols),
            "symbols": symbols
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# fetch_and_store_listed_companies
@router.post("/fetch-and-store-listed-companies")
async def fetch_and_store_listed_companies():
    try:
        result = yfinance_service.sync_new_listed_companies()
        return {"status": "success", "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
# full-sync
@router.post("/full-sync")
async def full_sync(
    limit: int = Query(20, ge=1),
    history_days: int = Query(365, ge=1)
):
    """
    Full sync:
    - Fetch company info
    - Save to DB
    - Fetch historical data
    """
    try:
        symbols = yfinance_service.get_indian_tickers()[:limit]

        start_date = (date.today() - timedelta(days=history_days)).isoformat()
        end_date = date.today().isoformat()

        success, failed = 0, []

        for symbol in symbols:
            try:
                data = yfinance_service.fetch_company_info(symbol)
                yfinance_service.save_company_info(data)
                # REMOVE .NS suffix for history fetch
                symbol = symbol.replace(".NS", "").replace(".BO", "")
                yfinance_service.fetch_historical_data(
                    symbol,
                    start_date,
                    end_date
                )

                success += 1

            except Exception as e:
                failed.append({"symbol": symbol, "error": str(e)})

        return {
            "status": "completed",
            "success_count": success,
            "failed_count": len(failed),
            "failed": failed[:5]  # avoid huge response
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


