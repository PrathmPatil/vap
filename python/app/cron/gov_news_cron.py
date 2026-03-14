import logging
from app.services.gov_news_service import gov_news_service
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

logger = logging.getLogger(__name__)


def cron_fetch_all_gov_news():
    """
    Daily cron job to fetch all government news sources
    """
    logger.info("🕒 Gov News CRON started")

    try:

        # 1️⃣ News On Air
        gov_news_service.fetch_and_save(
            table_name="news_on_air",
            endpoint="/news/news-on-air/dataservices/getnewsonair",
            payload={"pageNumber": 1, "pageSize": 100},
        )

        # 2️⃣ PIB Ministry
        gov_news_service.fetch_and_save(
            table_name="pib_ministry",
            endpoint="/news/pib-news/dataservices/getpibministry",
            payload={"pageNumber": 1, "pageSize": 100},
        )

        # 3️⃣ PIB News
        gov_news_service.fetch_and_save(
            table_name="pib_news",
            endpoint="/news/pib-news/dataservices/getpibnews",
            payload={"npiFilters": [], "pageNumber": 1, "pageSize": 15},
        )

        # 4️⃣ PIB Photographs
        gov_news_service.fetch_and_save(
            table_name="pib_photographs",
            endpoint="/news/pib-photographs/dataservices/getPIBSearchNews",
            payload={"pageNumber": 1, "pageSize": 15, "termMatches": []},
        )

        # 5️⃣ DD News
        gov_news_service.fetch_and_save(
            table_name="dd_news",
            endpoint="/news/dd-news/dataservices/getddnews",
            payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15},
        )

        # 6️⃣ DD News Facet (filters metadata)
        # gov_news_service.fetch_and_save(
        #     table_name="dd_news_facet",
        #     endpoint="/news/dd-news/dataservices/getddnewsfacet",
        #     payload={},
        # )

        logger.info("✅ Gov News CRON completed successfully")

    except Exception:
        logger.exception("❌ Gov News CRON failed")


def start_gov_news_cron():
    """
    Register daily government news cron
    """

    # scheduler.add_job(
    #     cron_fetch_all_gov_news,
    #     trigger="cron",
    #     minute=5,   # runs every hour at :05
    #     id="gov_news_daily_cron",
    #     replace_existing=True,
    #     max_instances=1,
    #     coalesce=True
    # )
    scheduler.add_job(
        cron_fetch_all_gov_news,
        trigger="cron",
        minute="*/5",   # every 5 minutes
        id="gov_news_5min_cron",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )

    # 🚀 START SCHEDULER
    if not scheduler.running:
        scheduler.start()

    logger.info("🚀 Gov News CRON registered and scheduler started")
    # ALTER TABLE pib_news ADD UNIQUE KEY unique_news (title(255));