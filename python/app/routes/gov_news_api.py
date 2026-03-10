from fastapi import APIRouter
from app.services.gov_news_service import gov_news_service

router = APIRouter()

# ---------------------------------------
# INDIVIDUAL ROUTES
# ---------------------------------------

# 1️⃣ News On Air
@router.post("/news-on-air")
def news_on_air_api(pageNumber: int = 1, pageSize: int = 100):
    return gov_news_service.fetch_and_save(
        table_name="news_on_air",
        endpoint="/news/news-on-air/dataservices/getnewsonair",
        payload={
            "pageNumber": pageNumber,
            "pageSize": pageSize
        }
    )


# 2️⃣ PIB Ministry
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


# 3️⃣ PIB News
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


# 4️⃣ PIB Photographs
@router.post("/pib-photographs")
def pib_photographs_api(pageNumber: int = 1, pageSize: int = 15):
    return gov_news_service.fetch_and_save(
        table_name="pib_photographs",
        endpoint="/news/pib-photographs/dataservices/getPIBSearchNews",
        payload={
            "pageNumber": pageNumber,
            "pageSize": pageSize,
            "termMatches": []
        }
    )


# 5️⃣ DD News
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


# 6️⃣ DD News Facet (Filters)
@router.post("/dd-news-facet")
def dd_news_facet_api():
    return gov_news_service.fetch_and_save(
        table_name="dd_news_facet",
        endpoint="/news/dd-news/dataservices/getddnewsfacet",
        payload={}
    )


# ---------------------------------------------------------
# MASTER ROUTE → RUN ALL APIS
# ---------------------------------------------------------

@router.post("/fetch-all")
def fetch_all_news():

    results = {}

    results["news_on_air"] = gov_news_service.fetch_and_save(
        "news_on_air",
        "/news/news-on-air/dataservices/getnewsonair",
        {"pageNumber": 1, "pageSize": 100}
    )

    results["pib_ministry"] = gov_news_service.fetch_and_save(
        "pib_ministry",
        "/news/pib-news/dataservices/getpibministry",
        {"pageNumber": 1, "pageSize": 100}
    )

    results["pib_news"] = gov_news_service.fetch_and_save(
        "pib_news",
        "/news/pib-news/dataservices/getpibnews",
        {"npiFilters": [], "pageNumber": 1, "pageSize": 15}
    )

    results["pib_photographs"] = gov_news_service.fetch_and_save(
        "pib_photographs",
        "/news/pib-photographs/dataservices/getPIBSearchNews",
        {"pageNumber": 1, "pageSize": 15, "termMatches": []}
    )

    results["dd_news"] = gov_news_service.fetch_and_save(
        "dd_news",
        "/news/dd-news/dataservices/getddnews",
        {"mustFilter": [], "pageNumber": 1, "pageSize": 15}
    )

    results["dd_news_facet"] = gov_news_service.fetch_and_save(
        "dd_news_facet",
        "/news/dd-news/dataservices/getddnewsfacet",
        {}
    )

    return {
        "status": "success",
        "message": "All government news APIs fetched successfully",
        "results": results
    }