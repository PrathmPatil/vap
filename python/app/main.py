# main.py - FIXED IMPORT (remove 'python.' prefix)
from fastapi import FastAPI
from datetime import datetime, timezone, timedelta
from typing import Dict
import requests
import threading
import logging

from app.routes import (
    bhavcopy,
    nse,
    screener,
    yfinance,
    ipo_scraper,
    indian_market_routes,
    bse_ann_api,
    gov_news_api,
    nse_master_ingest,
    cron,
    nse_all_companies,
    company_profile)

from app.config import config
from app.services.ipo_cron_service import ipo_cron_service
from app.cron.listed_companies_cron_service import listed_companies_cron_service
from app.cron.screener_scheduler import screener_scheduler
from app.cron.nse_indices_cron import start_nse_indices_scheduler, scheduler as nse_indices_scheduler
from app.cron.yfinance_cron import start_yfinance_cron
from app.cron.gov_news_cron import start_gov_news_cron, scheduler as gov_news_scheduler
from app.cron.company_profile_cron import start_company_profile_cron, scheduler as company_profile_scheduler
from app.cron.bhavcopy_cron import fetch_today_bhavcopy_cron, scheduler as bhavcopy_scheduler
from app.cron.bse_announcements_news import start_bse_announcements_scheduler, scheduler as bse_announcements_scheduler
from app.cron.indian_market_cron import start_indian_market_cron, scheduler as indian_market_scheduler


from app.database.startup import ensure_databases

from app.services.yfinance_service import get_yfinance_service


import os

LOG_DIR = "logs"

os.makedirs(LOG_DIR, exist_ok=True)

# ---------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("UnifiedStockAPI")

# ---------------------------------------------------------
# Initialize FastAPI App
# ---------------------------------------------------------
app = FastAPI(
    title="Unified Stock Data API",
    description="Combined API for NSE Bhavcopy, Listed Companies, Screener Data, YFinance Data, Government News & IPO Data",
    version="2.1",
    root_path="/ml",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Include routers AFTER creating app
app.include_router(bhavcopy.router, prefix="/bhavcopy", tags=["Bhavcopy"])
app.include_router(nse.router, prefix="/nse", tags=["NSE Data"])
app.include_router(screener.router, prefix="/screener", tags=["Screener Data"])
app.include_router(yfinance.router, prefix="/yfinance", tags=["YFinance Data"])
app.include_router(ipo_scraper.router, prefix="/ipo-scraper", tags=["IPO Scraper"])
app.include_router(indian_market_routes.router, tags=["Indian Market"])
app.include_router(bse_ann_api.router, prefix="/bse", tags=["BSE Announcements"])
app.include_router(gov_news_api.router, prefix="/gov-news", tags=["Government News"])
app.include_router(nse_master_ingest.router, prefix="/ingest", tags=["NSE Master Ingest"])
app.include_router(cron.router, prefix="/cron", tags=["Cron Jobs"])
app.include_router(nse_all_companies.router, prefix="/nse-all-companies", tags=["NSE All Companies"])
app.include_router(company_profile.router, prefix="/company-profile", tags=["Company Profile"])


# ---------------------------------------------------------
# IST timezone
# ---------------------------------------------------------
IST = timezone(timedelta(hours=5, minutes=30))

# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
def warmup_bse_session():
    """Warm up BSE API session in a background thread"""
    def task():
        try:
            session = requests.Session()
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            session.get("https://www.bseindia.com", timeout=5)
            logger.info("✅ BSE session warmed up successfully")
        except Exception as e:
            logger.warning(f"BSE warmup failed (non-critical): {e}")

    thread = threading.Thread(target=task, daemon=True)
    thread.start()

# ---------------------------------------------------------
# Cron Job Initialization
# ---------------------------------------------------------
CRONS_STARTED = False

def bootstrap_market_holidays():
    """Populate holiday table on startup if needed."""
    try:
        from app.services.indian_market_service import indian_market_service

        existing = indian_market_service.get_holidays_from_db(segment="CM")
        if existing:
            logger.info("ℹ️ Market holidays already present (%s CM rows)", len(existing))
            return

        logger.info("📅 Bootstrapping market holidays from NSE...")
        for segment in ["CM", "FO", "CD", "COM", "CBM", "IRD", "MF", "SLBS"]:
            indian_market_service.fetch_and_save_holidays(segment)
        logger.info("✅ Market holidays bootstrap complete")
    except Exception as error:
        logger.error("❌ Market holidays bootstrap failed: %s", error)


def initialize_cron_jobs():
    """Start all cron jobs once"""
    global CRONS_STARTED
    if CRONS_STARTED:
        logger.warning("Crons already initialized, skipping")
        return
    CRONS_STARTED = True

    cron_services = [
        ("IPO cron service", ipo_cron_service.start),
        ("Listed companies cron", listed_companies_cron_service.start),
        # ("Screener scheduler", screener_scheduler.start),
        ("NSE indices scheduler", start_nse_indices_scheduler),
        # ("YFinance cron", start_yfinance_cron),
        ("Government News cron", start_gov_news_cron),
        ("Today's Bhavcopy cron", fetch_today_bhavcopy_cron),
        ("BSE Announcements cron", start_bse_announcements_scheduler),
        ("Indian Market Holidays cron", start_indian_market_cron),
    ]

    if config.ENABLE_COMPANY_PROFILE_CRON:
        cron_services.insert(
            6,
            ("NSE All Companies cron", start_company_profile_cron),
        )
    else:
        logger.info(
            "⏭ Company profile cron disabled (set ENABLE_COMPANY_PROFILE_CRON=true to enable)"
        )
    

    for name, func in cron_services:
        try:
            func()
            logger.info(f"✅ {name} started successfully")
        except Exception as e:
            logger.error(f"❌ Failed to start {name}: {e}")

    bootstrap_market_holidays()

# ---------------------------------------------------------
# Startup Event
# ---------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Startup actions: warmup sessions & initialize crons"""
    logger.info("🚀 Starting Unified Stock Data API...")
    
    # Initialize databases
    ensure_databases()
    
    # ✅ SAFE init
    get_yfinance_service().__init__()
    
    # Warmup sessions
    warmup_bse_session()

    # Run crons in background so HTTP server becomes available immediately
    cron_thread = threading.Thread(target=initialize_cron_jobs, daemon=True)
    cron_thread.start()

    logger.info("✅ Startup completed successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event: stop cron schedulers cleanly."""
    logger.info("🛑 Shutting down cron schedulers...")
    for name, sched in [
        ("company_profile", company_profile_scheduler),
        ("gov_news", gov_news_scheduler),
        ("nse_indices", nse_indices_scheduler),
        ("bhavcopy", bhavcopy_scheduler),
        ("bse_announcements", bse_announcements_scheduler),
        ("indian_market", indian_market_scheduler),
    ]:
        try:
            if sched.running:
                sched.shutdown(wait=False)
                logger.info(f"✅ {name} scheduler shutdown requested")
        except Exception as err:
            logger.warning(f"⚠ Failed to shutdown {name} scheduler cleanly: {err}")

# ---------------------------------------------------------
# Pydantic Models for Swagger
# ---------------------------------------------------------
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str
    cron_jobs: Dict[str, str]

class InfoResponse(BaseModel):
    name: str
    version: str
    description: str
    author: str
    repository: str
    license: str
    databases: Dict[str, str]

class StatusResponse(BaseModel):
    status: str
    uptime: str
    timestamp: str

class RootResponse(BaseModel):
    message: str
    version: str
    documentation: str
    health_check: str
    features: list

# ---------------------------------------------------------
# Health & Info Endpoints
# ---------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Comprehensive health check"""
    return {
        "status": "healthy",
        "service": "Unified Stock Data API",
        "version": app.version,
        "timestamp": datetime.now().isoformat(),
        "cron_jobs": {
            "ipo_cron": "running",
            "listed_companies_cron": "running",
            "nse_indices_scheduler": "running",
            "gov_news_cron": "running",
            "company_profile_cron": (
                "running" if config.ENABLE_COMPANY_PROFILE_CRON else "disabled"
            ),
            "bhavcopy_cron": "running",
            "bse_announcements_cron": "running",
            "indian_market_cron": "running",
        }
    }

@app.get("/info", response_model=InfoResponse, tags=["Info"])
async def api_info():
    """Detailed API information"""
    return {
        "name": "Unified Stock Data API",
        "version": app.version,
        "description": "Comprehensive stock market data aggregator",
        "author": "Your Name/Team",
        "repository": "https://github.com/your-repo",
        "license": "MIT",
        "databases": {
            "stock_market_fastapi": config.DB_STOCK_MARKET,
            "bhavcopy_fastapi": config.DB_BHAVCOPY,
            "note": "All other FastAPI data categories are stored in stock_market_fastapi."
        }
    }

@app.get("/status", response_model=StatusResponse, tags=["Info"])
async def api_status():
    """Quick operational status"""
    return {
        "status": "operational",
        "uptime": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/", response_model=RootResponse, tags=["Root"])
async def root():
    """Root endpoint with basic info and documentation"""
    return {
        "message": "Unified Stock Data API is running",
        "version": app.version,
        "documentation": "/docs",
        "health_check": "/health",
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