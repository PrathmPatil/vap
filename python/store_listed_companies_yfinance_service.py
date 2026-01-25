import yfinance as yf
from datetime import datetime
from app.database.connection import db_manager
from app.config import config


# =====================================================
# 1️⃣ ENSURE TABLE EXISTS
# =====================================================
def ensure_companies_table():
    conn = db_manager.get_connection(config.DB_STOCK_MARKET)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            symbol VARCHAR(20) UNIQUE,
            name VARCHAR(255),
            sector VARCHAR(255),
            industry VARCHAR(255),
            exchange VARCHAR(50),
            currency VARCHAR(10),
            marketCap BIGINT,
            currentPrice FLOAT,
            previousClose FLOAT,
            changeValue FLOAT,
            changePercent FLOAT,
            volume BIGINT,
            high52Week FLOAT,
            low52Week FLOAT,
            beta FLOAT,
            trailingPE FLOAT,
            forwardPE FLOAT,
            website VARCHAR(255),
            updatedAt DATETIME
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()


# =====================================================
# 2️⃣ FETCH SYMBOLS FROM DB
# =====================================================
def get_listed_symbols(limit=200):
    conn = db_manager.get_connection(config.DB_STOCK_MARKET)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT symbol 
        FROM listed_companies 
        WHERE symbol IS NOT NULL
        LIMIT %s
    """, (limit,))

    symbols = [row["symbol"] for row in cursor.fetchall()]
    conn.close()

    return symbols


# =====================================================
# 3️⃣ FETCH DATA FROM YFINANCE
# =====================================================
def fetch_company_info(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        price = info.get("currentPrice")
        prev = info.get("previousClose")

        change = price - prev if price and prev else None
        change_pct = (change / prev * 100) if change and prev else None

        return {
            "symbol": symbol,
            "name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "exchange": info.get("exchange"),
            "currency": info.get("currency"),
            "marketCap": info.get("marketCap"),
            "currentPrice": price,
            "previousClose": prev,
            "changeValue": round(change, 2) if change else None,
            "changePercent": round(change_pct, 2) if change_pct else None,
            "volume": info.get("volume"),
            "high52Week": info.get("fiftyTwoWeekHigh"),
            "low52Week": info.get("fiftyTwoWeekLow"),
            "beta": info.get("beta"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "website": info.get("website"),
            "updatedAt": datetime.now()
        }

    except Exception as e:
        print(f"❌ Error fetching {symbol}: {e}")
        return None


# =====================================================
# 4️⃣ SAVE TO MYSQL (UPSERT)
# =====================================================
def save_company(data):
    conn = db_manager.get_connection(config.DB_STOCK_MARKET)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO companies (
            symbol, name, sector, industry, exchange, currency,
            marketCap, currentPrice, previousClose, changeValue,
            changePercent, volume, high52Week, low52Week, beta,
            trailingPE, forwardPE, website, updatedAt
        ) VALUES (
            %(symbol)s, %(name)s, %(sector)s, %(industry)s, %(exchange)s, %(currency)s,
            %(marketCap)s, %(currentPrice)s, %(previousClose)s, %(changeValue)s,
            %(changePercent)s, %(volume)s, %(high52Week)s, %(low52Week)s, %(beta)s,
            %(trailingPE)s, %(forwardPE)s, %(website)s, %(updatedAt)s
        )
        ON DUPLICATE KEY UPDATE
            name=VALUES(name),
            sector=VALUES(sector),
            industry=VALUES(industry),
            exchange=VALUES(exchange),
            currency=VALUES(currency),
            marketCap=VALUES(marketCap),
            currentPrice=VALUES(currentPrice),
            previousClose=VALUES(previousClose),
            changeValue=VALUES(changeValue),
            changePercent=VALUES(changePercent),
            volume=VALUES(volume),
            high52Week=VALUES(high52Week),
            low52Week=VALUES(low52Week),
            beta=VALUES(beta),
            trailingPE=VALUES(trailingPE),
            forwardPE=VALUES(forwardPE),
            website=VALUES(website),
            updatedAt=VALUES(updatedAt)
    """, data)

    conn.commit()
    cursor.close()
    conn.close()


# =====================================================
# 5️⃣ MAIN RUNNER
# =====================================================
def run():
    print("🚀 Starting YFinance Listed Companies Import")

    ensure_companies_table()

    symbols = get_listed_symbols(limit=500)
    print(f"🔎 Found {len(symbols)} symbols")

    for i, symbol in enumerate(symbols, 1):
        print(f"[{i}/{len(symbols)}] Fetching {symbol}")
        data = fetch_company_info(symbol)
        if data:
            save_company(data)

    print("✅ Import completed")


# =====================================================
# ENTRY POINT
# =====================================================
if __name__ == "__main__":
    run()
