import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import timezone, timedelta

from app.services.bhavcopy_service import bhavcopy_service

logger = logging.getLogger(__name__)

# IST timezone
IST = timezone(timedelta(hours=5, minutes=30))

scheduler = BackgroundScheduler(timezone=IST)


def bhavcopy_job():
    try:
        logger.info("🔥 Bhavcopy cron started")

        result = bhavcopy_service.fetch_today_bhavcopy()

        logger.info(f"Bhavcopy result: {result}")

        if result.get("status") != "SUCCESS":
            logger.error(f"❌ Bhavcopy failed reason: {result.get('message')}")

        logger.info(f"✅ Bhavcopy cron completed: {result.get('status')}")

    except Exception as e:
        logger.exception("❌ Bhavcopy cron crashed")


def fetch_today_bhavcopy_cron():
    """
    Run once at startup,
    then every 24 hours
    """

    if scheduler.running:
        logger.warning("Bhavcopy scheduler already running")
        return

    # ✅ Run once immediately at project start
    bhavcopy_job()

    # ✅ Then run every 24 hours
    scheduler.add_job(
        bhavcopy_job,
        IntervalTrigger(hours=24),
        id="bhavcopy_daily_job",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("✅ Bhavcopy scheduler started (every 24 hours)")