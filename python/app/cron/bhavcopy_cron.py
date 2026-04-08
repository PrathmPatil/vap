# app/cron/bhavcopy_cron.py
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import timezone, timedelta, datetime
from typing import Optional, List, Dict
from app.services.bhavcopy_service import bhavcopy_service
from app.services.cron_logger_service import cron_logger
from app.utils.cron_decorator import CronJobContext

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))
scheduler = BackgroundScheduler(timezone=IST)


def bhavcopy_job():
    """Main job to fetch Bhavcopy data with logging"""
    with CronJobContext("bhavcopy_daily", "bhavcopy") as context:
        logger.info("🔥 Bhavcopy cron started")
        
        result = bhavcopy_service.fetch_today_bhavcopy(force_refresh=False)
        
        if result.get("status") == "SUCCESS":
            files_processed = result.get("files_processed", 0)
            context.add_record(processed=files_processed)
            context.set_data(files_processed=files_processed, result=result)
            logger.info(f"✅ Successfully processed {files_processed} files")
            
            # Check for missing dates
            if files_processed > 0:
                end_date = datetime.now().date()
                start_date = end_date - timedelta(days=7)
                missing_result = bhavcopy_service.fetch_missing_dates(
                    start_date.strftime("%Y-%m-%d"),
                    end_date.strftime("%Y-%m-%d")
                )
                context.set_data(missing_dates=missing_result.get("missing_dates", 0))
                
        elif result.get("status") == "NOT_FOUND":
            logger.warning(f"⚠ Bhavcopy not yet available for today")
            context.set_data(status="NOT_FOUND")
        elif result.get("status") == "WEEKEND":
            logger.info(f"📅 Weekend, no Bhavcopy expected")
            context.set_data(status="WEEKEND")
        else:
            logger.error(f"❌ Bhavcopy failed: {result.get('message')}")
            context.set_data(error_message=result.get('message'))


def fetch_missing_bhavcopy_job():
    """Job to fetch missing historical data with logging"""
    with CronJobContext("bhavcopy_missing", "bhavcopy") as context:
        logger.info("🔍 Checking for missing Bhavcopy data...")
        
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        result = bhavcopy_service.fetch_missing_dates(
            start_date.strftime("%Y-%m-%d"),
            end_date.strftime("%Y-%m-%d")
        )
        
        missing = result.get("missing_dates", 0)
        processed = result.get("processed", 0)
        
        context.add_record(processed=processed)
        context.set_data(missing_dates=missing, total_dates=result.get("total_dates", 0))
        
        logger.info(f"✅ Missing data check complete: {missing} missing, {processed} processed")


def fetch_today_bhavcopy_cron():
    """Start Bhavcopy cron scheduler"""
    if scheduler.running:
        logger.warning("Bhavcopy scheduler already running")
        return

    # Run once immediately
    bhavcopy_job()

    # Run daily at 6:00 PM IST
    scheduler.add_job(
        bhavcopy_job,
        CronTrigger(hour=20, minute=0),
        id="bhavcopy_daily_job",
        replace_existing=True,
    )
    
    # Run missing data check every Sunday at 2:00 AM
    scheduler.add_job(
        fetch_missing_bhavcopy_job,
        CronTrigger(day_of_week='sun', hour=2, minute=0),
        id="bhavcopy_missing_job",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("✅ Bhavcopy scheduler started (daily at 6:00 PM IST)")


# =========================================================
# MANUAL TRIGGER FUNCTIONS (FOR API INTEGRATION)
# =========================================================

def manual_fetch_bhavcopy(date_str: str, force_refresh: bool = False):
    """
    Manually fetch Bhavcopy for a specific date
    
    Args:
        date_str: Date in YYYY-MM-DD format
        force_refresh: If True, reprocess even if data exists
    
    Returns:
        Dict with fetch results
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        result = bhavcopy_service.process_zip_for_date(date_obj, force_refresh)
        logger.info(f"Manual fetch for {date_str}: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Manual fetch failed: {e}")
        return {"status": "ERROR", "message": str(e)}


def manual_fetch_today(force_refresh: bool = False):
    """
    Manually fetch today's Bhavcopy
    
    Args:
        force_refresh: If True, reprocess even if data exists
    
    Returns:
        Dict with fetch results
    """
    try:
        result = bhavcopy_service.fetch_today_bhavcopy(force_refresh)
        logger.info(f"Manual today fetch: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Manual today fetch failed: {e}")
        return {"status": "ERROR", "message": str(e)}


def manual_fetch_range(start_date: str, end_date: str, force_refresh: bool = False):
    """
    Manually fetch Bhavcopy for a date range
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        force_refresh: If True, reprocess even if data exists
    
    Returns:
        Dict with fetch results
    """
    try:
        result = bhavcopy_service.fetch_bhavcopy_range(start_date, end_date, force_refresh)
        logger.info(f"Manual range fetch {start_date} to {end_date}: {result.get('successful')} successful")
        return result
    except Exception as e:
        logger.error(f"Manual range fetch failed: {e}")
        return {"status": "ERROR", "message": str(e)}


def manual_fetch_from_url(url: str, date_str: Optional[str] = None):
    """
    Manually fetch Bhavcopy from a direct URL
    
    Args:
        url: Direct URL to the Bhavcopy zip file
        date_str: Optional date in YYYY-MM-DD format
    
    Returns:
        Dict with fetch results
    """
    try:
        date_obj = None
        if date_str:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        
        result = bhavcopy_service.fetch_from_manual_url(url, date_obj)
        logger.info(f"Manual URL fetch: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Manual URL fetch failed: {e}")
        return {"status": "ERROR", "message": str(e)}


def manual_fetch_multiple_urls(urls: List[str]):
    """
    Manually fetch Bhavcopy from multiple URLs
    
    Args:
        urls: List of direct URLs to Bhavcopy zip files
    
    Returns:
        List of dicts with fetch results
    """
    try:
        results = bhavcopy_service.fetch_multiple_manual_urls(urls)
        logger.info(f"Manual multiple URLs fetch: {len(results)} processed")
        return results
    except Exception as e:
        logger.error(f"Manual multiple URLs fetch failed: {e}")
        return [{"status": "ERROR", "message": str(e)}]


def get_bhavcopy_status(date_str: Optional[str] = None):
    """
    Check if Bhavcopy data exists for a specific date
    
    Args:
        date_str: Date in YYYY-MM-DD format (defaults to today)
    
    Returns:
        Dict with status information
    """
    try:
        if date_str:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            date_obj = datetime.now()
        
        # Check main equity table
        exists = bhavcopy_service.is_date_processed("eq", date_obj)
        
        return {
            "date": str(date_obj.date()),
            "exists": exists,
            "status": "EXISTS" if exists else "MISSING"
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"status": "ERROR", "message": str(e)}


def generate_bhavcopy_url(date_str: str) -> str:
    """
    Generate Bhavcopy URL for a specific date
    
    Args:
        date_str: Date in YYYY-MM-DD format
    
    Returns:
        URL string
    """
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    date_code = date_obj.strftime("%d%m%y")
    return f"https://www.nseindia.com/api/archives/csv/BhavCopy_CM_{date_code}_FTP.zip"