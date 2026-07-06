import pymysql

conn = pymysql.connect(host="localhost", user="root", password="Shiv@1110", port=3306)
cur = conn.cursor()

pairs = [
    ("bhavcopy_fastapi", "bc", "bhavcopy_fastapi_newdb", "bc"),
    ("bhavcopy_fastapi", "gl", "bhavcopy_fastapi_newdb", "gl"),
    ("ipo_data_fastapi", "mainboard_data", "stock_market_fastapi_bhavcopy_fastapi_newdb", "mainboard_data"),
    ("news_data_fastapi", "announcements", "stock_market_fastapi_bhavcopy_fastapi_newdb", "announcements"),
]

for src_db, src_t, dst_db, dst_t in pairs:
    cur.execute(f"SHOW COLUMNS FROM `{src_db}`.`{src_t}`")
    src_cols = [r[0] for r in cur.fetchall()]
    cur.execute(f"SHOW COLUMNS FROM `{dst_db}`.`{dst_t}`")
    dst_cols = [r[0] for r in cur.fetchall()]
    print(f"\n{src_db}.{src_t} ({len(src_cols)} cols) vs {dst_db}.{dst_t} ({len(dst_cols)} cols)")
    print("  only in source:", [c for c in src_cols if c not in dst_cols][:10])
    print("  only in target:", [c for c in dst_cols if c not in src_cols][:10])

cur.execute("SHOW INDEX FROM `news_data_fastapi`.`announcements` WHERE Non_unique=0")
print("\nannouncements unique indexes:", cur.fetchall())
cur.execute(
    "SELECT `subject`, COUNT(*) AS c FROM `news_data_fastapi`.`announcements` "
    "GROUP BY `subject` HAVING c > 1 LIMIT 5"
)
print("duplicate subjects in source:", cur.fetchall())
