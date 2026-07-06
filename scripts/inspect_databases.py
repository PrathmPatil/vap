import pymysql

conn = pymysql.connect(host="localhost", user="root", password="Shiv@1110", port=3306)
cur = conn.cursor()

old_dbs = [
    "bhavcopy_fastapi",
    "screener_data_fastapi",
    "formula_data_fastapi",
    "ipo_data_fastapi",
    "news_data_fastapi",
    "gov_news_data_fastapi",
    "nse_dynamic",
    "bse_data_fastapi",
    "bse_indices_fastapi",
]
new_dbs = [
    "bhavcopy_fastapi_newdb",
    "stock_market_fastapi_bhavcopy_fastapi_newdb",
]

for db in old_dbs + new_dbs:
    try:
        cur.execute(f"SHOW TABLES FROM `{db}`")
        tables = [r[0] for r in cur.fetchall()]
        suffix = "..." if len(tables) > 8 else ""
        print(f"{db}: {len(tables)} tables -> {tables[:8]}{suffix}")
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM `{db}`.`{t}`")
            count = cur.fetchone()[0]
            if count:
                print(f"  {t}: {count} rows")
    except Exception as e:
        print(f"{db}: ERROR {e}")
