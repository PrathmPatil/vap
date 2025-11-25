from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

app = FastAPI(title="IPO Data API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize IPO fetcher
ipo_fetcher = AdvancedIPOFetcher(
    alpha_vantage_key="YOUR_ALPHA_VANTAGE_API_KEY",
    fmp_key="YOUR_FMP_API_KEY"
)

class IPOResponse(BaseModel):
    success: bool
    data: dict
    message: str = ""

@app.get("/")
async def root():
    return {"message": "IPO Data API", "status": "running"}

@app.get("/ipos/date-range", response_model=IPOResponse)
async def get_ipos_by_date_range(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format")
):
    """
    Get IPO data for specific date range
    """
    try:
        data = ipo_fetcher.get_ipo_data_by_date(start_date, end_date)
        return IPOResponse(success=True, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching IPO data: {str(e)}")

@app.get("/ipos/upcoming", response_model=IPOResponse)
async def get_upcoming_ipos(days: int = Query(30, description="Number of days to look ahead")):
    """
    Get upcoming IPOs
    """
    try:
        data = ipo_fetcher.get_upcoming_ipos(days)
        return IPOResponse(success=True, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching upcoming IPOs: {str(e)}")

@app.get("/ipos/historical", response_model=IPOResponse)
async def get_historical_ipos(days: int = Query(30, description="Number of days to look back")):
    """
    Get historical IPOs
    """
    try:
        data = ipo_fetcher.get_historical_ipos(days)
        return IPOResponse(success=True, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching historical IPOs: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)