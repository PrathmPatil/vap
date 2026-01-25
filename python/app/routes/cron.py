from fastapi import APIRouter
from app.cron.screener_scheduler import screener_scheduler
from fastapi import APIRouter

router = APIRouter()

@router.post("/screener")
def run_screener_now():
    screener_scheduler.run_daily_screener_job()
    return {"status": "started"}
