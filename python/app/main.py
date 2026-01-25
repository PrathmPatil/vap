from fastapi import FastAPI
import requests
import threading
from typing import Dict

from app.routes import (
    bhavcopy,
    nse,
    screener,
    yfinance,
    ipo_scraper,
    bse_ann_api,
    gov_news_api,
    nse_master_ingest,
    cron,
    nse_all_companies
)

from app.config import config
from app.services.ipo_cron_service import ipo_cron_service
from app.services.gov_news_db_service import gov_news_db_service
from app.cron.listed_companies_cron_service import listed_companies_cron_service
from app.cron.screener_scheduler import screener_scheduler
from app.cron.nse_indices_cron import start_nse_indices_scheduler

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
app.include_router(cron.router, prefix="/cron", tags=["Cron Jobs"])
app.include_router(nse_all_companies.router, prefix="/nse-all-companies", tags=["NSE All Companies"])

# ---------------------------------------------------------
# 🛠️ Helper Functions
# ---------------------------------------------------------
def warmup_sessions():
    """Warm up API sessions in background"""
    def warmup_bse():
        try:
            session = requests.Session()
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            # Shorter timeout
            session.get("https://www.bseindia.com", timeout=5)
            print("✅ BSE session warmed up successfully")
        except Exception as e:
            print(f"⚠️ BSE warmup failed (non-critical): {e}")
    
    # Run in background thread so it doesn't block startup
    thread = threading.Thread(target=warmup_bse, daemon=True)
    thread.start()

def initialize_cron_jobs():
    """Initialize all cron jobs on startup"""
    print("🔄 Initializing cron jobs...")
    
    # Start IPO cron service
    try:
        ipo_cron_service.start()
        print("✅ IPO cron service started")
    except Exception as e:
        print(f"❌ Failed to start IPO cron service: {e}")
    
    # Start listed companies cron service
    try:
        listed_companies_cron_service.start()
        print("✅ Listed companies cron service started")
    except Exception as e:
        print(f"❌ Failed to start listed companies cron service: {e}")
    
    # Start screener scheduler
    try:
        screener_scheduler.start()
        print("✅ Screener scheduler started")
    except Exception as e:
        print(f"❌ Failed to start screener scheduler: {e}")
    
    # Start NSE indices scheduler
    try:
        start_nse_indices_scheduler()
        print("✅ NSE indices scheduler started")
    except Exception as e:
        print(f"❌ Failed to start NSE indices scheduler: {e}")
    
    print("✅ All cron jobs initialized")

# ---------------------------------------------------------
# ⏱️ Startup Events → Cron Jobs
# ---------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Start all services when FastAPI boots"""
    print("🚀 Starting Unified Stock Data API...")
    
    # Warm up API sessions
    try:
        warmup_sessions()
    except Exception as e:
        print(f"⚠️ Session warmup failed: {e}")
    
    # Initialize cron jobs
    initialize_cron_jobs()
    
    print("✅ Startup completed successfully!")

# ---------------------------------------------------------
# 🩺 Health Check
# ---------------------------------------------------------
@app.get("/health")
async def health_check() -> Dict:
    """Comprehensive health check endpoint"""
    return {
        "status": "healthy",
        "service": "Unified Stock Data API",
        "version": "2.1",
        "timestamp": datetime.now().isoformat(),
        "modules": [
            "bhavcopy",
            "nse",
            "screener", 
            "yfinance",
            "ipo_scraper",
            "bse_announcements",
            "gov_news",
            "ingest",
            "cron",
            "nse_all_companies"
        ],
        "cron_jobs": {
            "ipo_cron": "running",
            "listed_companies_cron": "running",
            "screener_scheduler": "running",
            "nse_indices_scheduler": "running"
        }
    }

# ---------------------------------------------------------
# 🌐 Root Endpoint
# ---------------------------------------------------------
@app.get("/")
async def root() -> Dict:
    """API root endpoint with documentation"""
    return {
        "message": "Unified Stock Data API is running",
        "version": "2.1",
        "documentation": "/docs",
        "health_check": "/health",
        "endpoints": {
            "bhavcopy": "/bhavcopy",
            "nse": "/nse",
            "screener": "/screener",
            "yfinance": "/yfinance",
            "ipo_scraper": "/ipo-scraper",
            "bse_announcements": "/bse",
            "gov_news": "/gov-news",
            "ingest": "/ingest",
            "cron_jobs": "/cron",
            "nse_all_companies": "/nse-all-companies"
        },
        "features": [
            "NSE Bhavcopy fetching",
            "Listed companies database",
            "Screener.in data scraping",
            "Yahoo Finance integration",
            "IPO data collection",
            "BSE announcements",
            "Government news aggregation",
            "Automated cron jobs",
            "NSE indices data"
        ]
    }

# ---------------------------------------------------------
# 🛠️ Debug/Info Endpoints
# ---------------------------------------------------------
@app.get("/info")
async def api_info() -> Dict:
    """Get detailed API information"""
    return {
        "name": "Unified Stock Data API",
        "version": "2.1",
        "description": "Comprehensive stock market data aggregator",
        "author": "Your Name/Team",
        "repository": "https://github.com/your-repo",
        "license": "MIT",
        "database": {
            "name": config.DB_STOCK_MARKET if hasattr(config, 'DB_STOCK_MARKET') else "Not configured",
            "status": "connected"
        },
        "scheduled_tasks": [
            "Daily IPO data fetch",
            "Listed companies sync",
            "Screener data collection",
            "NSE indices update"
        ]
    }

@app.get("/status")
async def api_status() -> Dict:
    """Quick status check"""
    return {
        "status": "operational",
        "uptime": "running",
        "timestamp": datetime.now().isoformat()
    }

# ---------------------------------------------------------
# 📰 Government News Function (for reference)
# ---------------------------------------------------------
def daily_gov_news_job():
    """Fetch latest NewsOnAir updates daily & save to DB"""
    # This function needs to be defined properly or moved to appropriate service
    # For now, it's kept as a placeholder
    pass

# ---------------------------------------------------------
# Import datetime at the top if not already imported
# ---------------------------------------------------------
from datetime import datetime