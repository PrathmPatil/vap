from apscheduler.schedulers.background import BackgroundScheduler
from app.services.company_profile_service import company_service
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


# def company_profile_job():
#     logger.info("🕒 CRON started: Fetching company profiles")

#     try:
#         saved_count = company_profile_service.fetch_and_save_all()
#         logger.info(f"✅ CRON completed successfully. Saved {saved_count} profiles")
#     except Exception as e:
#         logger.exception("❌ CRON failed while fetching company profiles")


# def start_company_profile_cron():
#     scheduler.add_job(
#         company_profile_job,
#         trigger="interval",
#         # hours=10,                 # ✅ runs every hour
#         minutes=6,
#         id="company_profile_cron",
#         replace_existing=True,
#         max_instances=1
#     )

#     scheduler.start()
#     logger.info("🚀 Company profile CRON scheduled (every 1 hour)")

def start_company_profile_cron():
    scheduler.add_job(
        company_service.fetch_and_save_all,
        "interval",
        # hours=6,   # NOT 
        minutes=6,
        id="fetch_companies",
        max_instances=1,
        replace_existing=True,
    )

    scheduler.start()
    logger.info("🚀 Company profile CRON scheduled (every 1 hour)")