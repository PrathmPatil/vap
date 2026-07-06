import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import config
from app.services.ipo_scraper_service import ipo_scraper_service
from app.utils.cron_decorator import CronJobContext

logger = logging.getLogger(__name__)


def _parse_ipo_cron_trigger() -> CronTrigger:
    cron_expr = config.SCHEDULER_CONFIG["ipo_update"].strip().strip('"').strip("'")
    timezone = config.SCHEDULER_TIMEZONE

    try:
        return CronTrigger.from_crontab(cron_expr, timezone=timezone)
    except ValueError as error:
        raise RuntimeError(
            f"Invalid IPO_UPDATE_CRON '{cron_expr}'. "
            "Use a 5-field cron expression, e.g. 0 4 * * *"
        ) from error


class IpoCronService:
    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone=config.SCHEDULER_TIMEZONE)
        self.job_id = "ipo_fetch_job"
        logger.info("IpoCronService initialized")

    def start(self):
        if self.scheduler.running:
            logger.warning("IPO cron scheduler already running")
            return

        cron_trigger = _parse_ipo_cron_trigger()

        self.scheduler.add_job(
            self.daily_ipo_job,
            trigger=cron_trigger,
            id=self.job_id,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        self.scheduler.start()

        logger.info(
            "IPO cron scheduled | cron=%s | timezone=%s",
            config.SCHEDULER_CONFIG["ipo_update"],
            config.SCHEDULER_TIMEZONE,
        )

        # Run once immediately when the Python service starts.
        self.daily_ipo_job()

    def daily_ipo_job(self):
        with CronJobContext("ipo_nse_sync", "ipo") as context:
            logger.info(
                "Running IPO sync job at %s",
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            )

            nse_enabled = config.IPO_SOURCES["nse"]["enabled"]

            if nse_enabled:
                try:
                    from app.services.nse_ipo_service import nse_ipo_service

                    result = nse_ipo_service.sync_to_database()
                    inserted = result.get("records_inserted", {})
                    total = sum(inserted.values()) if isinstance(inserted, dict) else 0

                    context.set_data(
                        source="NSE API",
                        records_inserted=inserted,
                        total_records=total,
                    )
                    context.add_record(processed=total, inserted=total)

                    logger.info("NSE IPO sync completed: %s", inserted)
                    return result
                except Exception as error:
                    logger.exception("NSE IPO sync failed, falling back to Chittorgarh: %s", error)
                    context.set_data(nse_error=str(error))

            return self._run_chittorgarh_fallback(context)

    def _run_chittorgarh_fallback(self, context):
        if not config.IPO_SOURCES["chittorgarh"]["enabled"]:
            logger.error("IPO sync failed and Chittorgarh fallback is disabled")
            context.set_data(fallback="disabled")
            raise RuntimeError("IPO sync failed and no fallback source is enabled")

        total_inserted = 0
        results = {}

        for report_type in ["mainboard", "sme"]:
            try:
                result = ipo_scraper_service.process_report(report_type)
                results[report_type] = result

                if result.get("status") == "success":
                    inserted = int(result.get("records_inserted") or 0)
                    total_inserted += inserted
                    context.add_record(processed=inserted, inserted=inserted)
                    logger.info(
                        "%s IPO fallback sync saved %s rows",
                        report_type.capitalize(),
                        inserted,
                    )
                else:
                    logger.info(
                        "%s IPO fallback sync returned no new data",
                        report_type.capitalize(),
                    )
            except Exception as error:
                logger.exception("Failed to process %s IPO fallback: %s", report_type, error)
                results[report_type] = {"status": "failed", "error": str(error)}

        context.set_data(source="Chittorgarh", results=results, total_records=total_inserted)
        return {"status": "success", "source": "Chittorgarh", "results": results}


ipo_cron_service = IpoCronService()
