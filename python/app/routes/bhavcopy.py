# app/routes/bhavcopy_routes.py
from fastapi import APIRouter, Query, HTTPException, Body, WebSocket, WebSocketDisconnect
from typing import Optional, List
import math
import logging
import threading
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
    manual_run_formulas_for_date,
)

from app.services.manual_job_hub import manual_job_hub

router = APIRouter(tags=["Bhavcopy"])
logger = logging.getLogger(__name__)


def _spawn_background(job_label: str, fn, *args, **kwargs):
    """Run long Manual API work off the request thread so the browser gets an immediate ack."""

    def _runner():
        try:
            manual_job_hub.emit(
                "job_queued",
                message=f"Background thread started: {job_label}",
                job_label=job_label,
            )
            fn(*args, **kwargs)
        except Exception as exc:
            logger.exception("Background %s failed", job_label)
            manual_job_hub.emit(
                "job_failed",
                message=str(exc),
                job_label=job_label,
                status="FAILED",
            )

    thread = threading.Thread(target=_runner, name=job_label, daemon=True)
    thread.start()
    return thread.name


@router.websocket("/manual-jobs/ws")
async def manual_jobs_websocket(websocket: WebSocket):
    """Live progress for manual bhavcopy/formula jobs (fetch phases + formula runs)."""
    await manual_job_hub.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data.strip().lower() == "ping":
                await websocket.send_json(
                    {"type": "pong", "timestamp": datetime.utcnow().isoformat() + "Z"}
                )
    except WebSocketDisconnect:
        pass
    finally:
        manual_job_hub.disconnect(websocket)


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
    background: bool = Query(
        True,
        description="If true (default), return immediately and track via cron logs job_name=bhavcopy_manual",
    ),
):
    """Fetch one trade date then run all formulas (same pipeline as daily cron)."""
    try:
        if background:
            _spawn_background(
                f"bhavcopy_manual_{date}",
                manual_fetch_date_with_formulas,
                date,
                force_refresh,
            )
            return {
                "status": "STARTED",
                "date": date,
                "force_refresh": force_refresh,
                "message": (
                    "Job started in background. Browser will not wait. "
                    "Track in Master → Cron Logs: filter job name bhavcopy_manual "
                    "(stays RUNNING until formulas finish; View Details shows phase)."
                ),
                "track": {
                    "job_name": "bhavcopy_manual",
                    "job_group": "bhavcopy",
                    "target_date": date,
                },
            }
        return manual_fetch_date_with_formulas(date, force_refresh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fetch-range-with-formulas")
async def api_fetch_range_with_formulas(
    start_date: str = Query(..., example="2026-06-28"),
    end_date: str = Query(..., example="2026-07-03"),
    force_refresh: bool = Query(False),
    background: bool = Query(
        True,
        description="If true (default), return immediately; track job_name=bhavcopy_manual_range",
    ),
):
    """Backfill missing weekdays then run formulas for each successful PR day."""
    try:
        if background:
            _spawn_background(
                f"bhavcopy_manual_range_{start_date}_{end_date}",
                manual_fetch_range_with_formulas,
                start_date,
                end_date,
                force_refresh,
            )
            return {
                "status": "STARTED",
                "start_date": start_date,
                "end_date": end_date,
                "force_refresh": force_refresh,
                "message": (
                    "Range job started in background. Track Cron Logs as "
                    "job_name=bhavcopy_manual_range (RUNNING until all formulas finish)."
                ),
                "track": {
                    "job_name": "bhavcopy_manual_range",
                    "job_group": "bhavcopy",
                },
            }
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


@router.post("/run-formulas-for-date/{date}")
async def api_run_formulas_for_date(
    date: str,
    background: bool = Query(
        True,
        description="If true (default), return immediately; track via WebSocket + job_name=formula_manual_range",
    ),
):
    """Run formula engine for one trade date (preferred Manual API — streams on WebSocket)."""
    try:
        if background:
            _spawn_background(
                f"formula_manual_{date}",
                manual_run_formulas_for_date,
                date,
            )
            return {
                "status": "STARTED",
                "date": date,
                "message": (
                    "Formula job started in background. Watch Live progress "
                    "(WebSocket) or Cron Logs job_name=formula_manual_range."
                ),
                "track": {
                    "job_name": "formula_manual_range",
                    "job_group": "formula",
                    "trade_date": date,
                },
            }
        return manual_run_formulas_for_date(date)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-formulas-for-range")
async def api_run_formulas_for_range(
    start_date: str = Query(..., example="2026-07-06"),
    end_date: str = Query(..., example="2026-07-20"),
    background: bool = Query(
        True,
        description="If true (default), return immediately; track job_name=formula_manual_range",
    ),
):
    """
    Run formula engine only (no bhavcopy download) for PR dates already in DB.
    Use after a range fetch when formula steps timed out / backend restarted.
    """
    try:
        if background:
            _spawn_background(
                f"formula_manual_range_{start_date}_{end_date}",
                manual_run_formulas_for_range,
                start_date,
                end_date,
            )
            return {
                "status": "STARTED",
                "start_date": start_date,
                "end_date": end_date,
                "message": (
                    "Formula range started in background. Track Cron Logs as "
                    "job_name=formula_manual_range."
                ),
                "track": {
                    "job_name": "formula_manual_range",
                    "job_group": "formula",
                },
            }
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