# app/cron/listed_companies_cron_service.py

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.yfinance_service import get_yfinance_service

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


class ListedCompaniesCronService:
    """
    Scrapes NSE listed companies:
    ✅ Runs once on app startup
    ✅ Runs every 5 hours
    ✅ Inserts ONLY new companies
    """

    def __init__(self):
        self.job_id = "listed_companies_5h"

    # ---------------------------------------------------------
    # Core Job
    # ---------------------------------------------------------
    def fetch_listed_companies(self):
        logger.info("🕒 Listed Companies CRON started")

        try:
            result = get_yfinance_service().sync_new_listed_companies()

            logger.info(
                f"✅ Listed Companies Sync Completed | "
                f"Total Fetched: {result.get('total')} | "
                f"Inserted: {result.get('inserted')} | "
                f"Skipped (existing): {result.get('skipped')}"
            )

        except Exception as e:
            logger.exception(f"❌ Listed Companies CRON failed: {e}")

    # ---------------------------------------------------------
    # Scheduler Start
    # ---------------------------------------------------------
    def start(self):
        """
        1️⃣ Run once immediately (on project start)
        2️⃣ Run every 5 hours thereafter
        """

        # 🔥 Run immediately on startup
        self.fetch_listed_companies()

        # 🔁 Schedule every 5 hours
        scheduler.add_job(
            self.fetch_listed_companies,
            trigger="interval",
            hours=5,
            id=self.job_id,
            replace_existing=True,
            max_instances=1,
            coalesce=True
        )

        scheduler.start()
        logger.info("🚀 Listed Companies CRON scheduled (every 5 hours)")


# ✅ Singleton instance
listed_companies_cron_service = ListedCompaniesCronService()
