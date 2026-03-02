from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services.company_profile_service import company_service
import logging
import pytz

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone=pytz.timezone("Asia/Kolkata"))


def start_company_profile_cron():

    if scheduler.running:
        logger.info("Scheduler already running")
        return

    # Run immediately once
    logger.info("🔥 Running company profile fetch immediately...")
    company_service.fetch_and_save_all()

    # ✅ Changed from 1 hour → 12 hours (IMPORTANT)
    scheduler.add_job(
        func=company_service.fetch_and_save_all,
        trigger=IntervalTrigger(hours=12),   # UPDATED
        id="fetch_companies",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600
    )

    scheduler.start()

    logger.info("🚀 Company profile CRON scheduled (every 12 hours)")