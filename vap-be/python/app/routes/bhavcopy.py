from fastapi import APIRouter, Query, HTTPException
from app.services.bhavcopy_service import bhavcopy_service
import math

router = APIRouter()

@router.get("/fetch-range")
async def fetch_bhavcopy_range(
    start_date: str = Query(..., example="2025-10-01"),
    end_date: str = Query(..., example="2025-10-14")
):
    """
    Fetch and store NSE Bhavcopy data between start_date and end_date.
    Useful for fetching historical data.
    """
    try:
        results = bhavcopy_service.fetch_bhavcopy_range(start_date, end_date)

        # Convert NaN/inf to None for JSON serialization
        def sanitize(obj):
            if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            elif isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [sanitize(i) for i in obj]
            return obj

        sanitized_results = sanitize(results)

        return {
            "status": "success",
            "records_processed": len(sanitized_results),
            "results": sanitized_results
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/fetch-today")
async def fetch_today_bhavcopy():
    """Fetch today's bhavcopy data"""
    try:
        result = bhavcopy_service.fetch_today_bhavcopy()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def bhavcopy_health():
    return {"status": "bhavcopy_service_healthy"}