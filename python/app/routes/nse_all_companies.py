from fastapi import APIRouter, Query
from datetime import datetime

from app.services.nse_service import nse_service

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


@router.get("/fetch/{symbol}")
def fetch_single(
    symbol: str,
    period: str = Query("1mo"),
    save_to_db: bool = Query(False)
):
    return nse_service.fetch_single_symbol(symbol, period, save_to_db)


@router.post("/fetch-all-listed")
def fetch_all_listed(
    period: str = Query("1mo"),
    limit: int | None = None
):
    return nse_service.fetch_all_listed(period, limit)
