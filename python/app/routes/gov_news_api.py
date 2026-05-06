from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List

from app.config import config
from app.database.connection import db_manager
from app.services.gov_news_service import gov_news_service

router = APIRouter()


NEWS_TABLES = ["news_on_air", "pib_news", "pib_ministry", "dd_news"]


def _fetch_table_rows(table_name: str, sort_order: str):
    """Read saved rows for a single government news table."""

    order_clause = "DESC" if str(sort_order).upper() != "ASC" else "ASC"

    conn = db_manager.get_connection(config.DB_NEWS, dict_cursor=True)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES LIKE %s", (table_name,))
            if not cursor.fetchone():
                return 0, []

            cursor.execute(
                f"SELECT COUNT(*) AS total FROM `{table_name}`"
            )
            total_row = cursor.fetchone() or {}
            total = int(total_row.get("total", 0))

            cursor.execute(
                f"SELECT * FROM `{table_name}` ORDER BY created_at {order_clause}, id {order_clause}"
            )
            rows = cursor.fetchall() or []

        return total, rows
    finally:
        conn.close()


def _read_all_government_news(page: int, limit: int, sort_order: str):
    data: Dict[str, List[dict]] = {}
    total_records: Dict[str, int] = {}

    for table_name in NEWS_TABLES:
        total, rows = _fetch_table_rows(table_name, sort_order)
        total_records[table_name] = total
        data[table_name] = rows

    return {
        "status": "success",
        "message": "Government news fetched successfully from database",
        "total_records": total_records,
        "data": data,
        "page": page,
        "limit": limit,
    }

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


@router.get("/all")
def get_all_gov_news(
    search: str = Query("", description="Search term for future filtering"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    sortField: str = Query("created_at", description="Sort field (reserved for compatibility)"),
    sortOrder: str = Query("DESC", description="Sort order: ASC or DESC"),
):
    """Return all saved government news rows for the frontend."""

    try:
        # The frontend currently requests DT_TM, but the stored gov-news tables
        # are normalized and do not share the same columns. Return DB rows in a
        # consistent format and keep the API compatible with the existing client.
        return _read_all_government_news(page=page, limit=limit, sort_order=sortOrder)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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