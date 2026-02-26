# app/scheduler.py

from apscheduler.schedulers.background import BackgroundScheduler
from app.routes.bse_ann_api import fetch_and_save_bse_announcements

scheduler = BackgroundScheduler()

def start_bse_announcements_scheduler():
    scheduler.add_job(
        fetch_and_save_bse_announcements,
        trigger="cron",
        hour="*/1",      # 🔥 Every 1 hour
        id="bse_announcements_job",
        replace_existing=True
    )
    scheduler.start()
    print("⏰ Scheduler Started - Running every 1 hour")