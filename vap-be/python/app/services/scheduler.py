from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import config
from app.services.bhavcopy_service import bhavcopy_service
from app.services.nse_service import nse_service
from app.services.screener_service import screener_service
from app.routes.ipo_scraper import fetch_mainboard_ipos, fetch_sme_ipos, save_ipos_to_db
import logging

# ----------------------------------------------------------
# 🧠 Logging Setup
# ----------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------------------------------------
# 🕓 Initialize Scheduler
# ----------------------------------------------------------
scheduler = BackgroundScheduler(timezone=config.SCHEDULER_TIMEZONE)

# ----------------------------------------------------------
# 🧾 Task 1 - Bhavcopy Fetch
# ----------------------------------------------------------
def fetch_daily_bhavcopy():
    try:
        logger.info("📦 Starting daily Bhavcopy fetch...")
        result = bhavcopy_service.fetch_today_bhavcopy()
        logger.info(f"✅ Bhavcopy fetch completed: {result.get('status', 'unknown')}")
    except Exception as e:
        logger.error(f"❌ Bhavcopy fetch failed: {str(e)}")

# ----------------------------------------------------------
# 🧾 Task 2 - Historical Data
# ----------------------------------------------------------
def fetch_daily_historical_data():
    try:
        logger.info("📊 Starting daily Historical Data fetch...")
        result = nse_service.fetch_historical_data("1d")
        logger.info(f"✅ Historical Data fetch completed: {result.get('status', 'unknown')}")
    except Exception as e:
        logger.error(f"❌ Historical data fetch failed: {str(e)}")

# ----------------------------------------------------------
# 🧾 Task 3 - Listed Companies Update
# ----------------------------------------------------------
def update_listed_companies():
    try:
        logger.info("🏢 Updating listed companies...")
        result = nse_service.update_listed_companies()
        logger.info(f"✅ Listed companies update completed: {result}")
    except Exception as e:
        logger.error(f"❌ Listed companies update failed: {str(e)}")

# ----------------------------------------------------------
# 🧾 Task 4 - IPO Update (Mainboard + SME)
# ----------------------------------------------------------
def update_ipos():
    """Daily task to update both Mainboard and SME IPOs"""
    try:
        logger.info("💹 Fetching IPO data (Mainboard + SME)...")

        mainboard_data = fetch_mainboard_ipos()
        save_ipos_to_db(mainboard_data, "mainboard")
        logger.info("✅ Mainboard IPOs updated successfully")

        sme_data = fetch_sme_ipos()
        save_ipos_to_db(sme_data, "sme")
        logger.info("✅ SME IPOs updated successfully")

        logger.info("📈 IPO Scheduler completed all updates")
    except Exception as e:
        logger.error(f"❌ IPO update failed: {str(e)}")

# ----------------------------------------------------------
# 🧭 Start and Stop Scheduler
# ----------------------------------------------------------
def start_scheduler():
    """Start the unified daily scheduler"""
    if not scheduler.running:
        logger.info("🚀 Starting unified scheduler with all daily tasks...")

        # Bhavcopy - 6:00 PM IST
        scheduler.add_job(
            fetch_daily_bhavcopy,
            trigger=CronTrigger(hour=18, minute=0),
            id="daily_bhavcopy"
        )

        # Historical Data - 6:30 PM IST
        scheduler.add_job(
            fetch_daily_historical_data,
            trigger=CronTrigger(hour=18, minute=30),
            id="daily_historical_data"
        )

        # Listed Companies - 7:00 PM IST
        scheduler.add_job(
            update_listed_companies,
            trigger=CronTrigger(hour=19, minute=0),
            id="daily_listed_companies"
        )

        # IPO Update (Mainboard + SME) - 9:00 AM IST
        scheduler.add_job(
            update_ipos,
            trigger=CronTrigger(hour=9, minute=0),
            id="daily_ipo_update"
        )

        scheduler.start()
        logger.info("✅ Unified scheduler started successfully")

def stop_scheduler():
    """Stop the unified scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Scheduler stopped")
