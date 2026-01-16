from fastapi import APIRouter, Query
from datetime import datetime
from app.services.ipo_scraper_service import ipo_scraper_service
from app.services.ipo_cron_service import ipo_cron_service
from app.config import config
from app.database.connection import db_manager

router = APIRouter()


# ------------------------------------------------------------
# ✅ Base Test Route
# ------------------------------------------------------------
@router.get("/")
def home():
    return {
        "message": "IPO Scraper API is running ✅",
        "endpoints": {
            "fetch_mainboard": "/ipo-scraper/fetch/mainboard",
            "fetch_sme": "/ipo-scraper/fetch/sme",
            "fetch_today": "/ipo-scraper/fetch/today",
            "fetch_dynamic": "/ipo-scraper/fetch/dynamic",
            "cron_test": "/ipo-scraper/test/cron",
            "db_summary": "/ipo-scraper/db/summary",
            "health": "/ipo-scraper/health"
        },
        "version": "1.0.0",
        "author": "Prathmesh"
    }


# ------------------------------------------------------------
# ✅ Fetch data by type (mainboard or sme)
# ------------------------------------------------------------
@router.get("/fetch/{report_type}")
def fetch_ipo_data(report_type: str):
    """
    Fetch IPO data by type (mainboard or sme)
    Example: /ipo-scraper/fetch/mainboard
    """
    return ipo_scraper_service.process_report(report_type)


# ------------------------------------------------------------
# ✅ Fetch both types (today’s data)
# ------------------------------------------------------------
@router.get("/fetch/today")
def fetch_today_data():
    """
    Fetch today's IPO data for both Mainboard and SME
    """
    results = []
    for report_type in ["mainboard", "sme"]:
        try:
            results.append(ipo_scraper_service.process_report(report_type))
        except Exception as e:
            results.append({"type": report_type, "error": str(e)})
    return {
        "status": "success",
        "message": "Fetched today's data for Mainboard & SME",
        "results": results,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


# ------------------------------------------------------------
# ✅ Dynamic Fetch (Custom Date)
# ------------------------------------------------------------
@router.get("/fetch/dynamic")
def fetch_dynamic_data(
    report_type: str = Query("mainboard", description="Report type: mainboard or sme"),
    month: int = Query(None, description="Custom month"),
    year: int = Query(None, description="Custom year"),
    fy: str = Query(None, description="Custom financial year (e.g. 2025-26)"),
    version: str = Query("15-25", description="Chittorgarh API version"),
):
    """
    Fetch IPO data dynamically for a given month/year/FY.
    Example: /ipo-scraper/fetch/dynamic?report_type=sme&month=11&year=2025&fy=2025-26
    """
    result = ipo_scraper_service.process_report(report_type, month, year, fy, version)
    return {
        "status": "ok",
        "message": f"Fetched data for {report_type}",
        "result": result,
    }


# ------------------------------------------------------------
# ✅ Trigger cron job manually (for testing)
# ------------------------------------------------------------
@router.get("/test/cron")
def test_cron_run():
    """
    Manually trigger daily IPO cron job (for testing only)
    """
    ipo_cron_service.daily_ipo_job()
    return {
        "status": "ok",
        "message": "Cron job executed manually",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ------------------------------------------------------------
# ✅ Database Summary - record count, last update
# ------------------------------------------------------------
@router.get("/db/summary")
def db_summary():
    """
    View summary of IPO data stored in MySQL
    """
    db_name = config.DB_IPO
    conn = db_manager.get_connection(db_name)
    summary = {}

    try:
        with conn.cursor() as cursor:
            for table in ["mainboard_data", "sme_data"]:
                cursor.execute(f"SELECT COUNT(*) AS count FROM `{table}`")
                count = cursor.fetchone()["count"]
                cursor.execute(
                    f"SELECT MIN(created_at) AS first, MAX(created_at) AS last FROM `{table}`"
                )
                date_info = cursor.fetchone()
                summary[table] = {
                    "records": count,
                    "first_entry": date_info["first"],
                    "last_entry": date_info["last"],
                }
    except Exception as e:
        summary["error"] = str(e)
    finally:
        conn.close()

    return {
        "status": "ok",
        "database": db_name,
        "summary": summary,
        "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ------------------------------------------------------------
# ✅ Health Check
# ------------------------------------------------------------
@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ipo_scraper",
        "version": "1.0.0",
        "uptime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }



# GET /ipo-scraper/fetch/today
# GET /ipo-scraper/fetch/dynamic?report_type=mainboard&month=10&year=2025&fy=2025-26
# GET /ipo-scraper/test/cron
# GET /ipo-scraper/db/summary
# GET /ipo-scraper/health