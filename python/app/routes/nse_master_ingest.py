from fastapi import APIRouter, HTTPException, Query
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

# ----------------------------------
# PREDICTION / FORMULA SOURCE CATALOG
# ----------------------------------
@router.get("/prediction-sources")
async def get_prediction_sources():
    try:
        nse_fetch = NseFetchService()
        return {
            "message": "Curated NSE sources useful for prediction/formula work",
            "sources": nse_fetch.get_prediction_source_catalog(),
        }
    except Exception as e:
        raise HTTPException(500, str(e))

# ----------------------------------
# FETCH USEFUL NSE SNAPSHOT
# ----------------------------------
@router.get("/prediction-snapshot")
async def get_prediction_snapshot(save: bool = Query(False)):
    try:
        nse_fetch = NseFetchService()
        snapshot = nse_fetch.fetch_prediction_sources()

        saved = {}
        if save:
            for name, result in snapshot.items():
                records = result.get("records", [])
                table = result.get("table")
                if result.get("ok") and records and table:
                    saved[name] = nse_indices.save(table, records)

        return {
            "message": "NSE prediction snapshot fetched",
            "saved": saved,
            "summary": {
                name: {
                    "ok": result["ok"],
                    "record_count": result["record_count"],
                    "table": result["table"],
                    "error": result["error"],
                }
                for name, result in snapshot.items()
            },
            "data": snapshot,
        }
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))

# ----------------------------------
# SYMBOL LEVEL INTELLIGENCE
# ----------------------------------
@router.get("/symbol-intelligence/{symbol}")
async def get_symbol_intelligence(symbol: str):
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.fetch_symbol_intelligence(symbol)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))
