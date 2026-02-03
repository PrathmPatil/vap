from app.services.nse_fetch_service import NseFetchService
from app.services.nse_dynamic_service import nse_dynamic
import time
import threading


def nse_indices_job():
    try:
        nse_fetch = NseFetchService()  # ✅ create inside function
        indices = nse_fetch.fetch_all_indices()

        if not indices:
            print("⚠ No NSE indices data received")
            return

        result = nse_dynamic.save("all_indices", indices)

        print(
            f"✅ NSE Indices Saved | "
            f"Rows Inserted: {result.get('records')}"
        )
        print(f"Fetched {len(indices)} indices")
    except Exception as e:
        print("❌ NSE Indices Cron Failed:", e)


def start_nse_indices_scheduler():
    def runner():
        time.sleep(120)  # let app fully start
        while True:
            nse_indices_job()
            time.sleep(60 * 60)  # hourly
        scheduler.add_job(
    nse_indices_cron,
    trigger="interval",
    hours=1
)


    thread = threading.Thread(target=runner, daemon=True)
    thread.start()

# from apscheduler.schedulers.background import BackgroundScheduler
# from app.services.nse_fetch_service import nse_fetch
# from app.services.nse_dynamic_service import nse_dynamic
# import traceback


# # =========================================================
# # CRON JOB FUNCTION
# # =========================================================
# def nse_indices_cron():
#     """
#     Fetch NSE indices and store dynamically
#     """
#     try:
#         print("⏰ NSE Indices Cron Started")

#         indices = nse_fetch.fetch_all_indices()

#         if not indices:
#             print("⚠ No NSE indices data received")
#             return

#         result = nse_dynamic.save("all_indices", indices)

#         print(
#             f"✅ NSE Indices Saved | "
#             f"Rows Inserted: {result.get('records')}"
#         )

#     except Exception:
#         print("❌ NSE Indices Cron Failed")
#         traceback.print_exc()


# # =========================================================
# # SCHEDULER STARTER
# # =========================================================
# scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

# def start_nse_indices_scheduler():
#     """
#     Start NSE indices scheduler
#     """

#     scheduler.add_job(
#         nse_indices_cron,
#         trigger="interval",
#         minutes=5,                 # 🔁 change if needed
#         id="nse_indices_cron",
#         replace_existing=True,
#         max_instances=1,
#         coalesce=True
#     )

#     scheduler.start()
#     print("🚀 NSE Indices Scheduler Started")
