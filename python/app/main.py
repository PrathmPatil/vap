# main.py
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
    bse_ann_api,
    gov_news_api,
    nse_master_ingest,
    cron,
    nse_all_companies,
    company_profile
)

from app.config import config
from app.services.ipo_cron_service import ipo_cron_service
from app.cron.listed_companies_cron_service import listed_companies_cron_service
from app.cron.screener_scheduler import screener_scheduler
from app.cron.nse_indices_cron import start_nse_indices_scheduler
from app.cron.yfinance_cron import start_yfinance_cron
from app.cron.gov_news_cron import start_gov_news_cron
from app.cron.company_profile_cron import start_company_profile_cron
from app.cron.bhavcopy import fetch_today_bhavcopy_cron  

from app.database.init_databases import init_databases
  
# ---------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("UnifiedStockAPI")

# ---------------------------------------------------------
# Initialize FastAPI App
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
# Include Routers
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
        ("Screener scheduler", screener_scheduler.start),
        ("NSE indices scheduler", start_nse_indices_scheduler),
        ("YFinance cron", start_yfinance_cron),
        ("Government News cron", start_gov_news_cron),
        ("NSE All Companies cron", start_company_profile_cron),
        ("Today's Bhavcopy cron", fetch_today_bhavcopy_cron)
    ]

    for name, func in cron_services:
        try:
            func()
            logger.info(f"✅ {name} started successfully")
        except Exception as e:
            logger.error(f"❌ Failed to start {name}: {e}")

# ---------------------------------------------------------
# Startup Event
# ---------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Startup actions: warmup sessions & initialize crons"""
    logger.info("🚀 Starting Unified Stock Data API...")

    # Warmup sessions
    warmup_bse_session()
    
    # Initialize databases
    init_databases()

    # Initialize cron jobs
    initialize_cron_jobs()

    logger.info("✅ Startup completed successfully!")

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
            "screener_scheduler": "running",
            "nse_indices_scheduler": "running",
            "yfinance_cron": "running",
            "gov_news_cron": "running",
            "company_profile_cron": "running",
            "bhavcopy_cron": "running"
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
            "stock_market": config.DB_STOCK_MARKET,
            "bhavcopy": config.DB_BHAVCOPY,
            "screener": config.DB_SCREENER,
            "yfinance": config.DB_YFINANCE,
            "ipo": config.DB_IPO,
            "bse": config.DB_BSE,
            "gov_news": config.DB_NEWS,
            "bse_indices": config.DB_BSE_INDICES,
            "announcement_db": config.DB_ANNOUNCEMENT_DB_NAME,
            "screener_data_fastapi": config.DB_SCREENER,
        }
    }
    #   # Database Names
    # DB_BHAVCOPY = os.getenv("DB_BHAVCOPY", "bhavcopy_fastapi")
    # DB_STOCK_MARKET = os.getenv("DB_STOCK_MARKET", "stock_market_fastapi")
    # DB_SCREENER = os.getenv("DB_SCREENER", "screener_data_fastapi")
    # DB_YFINANCE = os.getenv("DB_YFINANCE", "yfinance_data_fastapi")
    # DB_IPO = os.getenv("DB_IPO", "ipo_data_fastapi")
    # DB_BSE = os.getenv("DB_BSE", "bse_data_fastapi")  
    # DB_NEWS = os.getenv("DB_NEWS", "gov_news_data_fastapi")
    # DB_BSE_INDICES = os.getenv("DB_BSE_INDICES", "bse_indices_fastapi")
    # DB_ANNOUNCEMENT_DB_NAME = os.getenv("DB_ANNOUNCEMENT_DB_NAME", "news_data_fastapi")

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
