from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services.company_profile_service import company_service
from app.services.finnhub_data_service import MarketService
import logging
import pytz

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone=pytz.timezone("Asia/Kolkata"))

market_service = MarketService()


def fetch_and_save_market_data():
    try:
        logger.info("📈 Fetching market data...")
        data = market_service.fetch_market_data()
        market_service.save_market_data(data)
        logger.info("✅ Market data saved successfully")
    except Exception as e:
        logger.error(f"❌ Market data cron failed: {e}")


def start_company_profile_cron():

    if scheduler.running:
        logger.info("Scheduler already running")
        return

    # Initial company fetch
    scheduler.add_job(
        func=company_service.fetch_and_save_all,
        id="initial_fetch",
        misfire_grace_time=None
    )

    # Company profile every 12 hours
    scheduler.add_job(
        func=company_service.fetch_and_save_all,
        trigger=IntervalTrigger(hours=12),
        id="fetch_companies_periodic",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600
    )

    # Market data every 1 hour
    scheduler.add_job(
        func=fetch_and_save_market_data,
        trigger=IntervalTrigger(minutes=4),
        id="market_data_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600
    )

    scheduler.start()

    logger.info("📅 Company profile CRON scheduled every 12 hours")
    logger.info("📈 Market data CRON scheduled every 1 hour")