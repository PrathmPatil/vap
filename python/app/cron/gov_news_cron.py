import logging
from app.services.gov_news_service import gov_news_service
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
logger = logging.getLogger(__name__)

# Track last successful run
last_successful_run = None
consecutive_failures = 0


def cron_fetch_all_gov_news():
    """
    Cron job to fetch government news with rate limiting and cooldown
    """
    global last_successful_run, consecutive_failures
    
    logger.info("🕒 Gov News CRON started")
    
    # Skip if too many failures (cooldown)
    if consecutive_failures >= 5:
        logger.warning(f"Too many failures ({consecutive_failures}), skipping this run")
        return
    
    results = {}
    success_count = 0
    total_endpoints = 0
    
    # Define endpoints with their configurations
    endpoints = [
        # ("pib_news", "/news/pib-news/dataservices/getpibnews", 
        #  {"npiFilters": [], "pageNumber": 1, "pageSize": 15}),
        
        ("pib_photographs", "/news/pib-photographs/dataservices/getPIBSearchNews",
         {"pageNumber": 1, "pageSize": 15, "termMatches": []}),
        
        ("dd_news", "/news/dd-news/dataservices/getddnews",
         {"mustFilter": [], "pageNumber": 1, "pageSize": 15}),
    ]
    
    # Uncomment when API is stable
    # ("news_on_air", "/news/news-on-air/dataservices/getnewsonair",
    #  {"pageNumber": 1, "pageSize": 100}),
    # ("pib_ministry", "/news/pib-news/dataservices/getpibministry",
    #  {"pageNumber": 1, "pageSize": 100}),
    
    for table_name, endpoint, payload in endpoints:
        total_endpoints += 1
        logger.info(f"Fetching {table_name}...")
        
        try:
            result = gov_news_service.fetch_and_save(table_name, endpoint, payload)
            results[table_name] = result
            
            if result.get("status") == "success":
                success_count += 1
                logger.info(f"✅ {table_name}: Saved {result.get('records_saved', 0)} records")
            else:
                logger.warning(f"⚠️ {table_name}: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"❌ Failed to fetch {table_name}: {e}")
            results[table_name] = {"status": "error", "error": str(e)}
    
    # Update failure tracking
    if success_count == total_endpoints:
        consecutive_failures = 0
        last_successful_run = datetime.now()
        logger.info(f"✅ Gov News CRON completed successfully - {success_count}/{total_endpoints} endpoints succeeded")
    else:
        consecutive_failures += 1
        logger.warning(f"⚠️ Gov News CRON partial failure - {success_count}/{total_endpoints} succeeded (failures: {consecutive_failures})")
    
    return results


def start_gov_news_cron():
    """
    Register government news cron with appropriate frequency
    """
    # Check if scheduler is already running
    if scheduler.running:
        logger.warning("Scheduler already running, skipping registration")
        return
    
    # Use hourly schedule instead of every 5 minutes to reduce load
    scheduler.add_job(
        cron_fetch_all_gov_news,
        trigger="cron",
        minute=0,  # Run at minute 0 of every hour
        # minute="*/30",  # Or every 30 minutes if needed
        id="gov_news_hourly_cron",
        replace_existing=True,
        max_instances=1,
        coalesce=True  # Skip if multiple jobs queued
    )
    
    # Start scheduler
    scheduler.start()
    logger.info("🚀 Gov News CRON registered (hourly schedule) and scheduler started")