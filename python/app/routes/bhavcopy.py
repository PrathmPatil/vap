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
    generate_bhavcopy_url,
    manual_fetch_date_with_formulas,
    manual_fetch_range_with_formulas,
    list_missing_bhavcopy_dates,
    clear_stuck_cron_logs,
    manual_run_formulas_for_range,
)

router = APIRouter(tags=["Bhavcopy"])


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


@router.post("/fetch-date-with-formulas/{date}")
async def api_fetch_date_with_formulas(
    date: str,
    force_refresh: bool = Query(False, description="Reprocess even if data exists"),
):
    """Fetch one trade date then run all formulas (same pipeline as daily cron)."""
    try:
        return manual_fetch_date_with_formulas(date, force_refresh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch-range-with-formulas")
async def api_fetch_range_with_formulas(
    start_date: str = Query(..., example="2026-06-28"),
    end_date: str = Query(..., example="2026-07-03"),
    force_refresh: bool = Query(False),
):
    """Backfill missing weekdays then run formulas for each successful PR day."""
    try:
        return manual_fetch_range_with_formulas(start_date, end_date, force_refresh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/missing-dates")
async def api_missing_dates(
    start_date: str = Query(..., example="2026-06-01"),
    end_date: str = Query(..., example="2026-07-21"),
):
    """List weekdays in range that still need PR bhavcopy."""
    try:
        return list_missing_bhavcopy_dates(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run-formulas-for-range")
async def api_run_formulas_for_range(
    start_date: str = Query(..., example="2026-07-06"),
    end_date: str = Query(..., example="2026-07-20"),
):
    """
    Run formula engine only (no bhavcopy download) for PR dates already in DB.
    Use after a range fetch when formula steps timed out / backend restarted.
    """
    try:
        return manual_run_formulas_for_range(start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-stuck-logs")
async def api_clear_stuck_logs(
    older_than_minutes: int = Query(120, ge=1, le=10080),
):
    """Mark stuck RUNNING cron logs as FAILED (after process crash / restart)."""
    try:
        return clear_stuck_cron_logs(older_than_minutes)
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
    https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR160626.zip
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