# app/routes/indian_market_routes.py
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional

from app.services.indian_market_service import indian_market_service

router = APIRouter(prefix="/indian-market", tags=["Indian Market"])

SEGMENTS = ["CM", "FO", "CD", "COM", "CBM", "IRD", "MF", "SLBS"]


@router.get("/holidays")
async def get_holidays(
    segment: str = Query("CM", description="CM, FO, CD, COM, CBM, IRD, MF, SLBS"),
    year: Optional[int] = Query(None, description="Filter by year"),
):
    """Get Indian market holidays from database."""
    try:
        holidays = indian_market_service.get_holidays_from_db(segment=segment)

        if year:
            holidays = [
                holiday
                for holiday in holidays
                if str(holiday.get("holiday_date", "")).startswith(str(year))
            ]

        return {
            "success": True,
            "segment": segment,
            "total": len(holidays),
            "holidays": holidays,
            "source": "database",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/sync-holidays")
async def sync_holidays(
    segment: Optional[str] = Query(None, description="Sync one segment or all when omitted"),
):
    """Fetch holidays from NSE and save to database."""
    try:
        if segment:
            result = indian_market_service.fetch_and_save_holidays(segment)
            return {
                "success": True,
                "segment": segment,
                **result,
            }

        totals = {"inserted": 0, "duplicates": 0, "errors": 0}
        for seg in SEGMENTS:
            result = indian_market_service.fetch_and_save_holidays(seg)
            totals["inserted"] += result.get("inserted", 0)
            totals["duplicates"] += result.get("duplicates", 0)
            totals["errors"] += result.get("errors", 0)

        return {
            "success": True,
            "segments": SEGMENTS,
            **totals,
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.get("/status")
async def get_market_status(date: Optional[str] = Query(None)):
    """Get market status for specific date (default: today)."""
    try:
        date_obj = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now()
        status = indian_market_service.get_market_status_for_date(date_obj)

        return {
            "success": True,
            "data": status,
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.get("/upcoming")
async def get_upcoming_holidays(days: int = Query(30, ge=1, le=365)):
    """Get upcoming market holidays from database."""
    try:
        holidays = indian_market_service.get_upcoming_holidays(days)

        return {
            "success": True,
            "days_ahead": days,
            "total": len(holidays),
            "holidays": holidays,
            "source": "database",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
