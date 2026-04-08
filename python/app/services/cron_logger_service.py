import logging
from datetime import datetime
from typing import Dict, Any, Optional
import json
import traceback
from app.database.connection import db_manager
from app.config import config
import pymysql

logger = logging.getLogger(__name__)


class CronLoggerService:
    """Service to log all cron job executions"""
    
    def __init__(self):
        self.db_name = config.DB_STOCK_MARKET
        self.table_created = False
        # Try to create table on initialization
        self.ensure_table_exists()
    
    def ensure_table_exists(self):
        """Ensure cron_job_logs table exists with proper error handling"""
        if self.table_created:
            return
        
        conn = None
        cursor = None
        
        try:
            # Get connection
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            # First check if table exists
            check_table_sql = """
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = %s AND table_name = 'cron_job_logs'
            """
            cursor.execute(check_table_sql, (self.db_name,))
            table_exists = cursor.fetchone()[0] > 0
            
            if not table_exists:
                logger.info(f"Creating cron_job_logs table in {self.db_name} database...")
                
                create_table_sql = """
                CREATE TABLE IF NOT EXISTS `cron_job_logs` (
                    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    `job_name` VARCHAR(255) NOT NULL COMMENT 'Name of the cron job',
                    `job_group` VARCHAR(100) DEFAULT 'default' COMMENT 'Group/category of the job',
                    `start_time` DATETIME NOT NULL COMMENT 'When job started',
                    `end_time` DATETIME NULL COMMENT 'When job ended',
                    `duration_seconds` DECIMAL(10, 3) NULL COMMENT 'Execution duration in seconds',
                    `status` ENUM('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED') DEFAULT 'RUNNING',
                    `records_processed` INT DEFAULT 0 COMMENT 'Number of records processed',
                    `records_inserted` INT DEFAULT 0 COMMENT 'Number of records inserted',
                    `records_updated` INT DEFAULT 0 COMMENT 'Number of records updated',
                    `error_message` TEXT NULL COMMENT 'Error message if failed',
                    `error_traceback` TEXT NULL COMMENT 'Full error traceback',
                    `additional_data` JSON NULL COMMENT 'Any additional job-specific data',
                    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_job_name (job_name),
                    INDEX idx_status (status),
                    INDEX idx_start_time (start_time),
                    INDEX idx_job_group (job_group)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
                
                cursor.execute(create_table_sql)
                conn.commit()
                logger.info("✅ Cron job logs table created successfully")
            else:
                logger.debug("Cron job logs table already exists")
            
            self.table_created = True
            
        except Exception as e:
            logger.error(f"Failed to ensure cron_job_logs table: {e}")
            logger.warning("Cron logging will be disabled (non-critical)")
            self.table_created = False
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def start_job(self, job_name: str, job_group: str = "default", additional_data: Dict = None) -> Optional[int]:
        """Log job start and return log ID"""
        # Try to ensure table exists if it wasn't created before
        if not self.table_created:
            self.ensure_table_exists()
            if not self.table_created:
                logger.debug(f"Cannot log job start - table not available")
                return None
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            query = """
            INSERT INTO cron_job_logs (job_name, job_group, start_time, status, additional_data)
            VALUES (%s, %s, %s, 'RUNNING', %s)
            """
            
            additional_json = json.dumps(additional_data) if additional_data else None
            
            cursor.execute(query, (
                job_name,
                job_group,
                datetime.now(),
                additional_json
            ))
            
            log_id = cursor.lastrowid
            conn.commit()
            
            logger.debug(f"Job '{job_name}' started (ID: {log_id})")
            return log_id
            
        except Exception as e:
            logger.error(f"Failed to log job start: {e}")
            return None
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def end_job(self, log_id: int, status: str = "SUCCESS", 
                records_processed: int = 0, records_inserted: int = 0, 
                records_updated: int = 0, error: Exception = None,
                additional_data: Dict = None):
        """Update job log with completion status"""
        if not self.table_created or log_id is None:
            return
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            end_time = datetime.now()
            
            # Calculate duration if start_time exists
            cursor.execute("SELECT start_time FROM cron_job_logs WHERE id = %s", (log_id,))
            result = cursor.fetchone()
            
            duration = None
            if result and result[0]:
                duration = (end_time - result[0]).total_seconds()
            
            error_message = None
            error_traceback = None
            
            if error:
                error_message = str(error)
                error_traceback = traceback.format_exc()
            
            # Merge additional data if provided
            if additional_data:
                cursor.execute("SELECT additional_data FROM cron_job_logs WHERE id = %s", (log_id,))
                existing_data = cursor.fetchone()
                if existing_data and existing_data[0]:
                    try:
                        existing_dict = json.loads(existing_data[0]) if existing_data[0] else {}
                        existing_dict.update(additional_data)
                        additional_data = existing_dict
                    except:
                        pass
            
            additional_json = json.dumps(additional_data) if additional_data else None
            
            query = """
            UPDATE cron_job_logs 
            SET end_time = %s,
                duration_seconds = %s,
                status = %s,
                records_processed = %s,
                records_inserted = %s,
                records_updated = %s,
                error_message = %s,
                error_traceback = %s,
                additional_data = COALESCE(%s, additional_data)
            WHERE id = %s
            """
            
            cursor.execute(query, (
                end_time, duration, status, records_processed,
                records_inserted, records_updated, error_message,
                error_traceback, additional_json, log_id
            ))
            
            conn.commit()
            logger.debug(f"Job completed (ID: {log_id}) - Status: {status}")
            
        except Exception as e:
            logger.error(f"Failed to update job log: {e}")
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def get_job_history(self, job_name: str = None, days: int = 7, limit: int = 100):
        """Get job execution history"""
        if not self.table_created:
            return []
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            query = """
            SELECT * FROM cron_job_logs
            WHERE (%s IS NULL OR job_name = %s)
            AND start_time >= DATE_SUB(NOW(), INTERVAL %s DAY)
            ORDER BY start_time DESC
            LIMIT %s
            """
            
            cursor.execute(query, (job_name, job_name, days, limit))
            results = cursor.fetchall()
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get job history: {e}")
            return []
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def get_job_stats(self, job_name: str = None, days: int = 30):
        """Get job execution statistics"""
        if not self.table_created:
            return []
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            query = """
            SELECT 
                job_name,
                COUNT(*) as total_runs,
                SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count,
                ROUND(AVG(duration_seconds), 2) as avg_duration_seconds,
                SUM(records_processed) as total_records_processed,
                SUM(records_inserted) as total_records_inserted,
                SUM(records_updated) as total_records_updated,
                MAX(start_time) as last_run
            FROM cron_job_logs
            WHERE (%s IS NULL OR job_name = %s)
            AND start_time >= DATE_SUB(NOW(), INTERVAL %s DAY)
            GROUP BY job_name
            ORDER BY last_run DESC
            """
            
            cursor.execute(query, (job_name, job_name, days))
            results = cursor.fetchall()
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get job stats: {e}")
            return []
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def cleanup_old_logs(self, days: int = 90):
        """Delete logs older than specified days"""
        if not self.table_created:
            return 0
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            query = "DELETE FROM cron_job_logs WHERE start_time < DATE_SUB(NOW(), INTERVAL %s DAY)"
            cursor.execute(query, (days,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            logger.info(f"Cleaned up {deleted_count} old log entries (older than {days} days)")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old logs: {e}")
            return 0
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def get_failed_jobs(self, days: int = 7, limit: int = 50):
        """Get failed job executions"""
        if not self.table_created:
            return []
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            query = """
            SELECT * FROM cron_job_logs
            WHERE status = 'FAILED'
            AND start_time >= DATE_SUB(NOW(), INTERVAL %s DAY)
            ORDER BY start_time DESC
            LIMIT %s
            """
            
            cursor.execute(query, (days, limit))
            results = cursor.fetchall()
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get failed jobs: {e}")
            return []
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    def get_daily_summary(self, days: int = 7):
        """Get daily job execution summary"""
        if not self.table_created:
            return []
        
        conn = None
        cursor = None
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            query = """
            SELECT 
                DATE(start_time) as run_date,
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) as skipped,
                SUM(records_processed) as total_processed,
                SUM(records_inserted) as total_inserted,
                SUM(records_updated) as total_updated
            FROM cron_job_logs
            WHERE start_time >= DATE_SUB(NOW(), INTERVAL %s DAY)
            GROUP BY DATE(start_time)
            ORDER BY run_date DESC
            """
            
            cursor.execute(query, (days,))
            results = cursor.fetchall()
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to get daily summary: {e}")
            return []
            
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()


# Singleton instance
cron_logger = CronLoggerService()