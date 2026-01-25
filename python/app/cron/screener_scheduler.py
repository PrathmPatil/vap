import time
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

from app.database.connection import db_manager
from app.config import config
from app.services.screener_service import screener_service


class ScreenerScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # ----------------------------------------------------
    # FETCH SYMBOLS FROM DB
    # ----------------------------------------------------
    def get_all_symbols(self):
        conn = db_manager.get_connection(
            config.DB_STOCK_MARKET,
            dict_cursor=True
        )
        cursor = conn.cursor()

        cursor.execute("""
            SELECT symbol
            FROM listed_companies
            ORDER BY id
        """)
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        return [row["symbol"] for row in rows]

    # ----------------------------------------------------
    # MAIN CRON JOB
    # ----------------------------------------------------
    def run_daily_screener_job(self):
        symbols = self.get_all_symbols()
        total = len(symbols)

        print(f"\n🕒 Screener CRON STARTED | Total symbols: {total}")

        success = 0
        failed = 0

        for idx, symbol in enumerate(symbols, start=1):
            try:
                clean_symbol = symbol.replace(".NS", "")

                print(f"[{idx}/{total}] Fetching {clean_symbol}")

                screener_service.fetch_and_save(
                    clean_symbol,
                    "consolidated"
                )

                success += 1
                time.sleep(1.5)  # ⛔ DO NOT REMOVE (anti-ban)

            except Exception as e:
                failed += 1
                print(f"❌ Failed {symbol}: {e}")

        print(
            f"✅ Screener CRON FINISHED | "
            f"Success: {success}, Failed: {failed}, "
            f"Time: {datetime.now()}\n"
        )

    # ----------------------------------------------------
    # START SCHEDULER
    # ----------------------------------------------------
    def start(self):
        self.scheduler.add_job(
            self.run_daily_screener_job,
            trigger="cron",
            hour=2,
            minute=30,
            id="daily_screener_job",
            replace_existing=True,
            max_instances=1
        )

        self.scheduler.start()
        print("✅ Screener Scheduler started (02:30 AM IST)")


# ✅ SINGLE INSTANCE
screener_scheduler = ScreenerScheduler()
