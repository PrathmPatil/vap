from apscheduler.schedulers.background import BackgroundScheduler
from app.services.company_profile_service import company_profile_service
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def daily_company_profile_job():
    logger.info("🕒 Daily CRON started: Fetching company profiles")

    try:
        result = company_profile_service.fetch_and_save_all(limit=500)
        logger.info(f"✅ CRON completed: {result}")
    except Exception as e:
        logger.error(f"❌ CRON failed: {e}")


def start_company_profile_cron():
    scheduler.add_job(
        daily_company_profile_job,
        trigger="cron",
        hour=2,       # 2 AM IST
        minute=30,
        id="daily_company_profile",
        replace_existing=True
    )

    scheduler.start()
    logger.info("🚀 Company profile daily CRON scheduled")
