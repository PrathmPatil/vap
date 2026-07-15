# app/cron/bhavcopy_cron.py
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import timezone, timedelta, datetime
from typing import Optional, List, Dict
from app.services.bhavcopy_service import bhavcopy_service
from app.services.backend_formula_service import (
    trigger_backend_formula_refresh,
    trigger_backend_formula_refresh_for_dates,
    extract_trade_dates_from_bhavcopy_results,
)
from app.services.cron_logger_service import cron_logger
from app.utils.cron_decorator import CronJobContext

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))
scheduler = BackgroundScheduler(timezone=IST)


def should_run_formulas(bhavcopy_result: Dict) -> bool:
    """Run formulas when PR bhavcopy exists for the trade date."""
    if bhavcopy_result.get("status") != "SUCCESS":
        return False

    pr_status = (bhavcopy_result.get("data") or {}).get("pr", {}).get("status")
    if pr_status in ("SUCCESS", "ALREADY_EXISTS"):
        return True

    return bhavcopy_result.get("files_processed", 0) > 0


def refresh_formula_cache(
    trigger_source: str,
    context: Optional[CronJobContext] = None,
    trade_date: Optional[str] = None,
):
    """Refresh formula tables in formula DB for a PR trade date."""
    result = trigger_backend_formula_refresh(trigger_source, trade_date=trade_date)

    if context is not None:
        context.set_data(formula_refresh=result, formula_trade_date=trade_date)

    if result.get("success"):
        logger.info(
            "Formula engine completed from %s for %s in %ss",
            trigger_source,
            trade_date or "latest",
            result.get("duration_seconds"),
        )
    else:
        logger.warning(
            "Formula engine failed from %s for %s: %s",
            trigger_source,
            trade_date or "latest",
            result.get("error") or result.get("response"),
        )

    return result


def run_formulas_for_bhavcopy_results(
    trigger_source: str,
    context: Optional[CronJobContext],
    primary_result: Dict,
    backfill_results: Optional[List[Dict]] = None,
):
    trade_dates = []

    if should_run_formulas(primary_result) and primary_result.get("date"):
        trade_dates.append(primary_result["date"])

    if backfill_results:
        trade_dates.extend(extract_trade_dates_from_bhavcopy_results(backfill_results))

    trade_dates = sorted({date for date in trade_dates if date})
    if not trade_dates:
        logger.info("Skipping formula engine: no new PR bhavcopy dates to process")
        return None

    if len(trade_dates) == 1:
        return refresh_formula_cache(trigger_source, context, trade_date=trade_dates[0])

    formula_results = trigger_backend_formula_refresh_for_dates(trigger_source, trade_dates)

    if context is not None:
        context.set_data(formula_refresh=formula_results, formula_trade_dates=trade_dates)

    return formula_results


def bhavcopy_job():
    """Main job to fetch Bhavcopy data with logging"""
    with CronJobContext("bhavcopy_daily", "bhavcopy") as context:
        logger.info("🔥 Bhavcopy cron started")
        
        result = bhavcopy_service.fetch_today_bhavcopy(force_refresh=False)
        context.set_data(fetch_duration_seconds=result.get("duration_seconds"))
        
        if result.get("status") == "SUCCESS":
            files_processed = result.get("files_processed", 0)
            context.add_record(processed=files_processed)
            context.set_data(files_processed=files_processed, result=result)
            logger.info(f"✅ Successfully processed {files_processed} files")

            backfill_results = None
            if files_processed > 0:
                end_date = datetime.now().date()
                start_date = end_date - timedelta(days=7)
                missing_result = bhavcopy_service.fetch_missing_dates(
                    start_date.strftime("%Y-%m-%d"),
                    end_date.strftime("%Y-%m-%d")
                )
                backfill_results = missing_result.get("results", [])
                context.set_data(missing_dates=missing_result.get("missing_dates", 0))
                context.set_data(missing_duration_seconds=missing_result.get("duration_seconds"))

            run_formulas_for_bhavcopy_results(
                "bhavcopy_daily",
                context,
                primary_result=result,
                backfill_results=backfill_results,
            )
                
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
        context.set_data(
            missing_dates=missing,
            total_dates=result.get("total_dates", 0),
            fetch_duration_seconds=result.get("duration_seconds"),
        )

        if processed > 0:
            run_formulas_for_bhavcopy_results(
                "bhavcopy_missing",
                context,
                primary_result={"status": "SUCCESS", "date": None, "data": {}},
                backfill_results=result.get("results", []),
            )
        
        logger.info(f"✅ Missing data check complete: {missing} missing, {processed} processed")


def _parse_bhavcopy_cron_trigger() -> CronTrigger:
    """Use BHAVCOPY_UPDATE_CRON from env; fall back to 18:00 IST daily."""
    from app.config import config

    cron_expr = (
        str(config.SCHEDULER_CONFIG.get("bhavcopy_update") or "0 18 * * *")
        .strip()
        .strip('"')
        .strip("'")
    )
    try:
        return CronTrigger.from_crontab(cron_expr, timezone=IST)
    except ValueError as error:
        logger.warning(
            "Invalid BHAVCOPY_UPDATE_CRON '%s' (%s); using 0 18 * * *",
            cron_expr,
            error,
        )
        return CronTrigger(hour=18, minute=0, timezone=IST)


def fetch_today_bhavcopy_cron():
    """Start Bhavcopy cron scheduler - schedule first, then run once."""
    if scheduler.running:
        logger.warning("Bhavcopy scheduler already running")
        return

    # Register jobs BEFORE the immediate run so a fetch failure cannot
    # leave the daily scheduler unregistered (this was happening on prod).
    cron_trigger = _parse_bhavcopy_cron_trigger()
    scheduler.add_job(
        bhavcopy_job,
        cron_trigger,
        id="bhavcopy_daily_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        fetch_missing_bhavcopy_job,
        CronTrigger(day_of_week="sun", hour=2, minute=0, timezone=IST),
        id="bhavcopy_missing_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info(
        "✅ Bhavcopy scheduler started | daily=%s | timezone=IST",
        cron_trigger,
    )

    logger.info("⏳ Running bhavcopy_job immediately (fetching latest trade date)...")
    try:
        bhavcopy_job()
    except Exception as error:
        logger.exception(
            "Immediate bhavcopy fetch failed (scheduler still active): %s",
            error,
        )


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
        exists = bhavcopy_service.is_trade_date_processed(date_obj)
        
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
    return bhavcopy_service.build_bhavcopy_url(date_obj)