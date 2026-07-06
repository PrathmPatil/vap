#!/usr/bin/env python3
"""Copy consolidated DBs to clean production names and export SQL dump."""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

import pymysql
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / "python" / ".env")

HOST = os.getenv("DB_HOST", "localhost")
PORT = int(os.getenv("DB_PORT", "3306"))
USER = os.getenv("DB_USER", "root")
PASSWORD = os.getenv("DB_PASSWORD", "")

SOURCE_BHAVCOPY = os.getenv("DB_BHAVCOPY", "bhavcopy_fastapi_newdb")
SOURCE_STOCK = os.getenv("DB_STOCK_MARKET", "stock_market_fastapi_bhavcopy_fastapi_newdb")

TARGET_BHAVCOPY = "bhavcopy_db"
TARGET_STOCK = "stock_market_db"

MYSQLDUMP = r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
EXPORT_DIR = Path(__file__).resolve().parent.parent / "exports"


def connect(db=None):
    return pymysql.connect(
        host=HOST,
        user=USER,
        password=PASSWORD,
        port=PORT,
        database=db,
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )


def ensure_db(conn, name: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{name}` "
            "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        )
    conn.commit()


def list_tables(conn, db: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(f"SHOW TABLES FROM `{db}`")
        key = f"Tables_in_{db}"
        return [row[key] for row in cur.fetchall()]


def common_columns(conn, src_db, src_t, dst_db, dst_t, dst_exists) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(f"SHOW COLUMNS FROM `{src_db}`.`{src_t}`")
        src = [r["Field"] for r in cur.fetchall()]
        if not dst_exists:
            return src
        cur.execute(f"SHOW COLUMNS FROM `{dst_db}`.`{dst_t}`")
        dst = {r["Field"] for r in cur.fetchall()}
    return [c for c in src if c in dst]


def copy_database(conn, source_db: str, target_db: str) -> None:
    ensure_db(conn, target_db)
    tables = list_tables(conn, source_db)
    print(f"\n{source_db} -> {target_db} ({len(tables)} tables)")

    for table in tables:
        dst_exists = table in list_tables(conn, target_db)
        cols = common_columns(conn, source_db, table, target_db, table, dst_exists)
        if not cols:
            print(f"  [SKIP] {table}: no common columns")
            continue

        cols_sql = ", ".join(f"`{c}`" for c in cols)
        src = f"`{source_db}`.`{table}`"
        dst = f"`{target_db}`.`{table}`"

        started = time.perf_counter()
        with conn.cursor() as cur:
            if not dst_exists:
                cur.execute(f"CREATE TABLE {dst} LIKE {src}")
            else:
                cur.execute(f"TRUNCATE TABLE {dst}")
            cur.execute(
                f"INSERT INTO {dst} ({cols_sql}) SELECT {cols_sql} FROM {src}"
            )
            inserted = cur.rowcount
        conn.commit()
        print(f"  [OK] {table}: {inserted} rows ({time.perf_counter()-started:.1f}s)")


def export_database(db_name: str, outfile: Path) -> None:
    cmd = [
        MYSQLDUMP,
        f"-h{HOST}",
        f"-P{PORT}",
        f"-u{USER}",
        f"-p{PASSWORD}",
        "--databases",
        db_name,
        "--single-transaction",
        "--routines",
        "--triggers",
        "--set-gtid-purged=OFF",
        "--add-drop-database",
        f"-r{str(outfile)}",
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    conn = connect()
    try:
        copy_database(conn, SOURCE_BHAVCOPY, TARGET_BHAVCOPY)
        copy_database(conn, SOURCE_STOCK, TARGET_STOCK)
    finally:
        conn.close()

    bhav_file = EXPORT_DIR / "bhavcopy_db.sql"
    stock_file = EXPORT_DIR / "stock_market_db.sql"
    full_file = EXPORT_DIR / "vap_production_full.sql"

    print("\nExporting SQL dumps...")
    export_database(TARGET_BHAVCOPY, bhav_file)
    export_database(TARGET_STOCK, stock_file)

    with open(full_file, "w", encoding="utf-8") as out:
        out.write(
            "-- VAP production dump\n"
            "-- Databases: bhavcopy_db, stock_market_db\n"
            "-- Import: mysql -u root -p < vap_production_full.sql\n\n"
        )
        out.write(bhav_file.read_text(encoding="utf-8"))
        out.write("\n\n")
        out.write(stock_file.read_text(encoding="utf-8"))

    for f in (bhav_file, stock_file, full_file):
        mb = f.stat().st_size / (1024 * 1024)
        print(f"  {f.name}: {mb:.2f} MB")

    print(f"\nDone. Import with:\n  mysql -u root -p < {full_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
