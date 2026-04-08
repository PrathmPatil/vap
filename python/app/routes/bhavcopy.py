# app/routes/bhavcopy_routes.py
from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, List
import math
from datetime import datetime

# ✅ FIXED IMPORT - Changed from 'bhavcopy' to 'bhavcopy_cron'
from app.cron.bhavcopy_cron import (
    manual_fetch_bhavcopy,
    manual_fetch_today,
    manual_fetch_range,
    manual_fetch_from_url,
    manual_fetch_multiple_urls,
    get_bhavcopy_status,
    generate_bhavcopy_url
)

router = APIRouter(prefix="/bhavcopy", tags=["Bhavcopy"])


@router.get("/fetch-range")
async def api_fetch_bhavcopy_range(
    start_date: str = Query(..., example="2025-10-01"),
    end_date: str = Query(..., example="2025-10-14"),
    force_refresh: bool = Query(False, description="Force refresh even if data exists")
):
    """
    Fetch and store NSE Bhavcopy data between start_date and end_date.
    Useful for fetching historical data.
    """
    try:
        result = manual_fetch_range(start_date, end_date, force_refresh)
        
        # Convert NaN/inf to None for JSON serialization
        def sanitize(obj):
            if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            elif isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [sanitize(i) for i in obj]
            return obj

        sanitized_result = sanitize(result)
        
        return {
            "status": "success",
            "data": sanitized_result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/fetch-today")
async def api_fetch_today_bhavcopy(force_refresh: bool = Query(False)):
    """Fetch today's bhavcopy data"""
    try:
        result = manual_fetch_today(force_refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fetch-date/{date}")
async def api_fetch_date_bhavcopy(
    date: str,
    force_refresh: bool = Query(False)
):
    """Fetch bhavcopy for a specific date (YYYY-MM-DD)"""
    try:
        result = manual_fetch_bhavcopy(date, force_refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch-from-url")
async def api_fetch_from_url(
    url: str = Body(..., embed=True),
    date: Optional[str] = Body(None, embed=True)
):
    """
    Fetch bhavcopy from a manual URL
    
    Example URL:
    https://www.nseindia.com/api/archives/csv/BhavCopy_CM_070426_FTP.zip
    """
    try:
        result = manual_fetch_from_url(url, date)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch-multiple-urls")
async def api_fetch_multiple_urls(urls: List[str] = Body(..., embed=True)):
    """
    Fetch bhavcopy from multiple manual URLs
    """
    try:
        results = manual_fetch_multiple_urls(urls)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def api_bhavcopy_status(date: Optional[str] = Query(None)):
    """Check if bhavcopy data exists for a specific date"""
    try:
        result = get_bhavcopy_status(date)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generate-url/{date}")
async def api_generate_url(date: str):
    """Generate Bhavcopy URL for a specific date"""
    try:
        url = generate_bhavcopy_url(date)
        return {
            "date": date,
            "url": url,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/health")
async def bhavcopy_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "bhavcopy_service",
        "features": ["cron", "manual", "url_fetch"]
    }