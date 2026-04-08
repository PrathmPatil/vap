from fastapi import APIRouter, Query
from datetime import datetime
from typing import Optional, List
from app.services.indian_market_service import indian_market_service

router = APIRouter()


@router.get("/holidays", tags=["Indian Market"])
async def get_holidays(
    segment: Optional[str] = Query("CM", description="Market segment (CM, FO, CD, COM, etc.)"),
    year: Optional[int] = Query(None, description="Year to filter"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get market holidays from database"""
    holidays = indian_market_service.get_holidays_from_db(
        segment=segment,
        year=year,
        start_date=start_date,
        end_date=end_date
    )
    
    return {
        "status": "success",
        "count": len(holidays),
        "segment": segment,
        "holidays": holidays
    }


@router.get("/upcoming-holidays", tags=["Indian Market"])
async def get_upcoming_holidays(days: int = Query(30, description="Number of days to look ahead")):
    """Get upcoming market holidays"""
    upcoming = indian_market_service.get_upcoming_holidays(days)
    
    return {
        "status": "success",
        "days_ahead": days,
        "count": len(upcoming),
        "holidays": upcoming
    }


@router.get("/market-status", tags=["Indian Market"])
async def get_market_status(date: Optional[str] = Query(None, description="Date (YYYY-MM-DD), default today")):
    """Get market status for a specific date"""
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    else:
        target_date = None
    
    status = indian_market_service.get_market_status_for_date(target_date)
    
    return {
        "status": "success",
        "market_info": status
    }


@router.post("/sync-holidays", tags=["Indian Market"])
async def sync_holidays(segment: Optional[str] = Query("CM", description="Segment to sync")):
    """Manually trigger holiday sync from NSE API"""
    result = indian_market_service.fetch_and_save_holidays(segment)
    
    return {
        "status": "success",
        "message": f"Synced holidays for {segment} segment",
        "inserted": result['inserted'],
        "duplicates": result['duplicates'],
        "errors": result['errors']
    }