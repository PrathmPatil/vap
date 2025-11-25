# app/services/gov_fetcher.py
import requests
from typing import Any, Dict

BASE_URL = "https://india.gov.in"
HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Origin": "https://india.gov.in",
    "Referer": "https://india.gov.in",
}

def post_api(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{BASE_URL}{endpoint}"
    try:
        res = requests.post(url, json=payload, headers=HEADERS, timeout=15)
        res.raise_for_status()
        return {"success": True, "data": res.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_news_on_air(pageNumber: int = 1, pageSize: int = 15) -> Dict:
    return post_api("/news/news-on-air/dataservices/getnewsonair", {
        "mustFilter": [],
        "pageNumber": pageNumber,
        "pageSize": pageSize
    })

def get_pib_ministry(pageNumber: int = 1, pageSize: int = 100) -> Dict:
    return post_api("/news/pib-news/dataservices/getpibministry", {
        "pageNumber": pageNumber,
        "pageSize": pageSize
    })

def get_pib_news(pageNumber: int = 1, pageSize: int = 15) -> Dict:
    return post_api("/news/pib-news/dataservices/getpibnews", {
        "npiFilters": [],
        "pageNumber": pageNumber,
        "pageSize": pageSize
    })

def get_dd_news(pageNumber: int = 1, pageSize: int = 15) -> Dict:
    return post_api("/news/dd-news/dataservices/getddnews", {
        "mustFilter": [],
        "pageNumber": pageNumber,
        "pageSize": pageSize
    })
