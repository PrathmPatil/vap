from fastapi import APIRouter
from app.services.gov_news_service import gov_news_service

router = APIRouter()

# ---------------------------------------
# INDIVIDUAL ROUTES
# ---------------------------------------

@router.post("/news-on-air")
def news_on_air_api(pageNumber: int = 1, pageSize: int = 15):
    return gov_news_service.fetch_and_save(
        table_name="news_on_air",
        endpoint="/news/news-on-air/dataservices/getnewsonair",
        payload={
            "mustFilter": [],
            "pageNumber": pageNumber,
            "pageSize": pageSize
        }
    )


@router.post("/pib-ministry")
def pib_ministry_api(pageNumber: int = 1, pageSize: int = 100):
    return gov_news_service.fetch_and_save(
        table_name="pib_ministry",
        endpoint="/news/pib-news/dataservices/getpibministry",
        payload={
            "pageNumber": pageNumber,
            "pageSize": pageSize
        }
    )


@router.post("/pib-news")
def pib_news_api(pageNumber: int = 1, pageSize: int = 15):
    return gov_news_service.fetch_and_save(
        table_name="pib_news",
        endpoint="/news/pib-news/dataservices/getpibnews",
        payload={
            "npiFilters": [],
            "pageNumber": pageNumber,
            "pageSize": pageSize
        }
    )


@router.post("/dd-news")
def dd_news_api(pageNumber: int = 1, pageSize: int = 15):
    return gov_news_service.fetch_and_save(
        table_name="dd_news",
        endpoint="/news/dd-news/dataservices/getddnews",
        payload={
            "mustFilter": [],
            "pageNumber": pageNumber,
            "pageSize": pageSize
        }
    )

# ---------------------------------------------------------
# MASTER ROUTE → RUN ALL APIS AT ONCE
# ---------------------------------------------------------

@router.post("/fetch-all")
def fetch_all_news():
    results = {}

    results["news_on_air"] = gov_news_service.fetch_and_save(
        table_name="news_on_air",
        endpoint="/news/news-on-air/dataservices/getnewsonair",
        payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15}
    )

    results["pib_ministry"] = gov_news_service.fetch_and_save(
        table_name="pib_ministry",
        endpoint="/news/pib-news/dataservices/getpibministry",
        payload={"pageNumber": 1, "pageSize": 100}
    )

    results["pib_news"] = gov_news_service.fetch_and_save(
        table_name="pib_news",
        endpoint="/news/pib-news/dataservices/getpibnews",
        payload={"npiFilters": [], "pageNumber": 1, "pageSize": 15}
    )

    results["dd_news"] = gov_news_service.fetch_and_save(
        table_name="dd_news",
        endpoint="/news/dd-news/dataservices/getddnews",
        payload={"mustFilter": [], "pageNumber": 1, "pageSize": 15}
    )

    return {
        "status": "success",
        "message": "All news sources fetched successfully!",
        "results": results
    }
