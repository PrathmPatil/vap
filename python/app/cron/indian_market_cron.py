import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import timezone, timedelta, datetime
from app.services.indian_market_service import indian_market_service
from app.utils.cron_decorator import CronJobContext

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))
scheduler = BackgroundScheduler(timezone=IST)


def fetch_indian_market_holidays_job():
    """Fetch Indian market holidays and save to database with logging"""
    with CronJobContext("indian_holidays_fetch", "indian_market") as context:
        logger.info("🔥 Indian Market Holidays CRON started")
        
        # Fetch and save holidays for all segments
        segments = ["CM", "FO", "CD", "COM", "CBM", "IRD", "MF", "SLBS"]
        total_inserted = 0
        total_duplicates = 0
        total_errors = 0
        
        for segment in segments:
            logger.info(f"Processing {segment} segment...")
            result = indian_market_service.fetch_and_save_holidays(segment)
            total_inserted += result['inserted']
            total_duplicates += result['duplicates']
            total_errors += result['errors']
            
            context.add_record(processed=result['inserted'] + result['duplicates'])
        
        context.set_data(
            total_holidays_fetched=total_inserted + total_duplicates,
            new_holidays_inserted=total_inserted,
            duplicates_skipped=total_duplicates,
            errors=total_errors
        )
        
        logger.info(f"✅ Holiday sync complete - New: {total_inserted}, Duplicates: {total_duplicates}, Errors: {total_errors}")
        
        # Get upcoming holidays from database
        upcoming = indian_market_service.get_upcoming_holidays(30)
        context.set_data(upcoming_holidays_count=len(upcoming))
        
        if upcoming:
            logger.info(f"📅 Upcoming holidays in next 30 days: {len(upcoming)}")
            for holiday in upcoming[:5]:  # Log first 5
                logger.info(f"   - {holiday['date']} ({holiday['day']}): {holiday['description']}")


def check_market_status_job():
    """Check market status with logging"""
    with CronJobContext("market_status_check", "indian_market") as context:
        now = datetime.now()
        
        # Only log during market hours (9 AM to 4 PM)
        if 9 <= now.hour <= 16:
            status = indian_market_service.get_market_status_for_date(now)
            
            context.set_data(
                is_open=status.get("is_open"),
                is_holiday=status.get("is_holiday"),
                holiday_name=status.get("holiday_name")
            )
            
            if status.get("is_open"):
                logger.info(f"📈 Market is OPEN - {status['date']}")
            else:
                reason = status.get("holiday_name") or "Weekend"
                logger.info(f"🔒 Market is CLOSED - {reason}")


def start_indian_market_cron():
    """Start Indian market cron scheduler"""
    if scheduler.running:
        logger.warning("Scheduler already running")
        return
    
    # Job 1: Fetch holidays daily at 6:00 AM
    scheduler.add_job(
        func=fetch_indian_market_holidays_job,
        trigger=CronTrigger(hour=6, minute=0),
        id="indian_holidays_daily",
        replace_existing=True,
    )
    
    # Job 2: Check market status every 30 minutes during market hours
    scheduler.add_job(
        func=check_market_status_job,
        trigger=IntervalTrigger(minutes=30),
        id="market_status_check",
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info("✅ Indian Market CRON scheduler started")