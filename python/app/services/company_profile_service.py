import time
import random
import logging
import requests
import yfinance as yf

logger = logging.getLogger(__name__)

class CompanyProfileService:
    def __init__(self):
        # Professional User-Agents to avoid "Python-Requests" detection
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        ]

    def fetch_and_save_all(self):
        logger.info("🔥 CRON JOB STARTED: Fetching Company Profiles")
        
        # 1. Get your symbols (example list)
        symbols = ["20MICRONS.NS", "21STCENMGM.NS", "360ONE.NS", "3IINFOLTD.NS"] 
        
        # 2. Setup Session
        session = requests.Session()
        
        success_count = 0
        fail_count = 0

        for symbol in symbols:
            try:
                # Rotate User-Agent for every request
                session.headers.update({"User-Agent": random.choice(self.user_agents)})
                
                logger.info(f"⏳ Fetching data for: {symbol}")
                
                # Fetch using yfinance with the session
                ticker = yf.Ticker(symbol, session=session)
                info = ticker.info # This triggers the network request
                
                if info and 'symbol' in info:
                    # TODO: Add your DB save logic here
                    # db.save(info)
                    success_count += 1
                    logger.info(f"✅ Successfully fetched: {symbol}")
                else:
                    logger.warning(f"⚠️ No data returned for: {symbol}")
                    fail_count += 1

                # --- THE MOST IMPORTANT PART FOR SERVERS ---
                # Random sleep between 3 to 10 seconds to avoid IP block
                sleep_time = random.uniform(3, 10)
                time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"❌ Error fetching {symbol}: {str(e)}")
                fail_count += 1
                # If we hit an error, wait longer before trying next symbol
                time.sleep(20) 

        logger.info(f"🏁 Sync Completed. Success: {success_count} | Failed: {fail_count}")

company_service = CompanyProfileService()