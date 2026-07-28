# app/utils/cron_decorator.py
from functools import wraps
from app.services.cron_logger_service import cron_logger
import logging

logger = logging.getLogger(__name__)


def log_cron_job(job_name: str, job_group: str = "default"):
    """
    Decorator to automatically log cron job execution
    
    Usage:
        @log_cron_job("bhavcopy_daily", "bhavcopy")
        def my_cron_job():
            # job code here
            return {"records_processed": 100, "records_inserted": 50}
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Start logging
            log_id = cron_logger.start_job(job_name, job_group)
            
            records_processed = 0
            records_inserted = 0
            records_updated = 0
            additional_data = {}
            
            try:
                # Execute the actual job
                result = func(*args, **kwargs)
                
                # Extract metrics from result if available
                if isinstance(result, dict):
                    records_processed = result.get('records_processed', 0)
                    records_inserted = result.get('records_inserted', 0)
                    records_updated = result.get('records_updated', 0)
                    additional_data = {k: v for k, v in result.items() 
                                     if k not in ['records_processed', 'records_inserted', 'records_updated']}
                
                # Log success
                cron_logger.end_job(
                    log_id, 
                    status="SUCCESS",
                    records_processed=records_processed,
                    records_inserted=records_inserted,
                    records_updated=records_updated,
                    additional_data=additional_data
                )
                
                return result
                
            except Exception as e:
                # Log failure
                cron_logger.end_job(
                    log_id,
                    status="FAILED",
                    error=e,
                    additional_data=additional_data
                )
                raise
                
        return wrapper
    return decorator


class CronJobContext:
    """Context manager for cron job logging"""
    
    def __init__(self, job_name: str, job_group: str = "default"):
        self.job_name = job_name
        self.job_group = job_group
        self.log_id = None
        self.records_processed = 0
        self.records_inserted = 0
        self.records_updated = 0
        self.additional_data = {}
    
    def __enter__(self):
        self.log_id = cron_logger.start_job(self.job_name, self.job_group)
        self._emit("job_started", status="RUNNING")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        status = "FAILED" if exc_type else "SUCCESS"
        
        cron_logger.end_job(
            self.log_id,
            status=status,
            records_processed=self.records_processed,
            records_inserted=self.records_inserted,
            records_updated=self.records_updated,
            error=exc_val if exc_type else None,
            additional_data=self.additional_data
        )
        self._emit(
            "job_finished",
            status=status,
            error=str(exc_val) if exc_val else None,
        )
        
        return False  # Don't suppress exceptions
    
    def add_record(self, processed: int = 0, inserted: int = 0, updated: int = 0):
        """Add to record counts"""
        self.records_processed += processed
        self.records_inserted += inserted
        self.records_updated += updated
    
    def set_data(self, **kwargs):
        """Set additional data"""
        self.additional_data.update(kwargs)

    def flush_progress(self, **kwargs):
        """Write current counters/data to DB while still RUNNING (for Manual API tracking)."""
        if kwargs:
            self.additional_data.update(kwargs)
        if not self.log_id:
            return False
        ok = cron_logger.update_running_job(
            self.log_id,
            records_processed=self.records_processed,
            records_inserted=self.records_inserted,
            records_updated=self.records_updated,
            additional_data=self.additional_data,
        )
        if ok:
            self._emit("job_progress", status="RUNNING", **kwargs)
        return ok

    def _emit(self, event_type: str, **extra):
        from app.services.manual_job_hub import manual_job_hub

        manual_job_hub.emit(
            event_type,
            job_name=self.job_name,
            job_group=self.job_group,
            log_id=self.log_id,
            records_processed=self.records_processed,
            records_inserted=self.records_inserted,
            records_updated=self.records_updated,
            additional_data=self.additional_data,
            **extra,
        )