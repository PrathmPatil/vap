import time
import logging
import math
import pymysql
import pandas as pd
import requests
import yfinance as yf
from app.config import config
from datetime import datetime, timedelta
import pytz
from app.services._utils_retry import with_retries

logger = logging.getLogger(__name__)

MAX_MYSQL_FLOAT = 3.402823466e38

class CompanyProfileService:

    def __init__(self):
        self.db_config = {
            "host": config.DB_HOST,
            "port": config.DB_PORT,
            "user": config.DB_USER,
            "password": config.DB_PASSWORD,
            "database": config.DB_STOCK_MARKET,
            "cursorclass": pymysql.cursors.DictCursor
        }

    def sleep_between_companies(self):
        return

    def clean_numeric(self, value, max_abs=MAX_MYSQL_FLOAT):
        if value is None:
            return None

        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            return None

        if not math.isfinite(numeric_value):
            return None

        if abs(numeric_value) > max_abs:
            return None

        return numeric_value

    def ensure_tables_exist(self):
        """Ensure the company profile cron tables exist before writes."""
        connection = pymysql.connect(**self.db_config)

        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS companies (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        symbol VARCHAR(20) UNIQUE,
                        name VARCHAR(255),
                        sector VARCHAR(255),
                        industry VARCHAR(255),
                        currency VARCHAR(10),
                        exchange VARCHAR(50),
                        marketCap BIGINT,
                        currentPrice FLOAT,
                        previousClose FLOAT,
                        `change` FLOAT,
                        changePercent FLOAT,
                        volume BIGINT,
                        high52Week FLOAT,
                        low52Week FLOAT,
                        beta FLOAT,
                        dividendYield FLOAT,
                        forwardPE FLOAT,
                        trailingPE FLOAT,
                        website VARCHAR(255),
                        addedAt DATETIME
                    )
                """)

                for column in (
                    "currentPrice",
                    "previousClose",
                    "changePercent",
                    "high52Week",
                    "low52Week",
                    "beta",
                    "dividendYield",
                    "forwardPE",
                    "trailingPE",
                ):
                    cursor.execute(
                        f"ALTER TABLE companies MODIFY COLUMN `{column}` DOUBLE NULL"
                    )

                cursor.execute(
                    "ALTER TABLE companies MODIFY COLUMN `change` DOUBLE NULL"
                )

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS market_data (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        symbol VARCHAR(20) NOT NULL,
                        date DATE NOT NULL,
                        open DOUBLE,
                        high DOUBLE,
                        low DOUBLE,
                        close DOUBLE,
                        volume BIGINT,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY uk_symbol_date (symbol, date)
                    )
                """)

                for column in ("open", "high", "low", "close"):
                    cursor.execute(
                        f"ALTER TABLE market_data MODIFY COLUMN `{column}` DOUBLE NULL"
                    )

                cursor.execute(
                    "ALTER TABLE market_data MODIFY COLUMN `volume` BIGINT NULL"
                )

                connection.commit()
        finally:
            connection.close()

    def get_symbols(self):
        """Fetch symbols from listed_companies table"""
        self.ensure_tables_exist()
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
        self.ensure_tables_exist()
        connection = pymysql.connect(**self.db_config)

        try:
            with connection.cursor() as cursor:

                sql = """
                INSERT INTO companies (
                    symbol,
                    name,
                    sector,
                    industry,
                    currency,
                    exchange,
                    marketCap,
                    currentPrice,
                    previousClose,
                    `change`,
                    changePercent,
                    volume,
                    high52Week,
                    low52Week,
                    beta,
                    dividendYield,
                    forwardPE,
                    trailingPE,
                    website,
                    addedAt
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    sector = VALUES(sector),
                    industry = VALUES(industry),
                    currency = VALUES(currency),
                    exchange = VALUES(exchange),
                    marketCap = VALUES(marketCap),
                    currentPrice = VALUES(currentPrice),
                    previousClose = VALUES(previousClose),
                    `change` = VALUES(`change`),
                    changePercent = VALUES(changePercent),
                    volume = VALUES(volume),
                    high52Week = VALUES(high52Week),
                    low52Week = VALUES(low52Week),
                    beta = VALUES(beta),
                    dividendYield = VALUES(dividendYield),
                    forwardPE = VALUES(forwardPE),
                    trailingPE = VALUES(trailingPE),
                    website = VALUES(website),
                    addedAt = VALUES(addedAt)
                """

                current_price = self.clean_numeric(
                    data.get("currentPrice") or data.get("regularMarketPrice")
                )
                previous_close = self.clean_numeric(
                    data.get("previousClose") or data.get("regularMarketPreviousClose")
                )
                price_change = None
                change_percent = None

                if current_price is not None and previous_close:
                    price_change = current_price - previous_close
                    change_percent = (price_change / previous_close) * 100

                cursor.execute(sql, (
                    data.get("symbol"),
                    data.get("longName") or data.get("shortName"),
                    data.get("sector"),
                    data.get("industry"),
                    data.get("currency"),
                    data.get("exchange"),
                    self.clean_numeric(data.get("marketCap")),
                    current_price,
                    previous_close,
                    self.clean_numeric(price_change),
                    self.clean_numeric(change_percent),
                    self.clean_numeric(
                        data.get("volume") or data.get("regularMarketVolume")
                    ),
                    self.clean_numeric(data.get("fiftyTwoWeekHigh")),
                    self.clean_numeric(data.get("fiftyTwoWeekLow")),
                    self.clean_numeric(data.get("beta")),
                    self.clean_numeric(data.get("dividendYield")),
                    self.clean_numeric(data.get("forwardPE")),
                    self.clean_numeric(data.get("trailingPE")),
                    data.get("website"),
                    datetime.now()
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

                def _get_info():
                    t = yf.Ticker(symbol)
                    # access .info may raise HTTPError from requests used internally
                    return t.info

                try:
                    info = with_retries(_get_info, max_retries=5, initial_delay=1, backoff_factor=2, on_429_wait=60)
                except Exception as e:
                    logger.error(f"❌ Failed to fetch {symbol} after retries: {e}")
                    failed += 1
                    self.sleep_between_companies()
                    continue

                if info and "symbol" in info:
                    self.save_company_profile(info)
                    logger.info(f"✅ Saved {symbol}")
                    success += 1
                else:
                    logger.warning(f"⚠️ No data for {symbol}")
                    failed += 1

                self.sleep_between_companies()

            except requests.exceptions.HTTPError as e:
                logger.error(f"❌ HTTP error fetching {symbol}: {e}")
                failed += 1
                self.sleep_between_companies()
            except Exception as e:
                logger.error(f"❌ Error fetching {symbol}: {e}")
                failed += 1
                self.sleep_between_companies()

        logger.info(f"🏁 Sync Completed | Success: {success} | Failed: {failed}")
        return {"success": success, "failed": failed}

    def fetch_and_save_market_data(self):
        """Fetch current market data for all symbols"""
        logger.info("📊 Fetching market data for all symbols")
        self.ensure_tables_exist()
        
        symbols = self.get_symbols()
        success = 0
        failed = 0

        batch_size = getattr(config, "MARKET_FETCH_BATCH_SIZE", 20)

        def chunks(lst, n):
            for i in range(0, len(lst), n):
                yield lst[i:i + n]

        def extract_symbol_data(df, symbol):
            if df is None or df.empty:
                return None

            if isinstance(df.columns, pd.MultiIndex):
                if symbol in df.columns.get_level_values(0):
                    try:
                        return df[symbol]
                    except KeyError:
                        pass
                if symbol in df.columns.get_level_values(1):
                    try:
                        return df.xs(symbol, level=1, axis=1)
                    except KeyError:
                        pass
                return None

            return df

        def get_latest_field(series, field):
            if field in series.index:
                return series[field]
            for key in series.index:
                if isinstance(key, tuple) and key[-1] == field:
                    return series[key]
            return None

        def download_batch(tickers):
            # Use yfinance.download to fetch multiple tickers at once
            return yf.download(
                tickers=tickers,
                period="5d",
                interval="1d",
                group_by='ticker',
                threads=False,
                progress=False,
            )

        def fallback_history(symbol):
            try:
                df = yf.Ticker(symbol).history(period="5d", interval="1d")
                if df is None or df.empty:
                    return None
                return df
            except Exception:
                return None

        for batch in chunks(symbols, batch_size):
            tickers = list(batch)

            try:
                df = with_retries(
                    lambda: download_batch(tickers),
                    max_retries=4,
                    initial_delay=1,
                    backoff_factor=2,
                    on_429_wait=30,
                )
            except Exception as e:
                logger.error(f"Error downloading batch {tickers} after retries: {e}")
                failed += len(tickers)
                time.sleep(10)
                continue

            for symbol in tickers:
                try:
                    symbol_df = extract_symbol_data(df, symbol)
                    if symbol_df is None or symbol_df.empty:
                        logger.warning(f"⚠️ Missing market data for {symbol}, trying history fallback")
                        symbol_df = fallback_history(symbol)
                        if symbol_df is None or symbol_df.empty:
                            logger.warning(f"⚠️ No market history available for {symbol} (likely delisted or inactive)")
                            failed += 1
                            continue

                    latest = symbol_df.iloc[-1]
                    if latest is None or latest.empty:
                        logger.warning(f"⚠️ No latest row for {symbol}")
                        failed += 1
                        continue

                    open_price = self.clean_numeric(get_latest_field(latest, 'Open'))
                    high_price = self.clean_numeric(get_latest_field(latest, 'High'))
                    low_price = self.clean_numeric(get_latest_field(latest, 'Low'))
                    close_price = self.clean_numeric(get_latest_field(latest, 'Close'))
                    volume_value = self.clean_numeric(get_latest_field(latest, 'Volume'))

                    if open_price is None and close_price is None:
                        logger.warning(f"⚠️ Invalid yfinance data for {symbol}")
                        failed += 1
                        continue

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
                                open_price,
                                high_price,
                                low_price,
                                close_price,
                                volume_value,
                            ))
                            connection.commit()
                            success += 1
                    finally:
                        connection.close()

                except Exception as e:
                    logger.error(f"Error processing symbol {symbol} in batch: {e}")
                    failed += 1

            # Pause between batches to avoid rate limits
            time.sleep(10)

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