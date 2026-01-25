from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.services.nse_service import nse_service
import pymysql
import yfinance as yf
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/update-listed-companies")
async def update_listed_companies():
    """Sync NSE listed companies data"""
    result = nse_service.update_listed_companies()
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.post("/fetch-historical-data")
async def fetch_historical_data(period: str = Query("1mo", description="Period for historical data")):
    """Fetch historical data for all listed companies"""
    result = nse_service.fetch_historical_data(period)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.get("/get-historical-data/{symbol}")
async def get_historical_data(
    symbol: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get historical data for a specific symbol"""
    data = nse_service.get_historical_data(symbol, start_date, end_date)
    if not data:
        raise HTTPException(status_code=404, detail="No data found")
    return {"symbol": symbol, "count": len(data), "data": data}

@router.get("/listed-companies")
async def get_listed_companies():
    """Get all listed companies"""
    conn = nse_service.db_manager.get_connection(nse_service.config.DB_STOCK_MARKET)
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    cursor.execute("SELECT symbol, company_name FROM listed_companies")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"count": len(data), "companies": data}

# get route with symbol for check listed company
@router.get("/listed-companies/{symbol}")
async def get_listed_companies(symbol: str):
    # fetch_historical_data_for_symbol_test
    # call above function to fetch historical data for symbol
    data = nse_service.test_symbol_fetch(symbol)
    if not data:
        raise HTTPException(status_code=404, detail="No data found")
    return {"symbol": symbol, "count": len(data), "data": data}

@router.get("/quick-test/{symbol}")
async def quick_test(symbol: str):
    """Quick test for Yahoo Finance"""
    try:
        # Method 1: Direct download
        df1 = yf.download(symbol, period="1d", progress=False)
        
        # Method 2: Ticker object
        ticker = yf.Ticker(symbol)
        df2 = ticker.history(period="1d")
        
        # Method 3: With different interval
        df3 = ticker.history(period="5d", interval="1d")
        
        return {
            "method1_direct": {"empty": df1.empty, "columns": list(df1.columns) if not df1.empty else []},
            "method2_ticker": {"empty": df2.empty, "columns": list(df2.columns) if not df2.empty else []},
            "method3_5day": {"empty": df3.empty, "columns": list(df3.columns) if not df3.empty else []},
            "ticker_info_keys": list(ticker.info.keys()) if hasattr(ticker, 'info') and ticker.info else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fetch/{symbol}")
async def fetch_single(
    symbol: str,
    period: str = Query("1mo", description="Data period"),
    save_to_db: bool = Query(False, description="Save to database")
):
    """Fetch data for single symbol with retry logic"""
    try:
        from app.services.nse_service import nse_service
        
        # Clean symbol
        clean_symbol = symbol.upper().replace(".NS", "")
        
        # Try different formats
        formats_to_try = [
            clean_symbol,
            f"{clean_symbol}.NS",
            f"{clean_symbol}.BO",
            f"{clean_symbol}.NSE"
        ]
        
        for sym_format in formats_to_try:
            try:
                logger.info(f"Trying: {sym_format}")
                ticker = yf.Ticker(sym_format)
                df = ticker.history(period=period)
                
                if not df.empty:
                    if save_to_db:
                        # Call your service method to save
                        pass
                    
                    return {
                        "status": "success",
                        "symbol": sym_format,
                        "rows": len(df),
                        "data": df.reset_index().to_dict("records"),
                        "columns": list(df.columns)
                    }
                    
            except Exception as e:
                logger.warning(f"Failed with {sym_format}: {e}")
                time.sleep(1)  # Delay before next try
        
        return {
            "status": "failed",
            "message": "Could not fetch data with any symbol format",
            "tried_formats": formats_to_try
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))