import logging
from apscheduler.schedulers.background import BackgroundScheduler

from app.services.nse_fetch_service import NseFetchService
from app.services.nse_dynamic_service import nse_dynamic

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------
# SINGLE GLOBAL SCHEDULER
# ---------------------------------------------------------
scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


# ---------------------------------------------------------
# CRON JOB
# ---------------------------------------------------------
def nse_indices_cron():
    """
    Fetch NSE indices and save dynamically to DB
    """
    try:
        logger.info("⏰ NSE Indices CRON started")

        nse_fetch = NseFetchService()   # create fresh session
        indices = nse_fetch.fetch_all_indices()

        if not indices:
            logger.warning("⚠ No NSE indices data received")
            return

        result = nse_dynamic.save("all_indices", indices)

        logger.info(
            f"✅ NSE Indices Saved | "
            f"Rows Inserted: {result.get('records', 0)} | "
            f"Fetched: {len(indices)}"
        )

    except Exception as e:
        logger.error("❌ NSE Indices CRON failed", exc_info=True)


# ---------------------------------------------------------
# START SCHEDULER
# ---------------------------------------------------------
def start_nse_indices_scheduler():
    """
    Start NSE indices scheduler (hourly)
    """

    scheduler.add_job(
        nse_indices_cron,
        trigger="interval",
        hours=1,
        id="nse_indices_cron",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )

    scheduler.start()
    logger.info("🚀 NSE Indices Scheduler started (runs every 1 hour)")

    # ⚡ Optional immediate run on startup
    nse_indices_cron()
