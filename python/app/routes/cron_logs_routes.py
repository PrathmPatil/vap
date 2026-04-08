# app/routes/cron_logs_routes.py
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.cron_logger_service import cron_logger

router = APIRouter(prefix="/cron-logs", tags=["Cron Logs"])


@router.get("/history")
async def get_cron_history(
    job_name: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(100, ge=1, le=1000)
):
    """Get cron job execution history"""
    try:
        history = cron_logger.get_job_history(job_name, days, limit)
        return {
            "success": True,
            "total": len(history),
            "logs": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_cron_stats(
    job_name: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365)
):
    """Get cron job statistics"""
    try:
        stats = cron_logger.get_job_stats(job_name, days)
        return {
            "success": True,
            "period_days": days,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/failed")
async def get_failed_jobs(
    days: int = Query(7, ge=1, le=30),
    limit: int = Query(50, ge=1, le=500)
):
    """Get failed job executions"""
    try:
        failed_jobs = cron_logger.get_failed_jobs(days, limit)
        return {
            "success": True,
            "total": len(failed_jobs),
            "failed_jobs": failed_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily-summary")
async def get_daily_summary(days: int = Query(7, ge=1, le=30)):
    """Get daily job execution summary"""
    try:
        summary = cron_logger.get_daily_summary(days)
        return {
            "success": True,
            "period_days": days,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cleanup")
async def cleanup_old_logs(days: int = Query(90, ge=30, le=365)):
    """Delete logs older than specified days"""
    try:
        deleted = cron_logger.cleanup_old_logs(days)
        return {
            "success": True,
            "deleted_count": deleted,
            "message": f"Deleted {deleted} logs older than {days} days"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs")
async def get_all_jobs():
    """Get list of all unique cron jobs"""
    try:
        history = cron_logger.get_job_history(days=30, limit=1000)
        unique_jobs = list(set(log['job_name'] for log in history))
        
        return {
            "success": True,
            "total_jobs": len(unique_jobs),
            "jobs": sorted(unique_jobs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def check_logger_health():
    """Check if logger service is working"""
    try:
        # Try to get recent logs to verify table exists
        recent_logs = cron_logger.get_job_history(days=1, limit=1)
        
        return {
            "success": True,
            "status": "healthy",
            "table_exists": cron_logger.table_created,
            "recent_logs_count": len(recent_logs)
        }
    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }
        
        
        
#         # Test if table was created
# curl http://localhost:8000/cron-logs/health

# # View any existing logs
# curl http://localhost:8000/cron-logs/history

# # Check job statistics
# curl http://localhost:8000/cron-logs/stats