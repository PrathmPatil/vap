from apscheduler.schedulers.background import BackgroundScheduler
from app.services.company_profile_service import company_profile_service
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def company_profile_job():
    logger.info("🕒 CRON started: Fetching company profiles")

    try:
        saved_count = company_profile_service.fetch_and_save_all()
        logger.info(f"✅ CRON completed successfully. Saved {saved_count} profiles")
    except Exception as e:
        logger.exception("❌ CRON failed while fetching company profiles")


def start_company_profile_cron():
    scheduler.add_job(
        company_profile_job,
        trigger="interval",
        hours=1,                 # ✅ runs every hour
        id="company_profile_cron",
        replace_existing=True,
        max_instances=1
    )

    scheduler.start()
    logger.info("🚀 Company profile CRON scheduled (every 1 hour)")
