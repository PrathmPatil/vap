from apscheduler.schedulers.background import BackgroundScheduler
from app.services.nse_service import nse_service
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def cron_fetch_all():
    logger.info("CRON started: Fetching all listed companies (1y)")
    nse_service.fetch_all_listed(period="1y")

def start_yfinance_cron():
    scheduler.add_job(
        cron_fetch_all,
        trigger="cron",
        hour=2,   # 2 AM
        minute=0,
        id="fetch_all_listed_1y",
        replace_existing=True
    )

    scheduler.start()
    logger.info("YFinance CRON scheduler started")
