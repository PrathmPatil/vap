from apscheduler.schedulers.background import BackgroundScheduler
from app.services.nse_service import nse_service
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def cron_fetch_all():
    logger.info("🕒 CRON started: Fetching all listed companies (1y)")

    try:
        result = nse_service.fetch_all_listed(period="1y")
        logger.info(
            f"✅ CRON completed | Total: {result['total']} | "
            f"Success: {result['success']} | Failed: {result['failed']}"
        )
    except Exception as e:
        logger.error(f"❌ CRON failed: {e}", exc_info=True)


def start_yfinance_cron():
    """
    Starts YFinance cron:
    1️⃣ Runs once at startup
    2️⃣ Runs daily at 2 AM
    """

    # ✅ Run once at startup
    cron_fetch_all()

    # ✅ Scheduled daily run
    scheduler.add_job(
        cron_fetch_all,
        trigger="cron",
        hour=2,
        minute=0,
        id="fetch_all_listed_1y",
        replace_existing=True
    )

    scheduler.start()
    logger.info("🚀 YFinance CRON scheduler started")
