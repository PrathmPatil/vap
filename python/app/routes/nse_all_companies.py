from fastapi import APIRouter, Query
from app.services.nse_service import nse_service
from datetime import datetime

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}

@router.post("/fetch-single/{symbol}")
def fetch_single(symbol: str, period: str = Query("1mo")):
    return nse_service.fetch_single_symbol(symbol, period, True)

@router.get("/test/{symbol}")
def test_symbol(symbol: str):
    return nse_service.fetch_single_symbol(symbol, "1mo", False)

@router.post("/fetch-all-listed")
def fetch_all(period: str = Query("1mo"), limit: int | None = None):
    return nse_service.fetch_all_listed(period, limit)
