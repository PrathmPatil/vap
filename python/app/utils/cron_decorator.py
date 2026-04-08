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
        
        return False  # Don't suppress exceptions
    
    def add_record(self, processed: int = 0, inserted: int = 0, updated: int = 0):
        """Add to record counts"""
        self.records_processed += processed
        self.records_inserted += inserted
        self.records_updated += updated
    
    def set_data(self, **kwargs):
        """Set additional data"""
        self.additional_data.update(kwargs)