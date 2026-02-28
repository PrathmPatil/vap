# app/scheduler.py

from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.routes.bse_ann_api import fetch_and_save_bse_announcements

scheduler = BackgroundScheduler()

def start_bse_announcements_scheduler():
    scheduler.add_job(
        fetch_and_save_bse_announcements,
        trigger="interval",
        minutes=50,  # ✅ runs every 50 minutes
        id="bse_announcements_job",
        replace_existing=True,
        # ✅ FIX: Explicitly pass the parameters the function needs to save
        kwargs={
            "save": True,      # This is the most important part!
            "strSearch": "A",  # Match your browser test if needed
            "pageno": 1
        },
        next_run_time=datetime.now()
    )
    scheduler.start()
    print(f"⏰ Scheduler Started - Running every 5 minutes with save=True")