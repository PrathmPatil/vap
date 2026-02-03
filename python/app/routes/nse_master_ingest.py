from fastapi import APIRouter, HTTPException
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.nse_fetch_service import NseFetchService
from app.services.nse_indices_service import nse_indices
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

# ----------------------------------
# HEALTH
# ----------------------------------
@router.get("/health")
async def health():
    return {"status": "nse_service_healthy"}

# ----------------------------------
# INGEST ALL (MANUAL)
# ----------------------------------
@router.get("/all")
async def ingest_all():
    try:
        nse_fetch = NseFetchService()

        all_indices = nse_fetch.fetch_all_indices()
        live_quotes = nse_fetch.fetch_live_quotes(limit=25)

        saved_indices = nse_indices.save("all_indices", all_indices)
        saved_quotes = nse_indices.save("live_quotes", live_quotes)

        return {
            "message": "NSE ingestion completed",
            "summary": {
                "indices_fetched": len(all_indices),
                "quotes_fetched": len(live_quotes),
            }
        }

    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))

# ----------------------------------
# GET INDICES (LIVE)
# ----------------------------------
@router.get("/indices")
async def get_indices():
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.fetch_all_indices()
    except Exception as e:
        raise HTTPException(500, str(e))

# ----------------------------------
# GET QUOTES (LIVE)
# ----------------------------------
@router.get("/quotes")
async def get_live_quotes(limit: int = 25):
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.fetch_live_quotes(limit)
    except Exception as e:
        raise HTTPException(500, str(e))
