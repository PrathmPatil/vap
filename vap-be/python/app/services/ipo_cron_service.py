from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.ipo_scraper_service import ipo_scraper_service
from app.config import config
from app.database.connection import db_manager

class IpoCronService:
    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
        print("✅ IpoCronService initialized")

    def start(self):
        self.scheduler.add_job(self.daily_ipo_job, "cron", hour=8, minute=0)
        self.scheduler.start()
        print("🕒 Daily IPO cron started (runs every day at 8:00 AM)")

    def daily_ipo_job(self):
        print("🚀 Running daily IPO cron job:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        for report_type in ["mainboard", "sme"]:
            try:
                result = ipo_scraper_service.process_report(report_type)
                print(f"✅ {report_type.capitalize()} data fetched & saved. Records: {result['records']}")
            except Exception as e:
                print(f"❌ Failed to process {report_type}: {e}")
        self.delete_old_data()

    def delete_old_data(self):
        db_name = config.DB_IPO
        conn = db_manager.get_connection(db_name)
        try:
            with conn.cursor() as cursor:
                seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
                for table in ["mainboard_data", "sme_data"]:
                    cursor.execute(f"DELETE FROM `{table}` WHERE DATE(created_at) < %s", (seven_days_ago,))
                    print(f"🧹 Cleaned old data from {table} before {seven_days_ago}")
                conn.commit()
        except Exception as e:
            print(f"⚠️ Error cleaning old data: {e}")
        finally:
            conn.close()

ipo_cron_service = IpoCronService()
