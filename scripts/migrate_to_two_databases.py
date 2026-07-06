#!/usr/bin/env python3
"""
Migrate legacy multi-database MySQL layout into two consolidated databases.

Old layout (11 DBs)  ->  New layout (2 DBs)
  bhavcopy_fastapi     ->  bhavcopy_fastapi_newdb
  all other DBs        ->  stock_market_fastapi_bhavcopy_fastapi_newdb

Usage (from vap/python with venv active):
  python ../scripts/migrate_to_two_databases.py --dry-run
  python ../scripts/migrate_to_two_databases.py --mode replace --yes
  python ../scripts/migrate_to_two_databases.py --mode append --yes
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import pymysql
from dotenv import load_dotenv

# Load .env from python folder (same as the app)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
load_dotenv(PROJECT_ROOT / "python" / ".env")

# ---------------------------------------------------------------------------
# Source / target mapping
# ---------------------------------------------------------------------------

OLD_BHAVCOPY_DB = "bhavcopy_fastapi"
NEW_BHAVCOPY_DB = os.getenv("DB_BHAVCOPY", "bhavcopy_fastapi_newdb")

NEW_STOCK_DB = os.getenv(
    "DB_STOCK_MARKET", "stock_market_fastapi_bhavcopy_fastapi_newdb"
)

# Old databases whose tables land in the stock-market DB (except bhavcopy).
OLD_STOCK_SOURCES: Dict[str, Optional[Dict[str, str]]] = {
    "stock_market_fastapi": None,
    "yfinance_data_fastapi": None,
    "screener_data_fastapi": {
        "tables_balance_sheet": "balance_sheet_balance_sheet",
        "tables_cash_flows": "cash_flow_cash_flow",
    },
    "formula_data_fastapi": None,
    "ipo_data_fastapi": None,
    "news_data_fastapi": None,
    "gov_news_data_fastapi": None,
    "bse_data_fastapi": None,
    "bse_indices_fastapi": None,
    "nse_dynamic": None,
}

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")


@dataclass
class TableMigration:
    source_db: str
    source_table: str
    target_db: str
    target_table: str


def connect(db_name: Optional[str] = None) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT,
        database=db_name,
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )


def database_exists(conn: pymysql.connections.Connection, db_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SHOW DATABASES LIKE %s", (db_name,))
        return cur.fetchone() is not None


def list_tables(conn: pymysql.connections.Connection, db_name: str) -> List[str]:
    with conn.cursor() as cur:
        cur.execute(f"SHOW TABLES FROM `{db_name}`")
        key = f"Tables_in_{db_name}"
        return [row[key] for row in cur.fetchall()]


def list_columns(
    conn: pymysql.connections.Connection, db_name: str, table_name: str
) -> List[str]:
    with conn.cursor() as cur:
        cur.execute(f"SHOW COLUMNS FROM `{db_name}`.`{table_name}`")
        return [row["Field"] for row in cur.fetchall()]


def common_columns(
    conn: pymysql.connections.Connection,
    source_db: str,
    source_table: str,
    target_db: str,
    target_table: str,
    target_exists: bool,
) -> List[str]:
    source_cols = list_columns(conn, source_db, source_table)
    if not target_exists:
        return source_cols
    target_cols = set(list_columns(conn, target_db, target_table))
    return [col for col in source_cols if col in target_cols]


def row_count(
    conn: pymysql.connections.Connection, db_name: str, table_name: str
) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) AS c FROM `{db_name}`.`{table_name}`")
        return int(cur.fetchone()["c"])


def build_plan(conn: pymysql.connections.Connection) -> List[TableMigration]:
    plan: List[TableMigration] = []

    if database_exists(conn, OLD_BHAVCOPY_DB):
        for table in list_tables(conn, OLD_BHAVCOPY_DB):
            plan.append(
                TableMigration(
                    source_db=OLD_BHAVCOPY_DB,
                    source_table=table,
                    target_db=NEW_BHAVCOPY_DB,
                    target_table=table,
                )
            )

    for source_db, renames in OLD_STOCK_SOURCES.items():
        if not database_exists(conn, source_db):
            continue
        for table in list_tables(conn, source_db):
            target_table = (
                renames.get(table, table) if renames else table
            )
            plan.append(
                TableMigration(
                    source_db=source_db,
                    source_table=table,
                    target_db=NEW_STOCK_DB,
                    target_table=target_table,
                )
            )

    return plan


def ensure_target_database(conn: pymysql.connections.Connection, db_name: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
            "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        )
    conn.commit()


def migrate_table(
    conn: pymysql.connections.Connection,
    item: TableMigration,
    mode: str,
    dry_run: bool,
    ignore_duplicates: bool,
) -> dict:
    src = f"`{item.source_db}`.`{item.source_table}`"
    dst = f"`{item.target_db}`.`{item.target_table}`"

    source_rows = row_count(conn, item.source_db, item.source_table)
    if source_rows == 0:
        return {
            "status": "skipped",
            "reason": "source empty",
            "source_rows": 0,
            "inserted": 0,
        }

    target_exists = item.target_table in list_tables(conn, item.target_db)
    target_rows = (
        row_count(conn, item.target_db, item.target_table)
        if target_exists
        else 0
    )

    if mode == "skip" and target_rows > 0:
        return {
            "status": "skipped",
            "reason": f"target already has {target_rows} rows",
            "source_rows": source_rows,
            "inserted": 0,
        }

    columns = common_columns(
        conn,
        item.source_db,
        item.source_table,
        item.target_db,
        item.target_table,
        target_exists,
    )
    if not columns:
        return {
            "status": "skipped",
            "reason": "no common columns between source and target",
            "source_rows": source_rows,
            "inserted": 0,
        }

    if dry_run:
        action = "replace" if mode == "replace" and target_exists else mode
        return {
            "status": "dry-run",
            "reason": action,
            "source_rows": source_rows,
            "target_rows": target_rows,
            "columns": len(columns),
            "inserted": source_rows if action in ("replace", "append") else 0,
        }

    started = time.perf_counter()
    cols_sql = ", ".join(f"`{col}`" for col in columns)
    insert_kw = "INSERT IGNORE" if ignore_duplicates else "INSERT"

    with conn.cursor() as cur:
        if not target_exists:
            cur.execute(f"CREATE TABLE {dst} LIKE {src}")
        elif mode == "replace":
            cur.execute(f"TRUNCATE TABLE {dst}")

        cur.execute(
            f"{insert_kw} INTO {dst} ({cols_sql}) SELECT {cols_sql} FROM {src}"
        )
        inserted = cur.rowcount
    conn.commit()

    return {
        "status": "ok",
        "reason": mode,
        "source_rows": source_rows,
        "target_rows_before": target_rows,
        "columns": len(columns),
        "inserted": inserted,
        "seconds": round(time.perf_counter() - started, 2),
    }


def print_plan(plan: List[TableMigration]) -> None:
    print("\nMigration plan:")
    print("-" * 90)
    for item in plan:
        rename = (
            f" -> {item.target_table}"
            if item.source_table != item.target_table
            else ""
        )
        print(
            f"  {item.source_db}.{item.source_table}{rename} "
            f"=> {item.target_db}.{item.target_table}"
        )
    print("-" * 90)
    print(f"Total tables: {len(plan)}\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Migrate old multi-DB MySQL data into two consolidated databases."
    )
    parser.add_argument(
        "--mode",
        choices=["replace", "append", "skip"],
        default="replace",
        help=(
            "replace: truncate target table then copy all rows (default). "
            "append: insert without truncating (may duplicate). "
            "skip: skip tables that already have rows in target."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without writing data.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Required for live migration (ignored with --dry-run).",
    )
    parser.add_argument(
        "--ignore-duplicates",
        action="store_true",
        default=True,
        help="Use INSERT IGNORE to skip duplicate-key rows (default: on).",
    )
    parser.add_argument(
        "--no-ignore-duplicates",
        action="store_false",
        dest="ignore_duplicates",
        help="Fail on duplicate-key conflicts instead of skipping rows.",
    )
    args = parser.parse_args()

    if not args.dry_run and not args.yes:
        print("Refusing to run without --yes. Use --dry-run to preview first.")
        return 1

    print("MySQL migration: legacy DBs -> two consolidated DBs")
    print(f"  host={DB_HOST}:{DB_PORT} user={DB_USER}")
    print(f"  bhavcopy target: {NEW_BHAVCOPY_DB}")
    print(f"  stock target:    {NEW_STOCK_DB}")
    print(f"  mode: {args.mode}  dry_run: {args.dry_run}")

    conn = connect()
    try:
        ensure_target_database(conn, NEW_BHAVCOPY_DB)
        ensure_target_database(conn, NEW_STOCK_DB)

        plan = build_plan(conn)
        if not plan:
            print("No source tables found. Nothing to migrate.")
            return 0

        print_plan(plan)

        ok = 0
        skipped = 0
        failed = 0

        for item in plan:
            label = (
                f"{item.source_db}.{item.source_table} "
                f"-> {item.target_db}.{item.target_table}"
            )
            try:
                result = migrate_table(
                    conn, item, args.mode, args.dry_run, args.ignore_duplicates
                )
                status = result["status"]
                if status in ("ok", "dry-run"):
                    ok += 1
                    extra = (
                        f"inserted={result.get('inserted', 0)} "
                        f"source_rows={result['source_rows']}"
                    )
                    if "seconds" in result:
                        extra += f" in {result['seconds']}s"
                    print(f"[{status.upper()}] {label} ({extra})")
                else:
                    skipped += 1
                    print(f"[SKIP] {label} ({result.get('reason', '')})")
            except Exception as exc:
                failed += 1
                conn.rollback()
                print(f"[FAIL] {label}: {exc}")

        print(
            f"\nDone. ok/dry-run={ok}, skipped={skipped}, failed={failed}"
        )
        return 1 if failed else 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
