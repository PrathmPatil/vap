import logging
from apscheduler.schedulers.background import BackgroundScheduler

from app.services.nse_fetch_service import NseFetchService
from app.services.nse_indices_service import nse_indices

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# SINGLE SHARED SCHEDULER
# ---------------------------------------------------------
scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


# =========================================================
# INDICES CRON
# =========================================================
def nse_indices_cron():
    """
    Fetch NSE indices (UPSERT – no duplicates)
    """
    try:
        logger.info("⏰ NSE Indices CRON started")

        nse_fetch = NseFetchService()
        indices = nse_fetch.fetch_all_indices()

        if not indices:
            logger.warning("⚠ No NSE indices data received")
            return

        result = nse_indices.save("all_indices", indices)

        logger.info(
            f"✅ NSE Indices Saved | "
            f"Affected Rows: {result.get('affected_rows', 0)} | "
            f"Fetched: {len(indices)}"
        )

    except Exception:
        logger.exception("❌ NSE Indices CRON failed")


# =========================================================
# QUOTES CRON
# =========================================================
def nse_quotes_cron():
    """
    Fetch NSE live quotes (UPSERT – no duplicates)
    """
    try:
        logger.info("⏰ NSE Quotes CRON started")

        nse_fetch = NseFetchService()

        # ⚠ KEEP LIMIT LOW – NSE BLOCKS HARD
        quotes = nse_fetch.fetch_live_quotes(limit=25)

        if not quotes:
            logger.warning("⚠ No NSE quotes received")
            return

        result = nse_indices.save("live_quotes", quotes)

        logger.info(
            f"✅ NSE Quotes Saved | "
            f"Affected Rows: {result.get('affected_rows', 0)} | "
            f"Fetched: {len(quotes)}"
        )

    except Exception:
        logger.exception("❌ NSE Quotes CRON failed")


# =========================================================
# START SCHEDULER
# =========================================================
def start_nse_indices_scheduler():
    """
    Start NSE indices + quotes scheduler
    - Run immediately on startup
    - Then every 5 hours
    """

    scheduler.add_job(
        nse_indices_cron,
        trigger="interval",
        hours=5,
        id="nse_indices_cron",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )

    scheduler.add_job(
        nse_quotes_cron,
        trigger="interval",
        hours=5,
        id="nse_quotes_cron",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )

    scheduler.start()
    logger.info("🚀 NSE Indices + Quotes Scheduler started (every 5 hours)")

    # 🔥 IMMEDIATE RUN ON PROJECT START
    nse_indices_cron()
    nse_quotes_cron()
