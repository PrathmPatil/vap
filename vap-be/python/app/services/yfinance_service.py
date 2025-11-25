import pandas as pd
import yfinance as yf
from datetime import datetime
from fastapi import HTTPException
from app.config import config
from app.database.connection import db_manager


class YFINANCEService:
    def __init__(self):
        db_manager.ensure_database(config.DB_STOCK_MARKET)
        self.create_tables()

    def create_tables(self):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        # Companies table
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

        # Historical price table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_price_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(20),
                recordDate DATE,
                open FLOAT,
                high FLOAT,
                low FLOAT,
                close FLOAT,
                volume BIGINT,
                createdAt DATETIME,
                UNIQUE KEY unique_record (symbol, recordDate)
            )
        """)

        conn.commit()
        cursor.close()
        conn.close()

    def fetch_company_info(self, symbol: str):
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            current_price = info.get('currentPrice')
            previous_close = info.get('previousClose')
            change = round(current_price - previous_close, 2) if current_price and previous_close else None
            change_percent = round((change / previous_close) * 100, 2) if change and previous_close else None

            return {
                "symbol": symbol,
                "name": info.get('longName') or info.get('shortName'),
                "sector": info.get('sector'),
                "industry": info.get('industry'),
                "currency": info.get('currency'),
                "exchange": info.get('exchange'),
                "marketCap": info.get('marketCap'),
                "currentPrice": current_price,
                "previousClose": previous_close,
                "change": change,
                "changePercent": change_percent,
                "volume": info.get('volume'),
                "high52Week": info.get('fiftyTwoWeekHigh'),
                "low52Week": info.get('fiftyTwoWeekLow'),
                "beta": info.get('beta'),
                "dividendYield": info.get('dividendYield'),
                "forwardPE": info.get('forwardPE'),
                "trailingPE": info.get('trailingPE'),
                "website": info.get('website'),
                "addedAt": datetime.now()
            }
        except Exception as e:
            raise Exception(f"Error fetching {symbol}: {e}")

    def save_company_info(self, data: dict):
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cursor = conn.cursor()

        sql = """
            INSERT INTO companies
            (symbol, name, sector, industry, currency, exchange, marketCap,
             currentPrice, previousClose, `change`, changePercent, volume,
             high52Week, low52Week, beta, dividendYield, forwardPE, trailingPE,
             website, addedAt)
            VALUES (%(symbol)s, %(name)s, %(sector)s, %(industry)s, %(currency)s, %(exchange)s, %(marketCap)s,
                    %(currentPrice)s, %(previousClose)s, %(change)s, %(changePercent)s, %(volume)s,
                    %(high52Week)s, %(low52Week)s, %(beta)s, %(dividendYield)s, %(forwardPE)s, %(trailingPE)s,
                    %(website)s, %(addedAt)s)
            ON DUPLICATE KEY UPDATE
                name=VALUES(name),
                sector=VALUES(sector),
                industry=VALUES(industry),
                currency=VALUES(currency),
                exchange=VALUES(exchange),
                marketCap=VALUES(marketCap),
                currentPrice=VALUES(currentPrice),
                previousClose=VALUES(previousClose),
                `change`=VALUES(`change`),
                changePercent=VALUES(changePercent),
                volume=VALUES(volume),
                high52Week=VALUES(high52Week),
                low52Week=VALUES(low52Week),
                beta=VALUES(beta),
                dividendYield=VALUES(dividendYield),
                forwardPE=VALUES(forwardPE),
                trailingPE=VALUES(trailingPE),
                website=VALUES(website),
                addedAt=VALUES(addedAt)
        """
        cursor.execute(sql, data)
        conn.commit()
        cursor.close()
        conn.close()

    def fetch_historical_data(self, symbol: str, start_date: str, end_date: str):
        try:
            df = yf.download(symbol, start=start_date, end=end_date, auto_adjust=False)

            if df.empty:
                return {"status": "empty", "message": f"No data found for {symbol} between {start_date} and {end_date}"}

            conn = db_manager.get_connection(config.DB_STOCK_MARKET)
            cursor = conn.cursor()

            for record_date, row in df.iterrows():
                cursor.execute("""
                    INSERT INTO company_price_history (
                        symbol, recordDate, open, high, low, close, volume, createdAt
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        open=VALUES(open),
                        high=VALUES(high),
                        low=VALUES(low),
                        close=VALUES(close),
                        volume=VALUES(volume),
                        createdAt=VALUES(createdAt)
                """, (
                    symbol,
                    record_date.date(),
                    float(row['Open']),
                    float(row['High']),
                    float(row['Low']),
                    float(row['Close']),
                    int(row['Volume']),
                    datetime.now()
                ))

            conn.commit()
            cursor.close()
            conn.close()

            return {"status": "success", "inserted_rows": len(df)}

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching historical data for {symbol}: {str(e)}")


# ✅ Singleton instance
yfinance_service = YFINANCEService()
