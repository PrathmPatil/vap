from fastapi import APIRouter, HTTPException, Query
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.nse_fetch_service import NseFetchService
from app.services.nse_indices_service import nse_indices
from app.services.nse_filing_ingest_service import ingest_financial_filings
import logging
import threading
from typing import Optional

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
@router.get("/nse-routes")
async def get_nse_routes():
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.get_nse_page_catalog()
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/company-dossier/{symbol}")
async def get_company_dossier(symbol: str):
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.fetch_company_dossier(symbol)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


@router.get("/symbol-intelligence/{symbol}")
async def get_symbol_intelligence(symbol: str):
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.fetch_symbol_intelligence(symbol)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


def _spawn_filings_job(job_label: str, **kwargs):
    def _runner():
        try:
            ingest_financial_filings(**kwargs)
        except Exception:
            logger.exception("Background %s failed", job_label)

    thread = threading.Thread(target=_runner, name=job_label, daemon=True)
    thread.start()
    return thread.name


@router.post("/financial-filings")
async def ingest_all_financial_filings(
    symbol: Optional[str] = Query(None, description="One NSE symbol; omit for all listed companies"),
    period: str = Query("Quarterly", description="Quarterly (page CSV ~3816 rows), Annual, or both"),
    limit: int = Query(0, description="Max companies (0 = all in CSV)"),
    max_files: int = Query(3, description="Max attachment files per symbol"),
    include_announcements: bool = Query(False),
    include_dossier: bool = Query(True, description="Also fetch quote/filings/events for each CSV company"),
    from_date: Optional[str] = Query(None, description="Blank = current page CSV (~3816 rows). DD-MM-YYYY for a custom range."),
    to_date: Optional[str] = Query(None, description="DD-MM-YYYY; used only with from_date"),
    background: bool = Query(True),
):
    period_key = (period or "Quarterly").strip().lower()
    periods = ["Quarterly", "Annual"] if period_key in ("both", "all") else [period or "Quarterly"]
    kwargs = {
        "symbol": symbol,
        "limit": limit,
        "periods": periods,
        "max_files": max_files,
        "include_announcements": include_announcements,
        "include_dossier": include_dossier,
        "from_date": from_date,
        "to_date": to_date,
    }
    if background:
        name = _spawn_filings_job("nse_financial_filings", **kwargs)
        return {
            "success": True,
            "status": "STARTED",
            "message": "Financial-result ZIP/XBRL ingest started. Track Cron Logs job nse_financial_filings.",
            "thread": name,
            **kwargs,
        }
    try:
        return ingest_financial_filings(**kwargs)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(500, str(e))


@router.post("/financial-filings/{symbol}")
async def ingest_symbol_financial_filings(
    symbol: str,
    period: str = Query("both"),
    max_files: int = Query(20),
    include_announcements: bool = Query(False),
    background: bool = Query(True),
):
    return await ingest_all_financial_filings(
        symbol=symbol,
        period=period,
        limit=0,
        max_files=max_files,
        include_announcements=include_announcements,
        background=background,
    )
