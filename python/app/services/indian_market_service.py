import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import time
from sqlalchemy import text
from app.database.connection import db_manager
from app.config import config

logger = logging.getLogger(__name__)


class IndianMarketService:
    def __init__(self):
        self.base_url = "https://www.nseindia.com"
        self.db_name = config.DB_STOCK_MARKET
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.nseindia.com/",
            "Origin": "https://www.nseindia.com",
            "Connection": "keep-alive",
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Ensure table exists
        self.ensure_holiday_table()

    def ensure_holiday_table(self):
        """Ensure market_holidays table exists"""
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS `market_holidays` (
                `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                `holiday_date` DATE NOT NULL,
                `day` VARCHAR(20) NOT NULL,
                `description` VARCHAR(500) NOT NULL,
                `segment` VARCHAR(10) NOT NULL,
                `sr_no` INT NULL,
                `morning_session` VARCHAR(50) NULL,
                `evening_session` VARCHAR(50) NULL,
                `source` VARCHAR(100) DEFAULT 'NSE API',
                `is_active` BOOLEAN DEFAULT TRUE,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `unique_holiday` (`holiday_date`, `segment`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            
            cursor.execute(create_table_sql)
            conn.commit()
            cursor.close()
            conn.close()
            logger.info("✅ Market holidays table ensured")
            
        except Exception as e:
            logger.error(f"Failed to create market_holidays table: {e}")

    def _get_cookies(self) -> bool:
        """Get initial cookies from NSE (required for API access)"""
        try:
            resp = self.session.get(self.base_url, timeout=30)
            time.sleep(1)
            return resp.status_code == 200
        except Exception as e:
            logger.error(f"Failed to get NSE cookies: {e}")
            return False

    def fetch_holidays_from_api(self, segment: str = "CM") -> List[Dict]:
        """
        Fetch market holidays from NSE API
        
        Segments:
        - CM: Capital Market (Equity)
        - FO: Futures & Options
        - CD: Currency Derivatives
        - COM: Commodities
        - CBM: Corporate Bond Market
        - IRD: Interest Rate Derivatives
        - MF: Mutual Funds
        - SLBS: Securities Lending & Borrowing
        """
        try:
            self._get_cookies()
            url = f"{self.base_url}/api/holiday-master?type=clearing"
            
            response = self.session.get(url, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch holidays: {response.status_code}")
                return []
            
            data = response.json()
            
            if segment not in data:
                logger.warning(f"Segment {segment} not found in holiday data")
                return []
            
            holidays = []
            for holiday in data[segment]:
                # Parse date (format: "15-Jan-2026")
                date_obj = datetime.strptime(holiday["tradingDate"], "%d-%b-%Y")
                
                holidays.append({
                    "holiday_date": date_obj.strftime("%Y-%m-%d"),
                    "day": holiday["weekDay"],
                    "description": holiday["description"],
                    "segment": segment,
                    "sr_no": holiday.get("Sr_no"),
                    "morning_session": holiday.get("morning_session"),
                    "evening_session": holiday.get("evening_session"),
                    "source": "NSE API",
                    "is_active": True
                })
            
            logger.info(f"✅ Fetched {len(holidays)} holidays for {segment} segment")
            return holidays
            
        except Exception as e:
            logger.error(f"Error fetching holidays: {e}")
            return []

    def save_holidays_to_db(self, holidays: List[Dict]) -> Dict:
        """
        Save holidays to database with duplicate prevention
        Returns: {'inserted': count, 'duplicates': count, 'errors': count}
        """
        if not holidays:
            return {'inserted': 0, 'duplicates': 0, 'errors': 0}
        
        inserted = 0
        duplicates = 0
        errors = 0
        
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            # Use INSERT IGNORE to skip duplicates
            insert_sql = """
            INSERT IGNORE INTO market_holidays 
            (holiday_date, day, description, segment, sr_no, morning_session, evening_session, source, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            for holiday in holidays:
                try:
                    cursor.execute(insert_sql, (
                        holiday['holiday_date'],
                        holiday['day'],
                        holiday['description'],
                        holiday['segment'],
                        holiday.get('sr_no'),
                        holiday.get('morning_session'),
                        holiday.get('evening_session'),
                        holiday.get('source', 'NSE API'),
                        holiday.get('is_active', True)
                    ))
                    
                    if cursor.rowcount > 0:
                        inserted += 1
                    else:
                        duplicates += 1
                        
                except Exception as e:
                    errors += 1
                    logger.error(f"Error inserting holiday {holiday.get('holiday_date')}: {e}")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"✅ Saved holidays - Inserted: {inserted}, Duplicates: {duplicates}, Errors: {errors}")
            return {'inserted': inserted, 'duplicates': duplicates, 'errors': errors}
            
        except Exception as e:
            logger.error(f"Failed to save holidays to DB: {e}")
            return {'inserted': 0, 'duplicates': 0, 'errors': len(holidays)}

    def fetch_and_save_holidays(self, segment: str = "CM") -> Dict:
        """Fetch holidays from API and save to database"""
        holidays = self.fetch_holidays_from_api(segment)
        if holidays:
            return self.save_holidays_to_db(holidays)
        return {'inserted': 0, 'duplicates': 0, 'errors': 0}

    def get_holidays_from_db(self, segment: str = None, year: int = None, 
                             start_date: str = None, end_date: str = None) -> List[Dict]:
        """Retrieve holidays from database with filters"""
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            query = "SELECT * FROM market_holidays WHERE is_active = TRUE"
            params = []
            
            if segment:
                query += " AND segment = %s"
                params.append(segment)
            
            if year:
                query += " AND YEAR(holiday_date) = %s"
                params.append(year)
            
            if start_date:
                query += " AND holiday_date >= %s"
                params.append(start_date)
            
            if end_date:
                query += " AND holiday_date <= %s"
                params.append(end_date)
            
            query += " ORDER BY holiday_date"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Convert to list of dicts
            columns = [desc[0] for desc in cursor.description]
            holidays = [dict(zip(columns, row)) for row in results]
            
            cursor.close()
            conn.close()
            
            return holidays
            
        except Exception as e:
            logger.error(f"Failed to get holidays from DB: {e}")
            return []

    def update_holiday_status(self, holiday_date: str, segment: str, is_active: bool) -> bool:
        """Soft delete or reactivate a holiday"""
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            query = """
            UPDATE market_holidays 
            SET is_active = %s 
            WHERE holiday_date = %s AND segment = %s
            """
            
            cursor.execute(query, (is_active, holiday_date, segment))
            conn.commit()
            
            updated = cursor.rowcount > 0
            cursor.close()
            conn.close()
            
            if updated:
                logger.info(f"Updated holiday {holiday_date} ({segment}) - Active: {is_active}")
            return updated
            
        except Exception as e:
            logger.error(f"Failed to update holiday status: {e}")
            return False

    def delete_old_holidays(self, years_back: int = 2) -> int:
        """Delete holidays older than specified years"""
        try:
            conn = db_manager.get_connection(self.db_name)
            cursor = conn.cursor()
            
            delete_date = datetime.now() - timedelta(days=years_back * 365)
            query = "DELETE FROM market_holidays WHERE holiday_date < %s"
            
            cursor.execute(query, (delete_date,))
            deleted_count = cursor.rowcount
            conn.commit()
            
            cursor.close()
            conn.close()
            
            logger.info(f"Deleted {deleted_count} old holidays (before {delete_date.date()})")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete old holidays: {e}")
            return 0

    def is_market_holiday(self, date: Optional[datetime] = None, segment: str = "CM") -> bool:
        """Check if given date is a market holiday (checks DB first, then API)"""
        if date is None:
            date = datetime.now()
        
        # Check weekend first
        if date.weekday() >= 5:
            return True
        
        date_str = date.strftime("%Y-%m-%d")
        
        # First check database
        holidays = self.get_holidays_from_db(segment=segment, start_date=date_str, end_date=date_str)
        
        if holidays:
            return len(holidays) > 0
        
        # If not in DB, fetch from API and save
        holidays = self.fetch_holidays_from_api(segment)
        self.save_holidays_to_db(holidays)
        
        # Check again
        return any(h["holiday_date"] == date_str for h in holidays)

    def get_market_status_for_date(self, date: Optional[datetime] = None) -> Dict:
        """Get complete market status for a specific date"""
        if date is None:
            date = datetime.now()
            use_live = True
        else:
            use_live = False
        
        date_str = date.strftime("%Y-%m-%d")
        is_weekend = date.weekday() >= 5
        
        # Get holidays from DB
        holidays = self.get_holidays_from_db(segment="CM", start_date=date_str, end_date=date_str)
        is_holiday = len(holidays) > 0
        holiday_info = holidays[0] if holidays else None
        
        # Get live market status if today
        live_status = {}
        if use_live and not is_weekend and not is_holiday:
            live_status = self.fetch_market_status()
        
        return {
            "date": date_str,
            "day": date.strftime("%A"),
            "is_weekend": is_weekend,
            "is_holiday": is_holiday,
            "is_open": not (is_weekend or is_holiday),
            "holiday_name": holiday_info.get("description") if holiday_info else None,
            "holiday_segment": holiday_info.get("segment") if holiday_info else None,
            "trading_hours": {
                "pre_open": "09:00 - 09:15 IST",
                "regular": "09:15 - 15:30 IST",
                "post_close": "15:40 - 16:00 IST"
            },
            "live_status": live_status if use_live else None,
            "source": "Database (from NSE API)"
        }

    def fetch_market_status(self) -> Dict:
        """Fetch current market status"""
        try:
            self._get_cookies()
            url = f"{self.base_url}/api/marketStatus"
            response = self.session.get(url, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch market status: {response.status_code}")
                return {}
            
            data = response.json()
            
            # Process market state
            market_state = {}
            for market in data.get("marketState", []):
                market_name = market.get("market")
                market_state[market_name] = {
                    "status": market.get("marketStatus"),
                    "message": market.get("marketStatusMessage"),
                    "trade_date": market.get("tradeDate"),
                    "last": market.get("last"),
                    "variation": market.get("variation"),
                    "percent_change": market.get("percentChange")
                }
            
            return {
                "market_state": market_state,
                "market_cap": data.get("marketcap", {}),
                "indicative_nifty": data.get("indicativenifty50", {}),
                "gift_nifty": data.get("giftnifty", {}),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching market status: {e}")
            return {}

    def get_upcoming_holidays(self, days: int = 30) -> List[Dict]:
        """Get upcoming holidays from database for next N days"""
        today = datetime.now().date()
        end_date = today + timedelta(days=days)
        
        holidays = self.get_holidays_from_db(
            segment="CM",
            start_date=today.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d")
        )
        
        upcoming = []
        for holiday in holidays:
            holiday_date = datetime.strptime(str(holiday['holiday_date']), "%Y-%m-%d").date()
            upcoming.append({
                "date": str(holiday['holiday_date']),
                "day": holiday['day'],
                "description": holiday['description'],
                "days_until": (holiday_date - today).days
            })
        
        upcoming.sort(key=lambda x: x["date"])
        return upcoming


# Singleton instance
indian_market_service = IndianMarketService()