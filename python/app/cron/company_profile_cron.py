from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from app.services.company_profile_service import company_service, fetch_and_save_market_data
from app.config import config
import logging
import pytz

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(
    timezone=pytz.timezone("Asia/Kolkata"),
    executors={"default": ThreadPoolExecutor(max_workers=3)},
    job_defaults={"coalesce": True, "max_instances": 1}
)

def start_company_profile_cron():
    """Start the background scheduler for company profiles and market data"""
    
    if scheduler.running:
        logger.info("⚠ Company Profile Scheduler already running")
        return

    # Run once immediately
    scheduler.add_job(
        func=company_service.fetch_and_save_all,
        id="initial_fetch",
        next_run_time=datetime.now(pytz.timezone("Asia/Kolkata"))
    )

    # Fetch company profiles every 12 hours
    scheduler.add_job(
        func=company_service.fetch_and_save_all,
        trigger=IntervalTrigger(hours=12),
        id="fetch_companies_periodic",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600
    )

    # Fetch market data (configurable interval)
    scheduler.add_job(
        func=fetch_and_save_market_data,
        trigger=IntervalTrigger(minutes=config.SCHEDULER_MARKET_FETCH_INTERVAL_MINUTES),
        id="market_data_job",
        replace_existing=True,
        max_instances=config.SCHEDULER_MARKET_FETCH_MAX_INSTANCES,
        coalesce=True,
        misfire_grace_time=600
    )

    scheduler.start()

    logger.info(f"📅 Company profile CRON scheduled every 12 hours")
    logger.info(f"📈 Market data CRON scheduled every {config.SCHEDULER_MARKET_FETCH_INTERVAL_MINUTES} minutes (max_instances={config.SCHEDULER_MARKET_FETCH_MAX_INSTANCES})")