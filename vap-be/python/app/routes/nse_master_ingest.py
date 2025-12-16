from fastapi import APIRouter, HTTPException
from app.services.nse_dynamic_service import nse_dynamic
from app.services.nse_fetch_service import nse_fetch

router = APIRouter()


@router.get("/health")
async def health():
    """Check if Screener service is running"""
    return {"status": "ingest_service_healthy"}

@router.get("/all")
async def ingest_all():
    """Fetch NSE live data + save into MySQL dynamically."""
    try:
        results = {}

        # 1) All Indices
        all_indices = nse_fetch.fetch_all_indices()
        results["all_indices"] = nse_dynamic.save("all_indices", all_indices)

        # 2) Live Quotes
        live_quotes = nse_fetch.fetch_live_quotes()
        results["live_quotes"] = nse_dynamic.save("live_quotes", live_quotes)

        # 3) Option Chain
        option_chain = nse_fetch.fetch_option_chain()
        for sym, chain in option_chain.items():
            results[f"oc_{sym}"] = nse_dynamic.save(f"oc_{sym}", chain)

        return {
            "message": "Ingestion completed successfully",
            "details": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
