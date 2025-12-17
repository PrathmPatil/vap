from fastapi import FastAPI
import requests
import time

from app.routes import (
    bhavcopy,
    nse,
    screener,
    yfinance,
    ipo_scraper,
    bse_ann_api,
    gov_news_api, nse_master_ingest
)

from app.config import config
from app.services.ipo_cron_service import ipo_cron_service
from app.services.gov_news_db_service import gov_news_db_service

# ---------------------------------------------------------
# 🚀 Initialize FastAPI
# ---------------------------------------------------------
app = FastAPI(
    title="Unified Stock Data API",
    description=(
        "Combined API for NSE Bhavcopy, Listed Companies, "
        "Screener Data, YFinance Data, Government News & IPO Data"
    ),
    version="2.1"
)

# ---------------------------------------------------------
# 📌 Include Routers
# ---------------------------------------------------------
app.include_router(bhavcopy.router, prefix="/bhavcopy", tags=["Bhavcopy"])
app.include_router(nse.router, prefix="/nse", tags=["NSE Data"])
app.include_router(screener.router, prefix="/screener", tags=["Screener Data"])
app.include_router(yfinance.router, prefix="/yfinance", tags=["YFinance Data"])
app.include_router(ipo_scraper.router, prefix="/ipo-scraper", tags=["IPO Scraper"])
app.include_router(bse_ann_api.router, prefix="/bse", tags=["BSE Announcements"])
app.include_router(gov_news_api.router, prefix="/gov-news", tags=["Government News"])
app.include_router(nse_master_ingest.router, prefix="/ingest", tags=["NSE Master Ingest"])
# ---------------------------------------------------------
# 🌐 Root Endpoint
# ---------------------------------------------------------
@app.get("/")
async def root():
    return {
        "message": "Unified Stock Data API is running",
        "version": "2.1",
        "endpoints": {
            "bhavcopy": "/bhavcopy",
            "nse": "/nse",
            "screener": "/screener",
            "yfinance": "/yfinance",
            "ipo_scraper": "/ipo-scraper",
            "bse_announcements": "/bse",
            "gov_news": "/gov-news",
            "ingest": "/ingest"
        },
        "docs": "/docs",
        "scheduler": "enabled"
    }


# ---------------------------------------------------------
# 🩺 Health Check
# ---------------------------------------------------------
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "stock_data_api",
        "version": "2.1",
        "modules": [
            "bhavcopy",
            "nse",
            "screener",
            "yfinance",
            "ipo_scraper",
            "bse_announcements",
            "gov_news",
            "ingest"
        ]
    }


# ---------------------------------------------------------
# ⏱️ Startup Events → Cron Jobs
# ---------------------------------------------------------
@app.on_event("startup")
def start_cron_jobs():
    """Start all scheduled services when FastAPI boots"""
    ipo_cron_service.start()


# ---------------------------------------------------------
# 📰 Daily Government News Job (Cron)
# ---------------------------------------------------------
def daily_gov_news_job():
    """Fetch latest NewsOnAir updates daily & save to DB"""
    response = get_news_on_air(pageNumber=1, pageSize=50)
    records = response.get("data", {}).get("records", [])

    if records:
        gov_news_db_service.save_gov_news(records, table_name="news_on_air")
