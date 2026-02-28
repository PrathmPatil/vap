from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.ipo_scraper_service import ipo_scraper_service
from app.config import config
from app.database.connection import db_manager

class IpoCronService:
    def __init__(self):
        # ✅ Using Asia/Kolkata is good practice
        self.scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
        print("✅ IpoCronService initialized")

    def start(self):
        # 1️⃣ Add the regular daily schedule (8:00 AM)
        self.scheduler.add_job(
            self.daily_ipo_job,
            trigger="interval",
            hours=24,              # 🔄 Every 24 hours
            minutes=0,              # 🔄 Set to 5 minutes
            id="ipo_fetch_job",
            replace_existing=True,
            next_run_time=datetime.now()  # 🚀 This forces it to run the second the server starts
        )
        
        # 2️⃣ Add a ONE-TIME job to run RIGHT NOW
        # This ensures data is fetched immediately when the server starts
        # self.scheduler.add_job(
        #     self.daily_ipo_job,
        #     id="immediate_ipo_fetch"
        #     # No trigger means "run once, immediately"
        # )

        self.scheduler.start()
        print("🕒 IPO Cron: Daily at 8:00 AM + Immediate startup fetch triggered")

    def daily_ipo_job(self):
        print(f"🚀 Running IPO job: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        for report_type in ["mainboard", "sme"]:
            try:
                # This calls your service which handles the database logic
                result = ipo_scraper_service.process_report(report_type)
                
                # We check result['status'] because your service returns 'empty' if no data found
                if result.get("status") == "success":
                    print(f"✅ {report_type.capitalize()}: {result['records_inserted']} rows saved.")
                else:
                    print(f"ℹ️ {report_type.capitalize()}: No new data found to save.")
                    
            except Exception as e:
                print(f"❌ Failed to process {report_type}: {e}")
        
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
