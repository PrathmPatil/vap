from apscheduler.schedulers.background import BackgroundScheduler
from app.services.gov_news_service import gov_news_service

scheduler = BackgroundScheduler()


def daily_gov_news_job():
    print("🔵 Running Daily Government News Job...")

    gov_news_service.fetch_and_save(
        table_name="news_on_air",
        endpoint="/news/news-on-air/dataservices/getnewsonair",
        payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15},
    )

    gov_news_service.fetch_and_save(
        table_name="pib_ministry",
        endpoint="/news/pib-news/dataservices/getpibministry",
        payload={"pageNumber": 1, "pageSize": 100},
    )

    gov_news_service.fetch_and_save(
        table_name="pib_news",
        endpoint="/news/pib-news/dataservices/getpibnews",
        payload={"npiFilters": [], "pageNumber": 1, "pageSize": 15},
    )

    gov_news_service.fetch_and_save(
        table_name="dd_news",
        endpoint="/news/dd-news/dataservices/getddnews",
        payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15},
    )

    print("🟢 Govt News Fetch Completed")


def start_gov_news_cron():
    scheduler.add_job(daily_gov_news_job, "cron", hour=4, minute=0)
    scheduler.start()
    print("🕒 Daily Gov News Cron Started (4:00 AM)")
