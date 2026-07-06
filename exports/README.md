# VAP Production Database Export

## Files

| File | Database(s) |
|------|-------------|
| `vap_production_full.sql` | **Both** — use this on production |
| `bhavcopy_db.sql` | `bhavcopy_db` only |
| `stock_market_db.sql` | `stock_market_db` only |

## What's inside `vap_production_full.sql`

```sql
CREATE DATABASE `bhavcopy_db`
CREATE TABLE ...
INSERT INTO ...

CREATE DATABASE `stock_market_db`
CREATE TABLE ...
INSERT INTO ...
```

## How to check the file (before import)

### 1. Open in editor
Search for:
- `CREATE DATABASE \`bhavcopy_db\``
- `CREATE DATABASE \`stock_market_db\``
- `INSERT INTO`

### 2. Import locally and verify

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < "c:\Users\PRATHMESH\Projects\vap\exports\vap_production_full.sql"
```

Then:

```sql
SHOW DATABASES LIKE '%_db';
USE bhavcopy_db;
SHOW TABLES;
SELECT COUNT(*) FROM gl;

USE stock_market_db;
SHOW TABLES;
SELECT COUNT(*) FROM announcements;
SELECT COUNT(*) FROM balance_sheet_balance_sheet;
```

## Production import

```bash
mysql -u root -p < vap_production_full.sql
```

## Production `.env`

```
DB_BHAVCOPY=bhavcopy_db
DB_STOCK_MARKET=stock_market_db

# backend
BHAVCOPY_DB_NAME=bhavcopy_db
STOCK_DB_NAME=stock_market_db
SCREENER_DB_NAME=stock_market_db
YFINANCE_DB_NAME=stock_market_db
IPO_DB_NAME=stock_market_db
ANNOUNCEMENT_DB_NAME=stock_market_db
NSE_DYNAMIC_DB_NAME=stock_market_db
FORMULA_DB_NAME=stock_market_db
```

## Re-generate export

```powershell
cd c:\Users\PRATHMESH\Projects\vap\python
.\.venv\Scripts\python.exe ..\scripts\prepare_production_export.py
```
