import os
import requests
from dotenv import load_dotenv

load_dotenv()

FINNHUB_BASE_URL = os.getenv("FINNHUB_BASE_URL", "https://finnhub.io/api/v1")
API_KEY = os.getenv("FINNHUB_API_KEY")


def fetch_data(endpoint: str, params: dict):
    params["token"] = API_KEY
    url = f"{FINNHUB_BASE_URL}/{endpoint}"

    response = requests.get(url, params=params)

    if response.status_code != 200:
        raise Exception(f"Finnhub API Error: {response.text}")

    return response.json()


def get_stock_free_data(symbol: str):
    result = {}

    result["quote"] = fetch_data("quote", {"symbol": symbol})
    result["companyProfile"] = fetch_data("stock/profile2", {"symbol": symbol})
    result["companyPeers"] = fetch_data("stock/peers", {"symbol": symbol})
    result["recommendationTrends"] = fetch_data("stock/recommendation", {"symbol": symbol})
    result["priceTarget"] = fetch_data("stock/price-target", {"symbol": symbol})
    result["newsSentiment"] = fetch_data("news-sentiment", {"symbol": symbol})
    result["basicFinancials"] = fetch_data("stock/metric", {"symbol": symbol, "metric": "all"})

    return result


def get_market_free_data():
    result = {}

    result["marketStatus"] = fetch_data("stock/market-status", {"exchange": "US"})
    result["marketHoliday"] = fetch_data("stock/market-holiday", {"exchange": "US"})
    result["ipoCalendar"] = fetch_data("calendar/ipo", {})
    result["earningsCalendar"] = fetch_data("calendar/earnings", {})

    return result