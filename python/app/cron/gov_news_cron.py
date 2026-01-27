from apscheduler.schedulers.background import BackgroundScheduler
from app.services.gov_news_service import gov_news_service
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def cron_fetch_all_gov_news():
    """
    Daily cron to fetch all government news sources
    """
    logger.info("CRON started: Fetching all government news")

    try:
        gov_news_service.fetch_and_save(
            table_name="news_on_air",
            endpoint="/news/news-on-air/dataservices/getnewsonair",
            payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15}
        )

        gov_news_service.fetch_and_save(
            table_name="pib_ministry",
            endpoint="/news/pib-news/dataservices/getpibministry",
            payload={"pageNumber": 1, "pageSize": 100}
        )

        gov_news_service.fetch_and_save(
            table_name="pib_news",
            endpoint="/news/pib-news/dataservices/getpibnews",
            payload={"npiFilters": [], "pageNumber": 1, "pageSize": 15}
        )

        gov_news_service.fetch_and_save(
            table_name="dd_news",
            endpoint="/news/dd-news/dataservices/getddnews",
            payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15}
        )

        logger.info("CRON completed: Government news fetched successfully")

    except Exception as e:
        logger.error(f"CRON failed: {e}", exc_info=True)


def start_gov_news_cron():
    """
    Start daily cron job (runs once per day)
    """
    scheduler.add_job(
        cron_fetch_all_gov_news,
        trigger="cron",
        hour=6,      # ⏰ 6 AM daily (change if needed)
        minute=0,
        id="gov_news_daily_cron",
        replace_existing=True
    )

    scheduler.start()
    logger.info("Government News CRON scheduler started")
