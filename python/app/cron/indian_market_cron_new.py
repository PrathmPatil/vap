# app/cron/indian_market_cron.py
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import timezone, timedelta, datetime
from app.services.indian_market_service import indian_market_service

logger = logging.getLogger(__name__)

# IST timezone
IST = timezone(timedelta(hours=5, minutes=30))

scheduler = BackgroundScheduler(timezone=IST)


def fetch_indian_market_holidays_job():
    """Cron job to fetch Indian market holidays from NSE API"""
    try:
        logger.info("🔥 Indian Market Holidays CRON started")
        
        # Fetch CM segment holidays (Capital Market)
        holidays = indian_market_service.fetch_holidays("CM")
        
        if holidays:
            logger.info(f"✅ Fetched {len(holidays)} holidays from NSE API")
            
            # Log upcoming holidays
            upcoming = indian_market_service.get_upcoming_holidays(30)
            if upcoming:
                logger.info(f"📅 Upcoming holidays in next 30 days: {len(upcoming)}")
                for holiday in upcoming[:5]:  # Log first 5
                    logger.info(f"   - {holiday['date']}: {holiday['description']}")
        else:
            logger.warning("⚠ No holidays fetched from NSE API")
        
        logger.info("✅ Indian Market Holidays CRON completed")
        
    except Exception as e:
        logger.exception(f"❌ Indian Market Holidays CRON failed: {e}")


def check_market_status_job():
    """Cron job to check current market status"""
    try:
        now = datetime.now()
        
        # Only check during market hours (9 AM to 4 PM IST)
        if 9 <= now.hour <= 16:
            status = indian_market_service.get_market_status_for_date(now)
            
            if status.get("is_open"):
                logger.info(f"📈 Market is OPEN - {status['date']} ({status['day']})")
                
                # Log live status if available
                live = status.get("live_status", {})
                if live:
                    nifty_status = live.get("market_state", {}).get("Capital Market", {})
                    if nifty_status:
                        logger.info(f"   NIFTY: {nifty_status.get('last')} ({nifty_status.get('percent_change')}%)")
            else:
                reason = status.get("holiday_name") or "Weekend"
                logger.info(f"🔒 Market is CLOSED - {status['date']} ({status['day']}) - Reason: {reason}")
    
    except Exception as e:
        logger.error(f"Failed to check market status: {e}")

def start_indian_market_cron():
    """Start all Indian market related cron jobs"""
    if scheduler.running:
        logger.warning("Scheduler already running")
        return
    
    # ✅ Job 1: Fetch Indian holidays daily at 6:00 AM IST
    scheduler.add_job(
        func=fetch_indian_market_holidays_job,
        trigger=CronTrigger(hour=6, minute=0),
        id="indian_holidays_daily",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )
    logger.info("📅 Scheduled: Indian holidays fetch at 6:00 AM IST daily")
    
    # ✅ Job 2: Check market status every 30 minutes during market hours
    scheduler.add_job(
        func=check_market_status_job,
        trigger=IntervalTrigger(minutes=30),
        id="market_status_check",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )
    logger.info("⏰ Scheduled: Market status check every 30 minutes")
    
    # ✅ Job 3: Sync all market data every 4 hours
    scheduler.add_job(
        func=sync_all_market_data_job,
        trigger=IntervalTrigger(hours=4),
        id="market_data_sync",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )
    logger.info("🔄 Scheduled: Full market data sync every 4 hours")
    
    scheduler.start()
    logger.info("✅ Indian Market CRON scheduler started successfully")


def stop_indian_market_cron():
    """Stop all cron jobs"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Indian Market CRON scheduler stopped")