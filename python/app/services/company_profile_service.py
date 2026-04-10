import time
import logging
import pymysql
import yfinance as yf
from app.config import config
from datetime import datetime, timedelta
import pytz

logger = logging.getLogger(__name__)

class CompanyProfileService:

    def __init__(self):
        self.db_config = {
            "host": config.DB_HOST,
            "user": config.DB_USER,
            "password": config.DB_PASSWORD,
            "database": config.DB_STOCK_MARKET,
            "cursorclass": pymysql.cursors.DictCursor
        }

    def get_symbols(self):
        """Fetch symbols from listed_companies table"""
        connection = pymysql.connect(**self.db_config)

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT symbol FROM listed_companies")
                rows = cursor.fetchall()
                return [row["symbol"] for row in rows]

        finally:
            connection.close()

    def save_company_profile(self, data):
        """Save company profile into DB"""
        connection = pymysql.connect(**self.db_config)

        try:
            with connection.cursor() as cursor:

                sql = """
                INSERT INTO all_companies_data (
                    symbol,
                    company_name,
                    sector,
                    industry,
                    market_cap,
                    website
                )
                VALUES (%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    company_name = VALUES(company_name),
                    sector = VALUES(sector),
                    industry = VALUES(industry),
                    market_cap = VALUES(market_cap),
                    website = VALUES(website)
                """

                cursor.execute(sql, (
                    data.get("symbol"),
                    data.get("longName"),
                    data.get("sector"),
                    data.get("industry"),
                    data.get("marketCap"),
                    data.get("website")
                ))

                connection.commit()

        finally:
            connection.close()

    def fetch_and_save_all(self):
        """Fetch all company profiles"""
        logger.info("🔥 CRON JOB STARTED: Fetching Company Profiles")

        symbols = self.get_symbols()

        success = 0
        failed = 0

        for symbol in symbols:

            try:
                logger.info(f"⏳ Fetching {symbol}")

                ticker = yf.Ticker(symbol)
                info = ticker.info

                if info and "symbol" in info:
                    self.save_company_profile(info)
                    logger.info(f"✅ Saved {symbol}")
                    success += 1
                else:
                    logger.warning(f"⚠️ No data for {symbol}")
                    failed += 1

                # 1 minute delay between companies
                logger.info("⏱ Waiting 60 seconds before next company...")
                time.sleep(60)

            except Exception as e:
                logger.error(f"❌ Error fetching {symbol}: {e}")
                failed += 1
                time.sleep(60)

        logger.info(f"🏁 Sync Completed | Success: {success} | Failed: {failed}")
        return {"success": success, "failed": failed}

    def fetch_and_save_market_data(self):
        """Fetch current market data for all symbols"""
        logger.info("📊 Fetching market data for all symbols")
        
        symbols = self.get_symbols()
        success = 0
        failed = 0
        
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                # Get current day's data
                hist = ticker.history(period="1d")
                
                if not hist.empty:
                    latest = hist.iloc[-1]
                    
                    # Save to market_data table
                    connection = pymysql.connect(**self.db_config)
                    try:
                        with connection.cursor() as cursor:
                            sql = """
                            INSERT INTO market_data (
                                symbol, date, open, high, low, close, volume
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON DUPLICATE KEY UPDATE
                                open = VALUES(open),
                                high = VALUES(high),
                                low = VALUES(low),
                                close = VALUES(close),
                                volume = VALUES(volume)
                            """
                            
                            cursor.execute(sql, (
                                symbol,
                                datetime.now(pytz.timezone("Asia/Kolkata")).date(),
                                latest['Open'],
                                latest['High'],
                                latest['Low'],
                                latest['Close'],
                                latest['Volume']
                            ))
                            connection.commit()
                            success += 1
                    finally:
                        connection.close()
                else:
                    failed += 1
                    
                time.sleep(2)  # Small delay to avoid rate limiting
                
            except Exception as e:
                logger.error(f"Error fetching market data for {symbol}: {e}")
                failed += 1
                
        logger.info(f"Market data fetch complete | Success: {success} | Failed: {failed}")
        return {"success": success, "failed": failed}

    def refresh_single_day(self):
        """Refresh single day data for all stocks"""
        # Implementation here
        pass

    def refresh_range(self, start, end):
        """Refresh data for date range"""
        # Implementation here
        pass

    def fetch_single_day(self, symbol):
        """Fetch single day data for a symbol"""
        # Implementation here
        pass


company_service = CompanyProfileService()

# Global function for scheduler
def fetch_and_save_market_data():
    return company_service.fetch_and_save_market_data()