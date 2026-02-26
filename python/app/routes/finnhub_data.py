from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.finnhub_data_service import (
    get_stock_free_data,
    get_market_free_data
)
from app.config import config
from app.database.connection import db_manager
import pymysql


router = APIRouter()

# @router.get("/stock/{symbol}")
# def stock_data(symbol: str):
#     try: 
#         # get stock mekrt keys from STOCK_MERKET_FASTAPI listed_comapneis and get all companies data and return in single time.
#         data = get_stock_free_data(symbol.upper())
#         return {
#             "success": True,
#             "symbol": symbol.upper(),
#             "data": data
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks")
def fetch_stocks_from_db(limit: Optional[int] = Query(None)):
    conn = None
    cur = None

    try:
        # ✅ 1️⃣ Get DB connection
        conn = db_manager.get_connection(config.DB_STOCK_MARKET)
        cur = conn.cursor(pymysql.cursors.DictCursor)

        # ✅ 2️⃣ Build Query
        query = "SELECT symbol FROM listed_companies"
        if limit:
            query += f" LIMIT {limit}"

        # ✅ 3️⃣ Execute Query
        cur.execute(query)

        symbols = [r["symbol"] for r in cur.fetchall()]

        if not symbols:
            raise HTTPException(status_code=404, detail="No symbols found")

        results = []

        # ✅ 4️⃣ Loop one by one
        for symbol in symbols:
            try:
                stock_data = get_stock_free_data(symbol)

                results.append({
                    "symbol": symbol,
                    "market_data": stock_data
                })

            except Exception as e:
                results.append({
                    "symbol": symbol,
                    "error": str(e)
                })

        return {
            "success": True,
            "total_symbols": len(symbols),
            "data": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market")
def market_data():
    try:
        data = get_market_free_data()
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))