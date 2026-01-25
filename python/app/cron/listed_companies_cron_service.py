import time
from threading import Thread
from datetime import datetime
from app.services.yfinance_service import yfinance_service


class ListedCompaniesCronService:
    def __init__(self):
        self.running = False

    def run_daily_job(self):
        """
        Runs once every 24 hours
        """
        while self.running:
            try:
                print("🕒 [CRON] Checking for new NSE listed companies...")
                result = yfinance_service.sync_new_listed_companies()
                print(f"✅ [CRON] {result}")
            except Exception as e:
                print(f"❌ [CRON ERROR] {e}")

            # Sleep for 24 hours
            time.sleep(60 * 60 * 24)

    def start(self):
        if self.running:
            return
        self.running = True
        Thread(target=self.run_daily_job, daemon=True).start()
        print("🚀 Listed Companies Cron Started")


listed_companies_cron_service = ListedCompaniesCronService()
