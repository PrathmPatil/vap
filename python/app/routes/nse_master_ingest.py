from fastapi import APIRouter, HTTPException
from app.services.nse_fetch_service import NseFetchService
from app.services.nse_dynamic_service import nse_dynamic

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "nse_service_healthy"}


@router.get("/all")
async def ingest_all():
    try:
        nse_fetch = NseFetchService()  # 👈 NEW SESSION

        results = {}

        all_indices = nse_fetch.fetch_all_indices()
        results["all_indices"] = nse_dynamic.save("all_indices", all_indices)

        live_quotes = nse_fetch.fetch_live_quotes(limit=25)
        results["live_quotes"] = nse_dynamic.save("live_quotes", live_quotes)

        return {
            "message": "NSE ingestion completed",
            "summary": {
                "indices": len(all_indices),
                "quotes": len(live_quotes)
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"{type(e).__name__}: {e}"
        )


@router.get("/indices")
async def get_indices():
    try:
        nse_fetch = NseFetchService()
        return nse_fetch.fetch_all_indices()
    except Exception as e:
        raise HTTPException(500, str(e))