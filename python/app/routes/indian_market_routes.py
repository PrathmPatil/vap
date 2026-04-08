# app/routes/indian_market_routes.py
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional
from app.services.indian_market_service import indian_market_service

router = APIRouter(prefix="/indian-market", tags=["Indian Market"])


@router.get("/holidays")
async def get_holidays(
    segment: str = Query("CM", description="CM, FO, CD, COM, CBM, IRD, MF, SLBS"),
    year: Optional[int] = Query(None, description="Filter by year")
):
    """Get Indian market holidays from NSE API"""
    try:
        holidays = indian_market_service.fetch_holidays(segment)
        
        # Filter by year if specified
        if year:
            holidays = [h for h in holidays if h["date"].startswith(str(year))]
        
        return {
            "success": True,
            "segment": segment,
            "total": len(holidays),
            "holidays": holidays,
            "source": "NSE API"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all-holidays")
async def get_all_holidays():
    """Get holidays for all market segments"""
    try:
        all_holidays = indian_market_service.fetch_all_holidays()
        
        total = sum(len(h) for h in all_holidays.values())
        
        return {
            "success": True,
            "total": total,
            "segments": all_holidays,
            "source": "NSE API"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_market_status(date: Optional[str] = Query(None)):
    """Get market status for specific date (default: today)"""
    try:
        if date:
            date_obj = datetime.strptime(date, "%Y-%m-%d")
        else:
            date_obj = datetime.now()
        
        status = indian_market_service.get_market_status_for_date(date_obj)
        
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming")
async def get_upcoming_holidays(days: int = Query(30, ge=1, le=365)):
    """Get upcoming market holidays"""
    try:
        holidays = indian_market_service.get_upcoming_holidays(days)
        
        return {
            "success": True,
            "days_ahead": days,
            "total": len(holidays),
            "holidays": holidays,
            "source": "NSE API"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live-status")
async def get_live_market_status():
    """Get current live market status"""
    try:
        status = indian_market_service.fetch_market_status()
        
        return {
            "success": True,
            "data": status,
            "timestamp": datetime.now().isoformat(),
            "source": "NSE API"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
    
# # Get all holidays for CM segment
# curl "http://localhost:8080/indian-market/holidays?segment=CM"

# # Get all segments holidays
# curl "http://localhost:8080/indian-market/all-holidays"

# # Check if market is open today
# curl "http://localhost:8080/indian-market/status"

# # Get live market status
# curl "http://localhost:8080/indian-market/live-status"

# # Get upcoming holidays (next 60 days)
# curl "http://localhost:8080/indian-market/upcoming?days=60"    