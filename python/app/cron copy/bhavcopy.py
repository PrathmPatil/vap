from fastapi import FastAPI, HTTPException
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import timezone, timedelta
from app.services.bhavcopy_service import bhavcopy_service

app = FastAPI()

# IST timezone
IST = timezone(timedelta(hours=5, minutes=30))

def fetch_today_bhavcopy_cron():
    try:
        bhavcopy_service.fetch_today_bhavcopy()
        print("Bhavcopy fetched successfully at 7 PM")
    except Exception as e:
        print("Error:", str(e))

