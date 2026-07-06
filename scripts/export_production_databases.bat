@echo off
setlocal
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
set HOST=localhost
set PORT=3306
set USER=root
set PASS=Shiv@1110
set OUTDIR=%~dp0..\exports

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo Exporting bhavcopy_fastapi_newdb...
%MYSQL% -h %HOST% -P %PORT% -u %USER% -p%PASS% ^
  --databases bhavcopy_fastapi_newdb ^
  --single-transaction --routines --triggers ^
  --set-gtid-purged=OFF --add-drop-database ^
  > "%OUTDIR%\bhavcopy_fastapi_newdb.sql"
if errorlevel 1 exit /b 1

echo Exporting stock_market_fastapi_bhavcopy_fastapi_newdb...
%MYSQL% -h %HOST% -P %PORT% -u %USER% -p%PASS% ^
  --databases stock_market_fastapi_bhavcopy_fastapi_newdb ^
  --single-transaction --routines --triggers ^
  --set-gtid-purged=OFF --add-drop-database ^
  > "%OUTDIR%\stock_market_fastapi_bhavcopy_fastapi_newdb.sql"
if errorlevel 1 exit /b 1

echo Creating combined production dump...
(
  echo -- VAP production dump: consolidated 2-database layout
  echo -- Generated for import on production MySQL 8.0+
  echo.
  type "%OUTDIR%\bhavcopy_fastapi_newdb.sql"
  echo.
  type "%OUTDIR%\stock_market_fastapi_bhavcopy_fastapi_newdb.sql"
) > "%OUTDIR%\vap_production_full.sql"

echo Done.
dir "%OUTDIR%\*.sql"
