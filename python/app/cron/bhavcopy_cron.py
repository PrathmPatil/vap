# app/cron/bhavcopy_cron.py
import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import timezone, timedelta, datetime
from typing import Optional, List, Dict
from app.services.bhavcopy_service import bhavcopy_service
from app.services.backend_formula_service import (
    trigger_backend_formula_refresh,
    trigger_backend_formula_refresh_for_dates,
    extract_trade_dates_from_bhavcopy_results,
    get_latest_pr_trade_date,
    list_pr_trade_dates_in_range,
)
from app.services.cron_logger_service import cron_logger
from app.utils.cron_decorator import CronJobContext

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))
scheduler = BackgroundScheduler(timezone=IST)
BHAVCOPY_RETRY_JOB_ID = "bhavcopy_retry_job"
BHAVCOPY_DAILY_JOB_ID = "bhavcopy_daily_job"


def _bhavcopy_retry_interval_hours() -> int:
    try:
        return max(1, int(os.getenv("BHAVCOPY_RETRY_INTERVAL_HOURS", "2")))
    except ValueError:
        return 2


def _now_ist() -> datetime:
    return datetime.now(IST)


def _calendar_trade_datetime(for_date=None) -> Optional[datetime]:
    """Weekday date at midnight (naive) for bhavcopy fetch."""
    day = for_date or _now_ist().date()
    if day.weekday() >= 5:
        return None
    return datetime.combine(day, datetime.min.time())


def _latest_missing_trade_date(within_days: int = 7) -> Optional[datetime]:
    """Most recent weekday still missing PR/eq bhavcopy (today first)."""
    today = _now_ist().date()
    for days_back in range(within_days):
        day = today - timedelta(days=days_back)
        if day.weekday() >= 5:
            continue
        date_obj = datetime.combine(day, datetime.min.time())
        if not bhavcopy_service.is_trade_date_processed(date_obj):
            return date_obj
    return None


def _schedule_bhavcopy_retry():
    """Retry every N hours until the latest missing bhavcopy succeeds."""
    if scheduler.get_job(BHAVCOPY_RETRY_JOB_ID):
        return

    hours = _bhavcopy_retry_interval_hours()
    scheduler.add_job(
        bhavcopy_retry_job,
        IntervalTrigger(hours=hours, timezone=IST),
        id=BHAVCOPY_RETRY_JOB_ID,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    logger.info(
        "Bhavcopy retry scheduled every %s hour(s) until fetch succeeds",
        hours,
    )


def _clear_bhavcopy_retry():
    job = scheduler.get_job(BHAVCOPY_RETRY_JOB_ID)
    if job:
        scheduler.remove_job(BHAVCOPY_RETRY_JOB_ID)
        logger.info("Bhavcopy retry job stopped (data fetched)")


def _handle_bhavcopy_success(
    context: CronJobContext,
    result: Dict,
    trigger_source: str,
    run_backfill: bool = True,
):
    files_processed = result.get("files_processed", 0)
    context.add_record(processed=files_processed)
    context.set_data(files_processed=files_processed, result=result)
    logger.info(
        "Successfully processed %s files for %s",
        files_processed,
        result.get("date"),
    )

    backfill_results = None
    if run_backfill and files_processed > 0:
        end_date = _now_ist().date()
        start_date = end_date - timedelta(days=7)
        missing_result = bhavcopy_service.fetch_missing_dates(
            start_date.strftime("%Y-%m-%d"),
            end_date.strftime("%Y-%m-%d"),
        )
        backfill_results = missing_result.get("results", [])
        context.set_data(missing_dates=missing_result.get("missing_dates", 0))
        context.set_data(
            missing_duration_seconds=missing_result.get("duration_seconds")
        )

    run_formulas_for_bhavcopy_results(
        trigger_source,
        context,
        primary_result=result,
        backfill_results=backfill_results,
    )
    _clear_bhavcopy_retry()


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
    job_meta = {}
    if context is not None:
        job_meta = {
            "log_id": context.log_id,
            "job_name": context.job_name,
            "job_group": context.job_group,
        }
    result = trigger_backend_formula_refresh(
        trigger_source,
        trade_date=trade_date,
        job_meta=job_meta,
    )

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

    formula_results = trigger_backend_formula_refresh_for_dates(
        trigger_source, trade_dates, context=context
    )

    if context is not None:
        context.set_data(formula_refresh=formula_results, formula_trade_dates=trade_dates)

    return formula_results


def bhavcopy_job(from_daily_cron: bool = False):
    """Fetch latest missing bhavcopy; at 8 PM IST schedule 2h retries on failure."""
    with CronJobContext("bhavcopy_daily", "bhavcopy") as context:
        logger.info("Bhavcopy cron started (daily=%s)", from_daily_cron)

        target = _latest_missing_trade_date(within_days=7)
        if target is None:
            logger.info("All recent bhavcopy dates already present")
            context.set_data(status="UP_TO_DATE")
            _clear_bhavcopy_retry()
            # Still refresh formulas for latest PR date so UI sections stay current
            latest = get_latest_pr_trade_date()
            if latest:
                logger.info(
                    "Bhavcopy up to date — running formula engine for %s", latest
                )
                refresh_formula_cache(
                    "bhavcopy_uptodate", context, trade_date=latest
                )
            return

        logger.info("Fetching bhavcopy for trade date: %s", target.date())
        result = bhavcopy_service.process_zip_for_date(target, force_refresh=False)
        context.set_data(fetch_duration_seconds=result.get("duration_seconds"))

        if result.get("status") == "SUCCESS":
            _handle_bhavcopy_success(context, result, "bhavcopy_daily")
        elif result.get("status") == "NOT_FOUND":
            logger.warning("Bhavcopy not yet available for %s", target.date())
            context.set_data(status="NOT_FOUND", target_date=str(target.date()))
            if from_daily_cron or _now_ist().hour >= 20:
                _schedule_bhavcopy_retry()
        elif result.get("status") == "WEEKEND":
            logger.info("Weekend, no Bhavcopy expected")
            context.set_data(status="WEEKEND")
            _clear_bhavcopy_retry()
        else:
            logger.error("Bhavcopy failed: %s", result.get("message"))
            context.set_data(error_message=result.get("message"))
            if from_daily_cron or _now_ist().hour >= 20:
                _schedule_bhavcopy_retry()


def bhavcopy_daily_job():
    """8 PM IST entry point — fetch today; start 2h retry loop if NSE not ready."""
    bhavcopy_job(from_daily_cron=True)


def bhavcopy_retry_job():
    """Retry fetch every 2 hours until the latest missing trade date succeeds."""
    if _latest_missing_trade_date(within_days=7) is None:
        _clear_bhavcopy_retry()
        return
    bhavcopy_job(from_daily_cron=False)


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
    """Use BHAVCOPY_UPDATE_CRON from env; fall back to 20:00 IST daily."""
    from app.config import config

    cron_expr = (
        str(config.SCHEDULER_CONFIG.get("bhavcopy_update") or "0 20 * * *")
        .strip()
        .strip('"')
        .strip("'")
    )
    try:
        return CronTrigger.from_crontab(cron_expr, timezone=IST)
    except ValueError as error:
        logger.warning(
            "Invalid BHAVCOPY_UPDATE_CRON '%s' (%s); using 0 20 * * *",
            cron_expr,
            error,
        )
        return CronTrigger(hour=20, minute=0, timezone=IST)


def fetch_today_bhavcopy_cron():
    """Start Bhavcopy cron scheduler - schedule first, then run once."""
    if scheduler.running:
        logger.warning("Bhavcopy scheduler already running")
        return

    # Register jobs BEFORE the immediate run so a fetch failure cannot
    # leave the daily scheduler unregistered (this was happening on prod).
    cron_trigger = _parse_bhavcopy_cron_trigger()
    scheduler.add_job(
        bhavcopy_daily_job,
        cron_trigger,
        id=BHAVCOPY_DAILY_JOB_ID,
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
    retry_hours = _bhavcopy_retry_interval_hours()
    logger.info(
        "Bhavcopy scheduler started | daily=%s | retry_every=%sh | timezone=IST",
        cron_trigger,
        retry_hours,
    )

    now = _now_ist()
    if now.hour >= 20 and _calendar_trade_datetime() and _latest_missing_trade_date():
        logger.info("Past 8 PM IST with missing bhavcopy — running catch-up fetch now")
        try:
            bhavcopy_daily_job()
        except Exception as error:
            logger.exception(
                "Catch-up bhavcopy fetch failed (scheduler still active): %s",
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


def manual_fetch_date_with_formulas(date_str: str, force_refresh: bool = False):
    """Fetch one trade date then run the backend formula engine (same as cron)."""
    with CronJobContext("bhavcopy_manual", "bhavcopy") as context:
        context.flush_progress(phase="fetching_bhavcopy", target_date=date_str)
        result = manual_fetch_bhavcopy(date_str, force_refresh)
        context.set_data(result=result, target_date=date_str)
        context.add_record(processed=result.get("files_processed", 0) or 0)
        context.flush_progress(
            phase="bhavcopy_done",
            bhavcopy_status=result.get("status"),
        )

        formula_result = None
        if should_run_formulas(result):
            context.flush_progress(phase="running_formulas", trade_date=date_str)
            formula_result = refresh_formula_cache(
                "bhavcopy_manual", context, trade_date=date_str
            )
        elif result.get("status") == "SUCCESS":
            # Data may already exist — still refresh formulas for that date
            context.flush_progress(phase="running_formulas", trade_date=date_str)
            formula_result = refresh_formula_cache(
                "bhavcopy_manual_existing", context, trade_date=date_str
            )
            if not (result.get("files_processed") or 0):
                context.add_record(processed=1)
        elif result.get("status") in ("ALREADY_EXISTS", "SKIPPED"):
            # Prefer DB truth: if PR exists, still run formulas
            from datetime import datetime as _dt
            from app.services.bhavcopy_service import bhavcopy_service

            date_obj = _dt.strptime(date_str, "%Y-%m-%d")
            if bhavcopy_service.is_trade_date_processed(date_obj):
                context.flush_progress(phase="running_formulas", trade_date=date_str)
                formula_result = refresh_formula_cache(
                    "bhavcopy_manual_existing", context, trade_date=date_str
                )
                context.add_record(processed=1)
            else:
                context.set_data(
                    status="NO_PR_DATA",
                    message=f"No PR bhavcopy in DB for {date_str}; re-fetch with force_refresh=true",
                )
        else:
            context.set_data(status=result.get("status"), message=result.get("message"))

        context.flush_progress(phase="done", formula_refresh=formula_result)
        return {
            "status": result.get("status"),
            "date": date_str,
            "bhavcopy": result,
            "formula_refresh": formula_result,
            "log_id": context.log_id,
        }


def manual_fetch_range_with_formulas(
    start_date: str, end_date: str, force_refresh: bool = False
):
    """Fetch a date range, then run formulas for each successful PR day."""
    with CronJobContext("bhavcopy_manual_range", "bhavcopy") as context:
        context.flush_progress(
            phase="fetching_bhavcopy_range",
            start_date=start_date,
            end_date=end_date,
        )
        result = manual_fetch_range(start_date, end_date, force_refresh)
        results = result.get("results") or []
        context.set_data(
            start_date=start_date,
            end_date=end_date,
            successful=result.get("successful"),
            failed=result.get("failed"),
        )
        context.add_record(processed=result.get("successful", 0) or 0)
        context.flush_progress(
            phase="bhavcopy_done",
            successful=result.get("successful"),
            failed=result.get("failed"),
        )

        # Prefer DB truth for the requested range (covers SUCCESS / ALREADY_EXISTS skips).
        trade_dates = list_pr_trade_dates_in_range(start_date, end_date)
        if not trade_dates:
            trade_dates = extract_trade_dates_from_bhavcopy_results(results)
            for item in results:
                if item.get("status") == "SUCCESS" and item.get("date"):
                    if item["date"] not in trade_dates:
                        trade_dates.append(item["date"])

        formula_results = None
        if trade_dates:
            context.flush_progress(
                phase="running_formulas",
                trade_dates=trade_dates,
                formula_total=len(trade_dates),
            )
            formula_results = trigger_backend_formula_refresh_for_dates(
                "bhavcopy_manual_range", trade_dates, context=context
            )
            context.set_data(
                formula_refresh=formula_results,
                formula_trade_dates=trade_dates,
            )
        else:
            context.set_data(
                status="NO_PR_DATES",
                message=f"No PR bhavcopy in DB for {start_date}..{end_date}",
            )

        context.flush_progress(phase="done", formula_refresh=formula_results)
        return {
            "status": "SUCCESS" if (result.get("successful") or 0) > 0 else result.get("status", "DONE"),
            "start_date": start_date,
            "end_date": end_date,
            "bhavcopy": result,
            "formula_trade_dates": sorted(set(trade_dates)),
            "formula_refresh": formula_results,
            "log_id": context.log_id,
        }


def list_missing_bhavcopy_dates(start_date: str, end_date: str):
    """List weekdays in range that are missing PR/eq bhavcopy data."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    missing = []
    present = []
    cursor = start
    while cursor <= end:
        if cursor.weekday() < 5:
            if bhavcopy_service.is_trade_date_processed(cursor):
                present.append(str(cursor.date()))
            else:
                missing.append(str(cursor.date()))
        cursor += timedelta(days=1)
    return {
        "start_date": start_date,
        "end_date": end_date,
        "missing_dates": missing,
        "present_dates": present,
        "missing_count": len(missing),
        "present_count": len(present),
    }


def manual_run_formulas_for_range(start_date: str, end_date: str):
    """
    Run formula engine only for weekdays that already have PR data.
    Use after a successful bhavcopy backfill when formula calls timed out.
    """
    with CronJobContext("formula_manual_range", "formula") as context:
        trade_dates = list_pr_trade_dates_in_range(start_date, end_date)
        context.set_data(
            start_date=start_date,
            end_date=end_date,
            trade_dates=trade_dates,
        )
        context.flush_progress(phase="listed_trade_dates", trade_date_count=len(trade_dates))
        if not trade_dates:
            context.set_data(status="NO_PR_DATA")
            return {
                "status": "NO_PR_DATA",
                "start_date": start_date,
                "end_date": end_date,
                "trade_dates": [],
                "formula_refresh": [],
                "message": "No PR bhavcopy dates found in range",
                "log_id": context.log_id,
            }

        context.add_record(processed=len(trade_dates))
        context.flush_progress(phase="running_formulas")
        formula_results = trigger_backend_formula_refresh_for_dates(
            "formula_manual_range", trade_dates, context=context
        )
        ok = sum(1 for r in formula_results if r.get("success"))
        failed = len(formula_results) - ok
        context.set_data(
            formula_refresh=formula_results,
            formula_ok=ok,
            formula_failed=failed,
        )
        context.flush_progress(phase="done")
        return {
            "status": "SUCCESS" if failed == 0 else "PARTIAL",
            "start_date": start_date,
            "end_date": end_date,
            "trade_dates": trade_dates,
            "formula_ok": ok,
            "formula_failed": failed,
            "formula_refresh": formula_results,
            "log_id": context.log_id,
        }


def manual_run_formulas_for_date(date_str: str):
    """Run formula engine for a single PR trade date (WebSocket + cron log tracked)."""
    return manual_run_formulas_for_range(date_str, date_str)


def clear_stuck_cron_logs(older_than_minutes: int = 120):
    return cron_logger.clear_stuck_running(older_than_minutes)

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