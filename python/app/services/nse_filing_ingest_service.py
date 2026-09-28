from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
import os
import re
import time
import zipfile
from datetime import date, datetime
from pathlib import Path
from xml.etree import ElementTree as ET

from app.config import config
from app.database.connection import db_manager
from app.services.nse_fetch_service import NseFetchService
from app.utils.cron_decorator import CronJobContext

logger = logging.getLogger(__name__)

FILINGS_DIR = Path(__file__).resolve().parents[2] / "data" / "nse_filings"
RESULTS_PAGE = "https://www.nseindia.com/companies-listing/corporate-filings-financial-results"
INVALID_XBRL = {"", "-", "/", "https://nsearchives.nseindia.com/corporate/xbrl/-"}
RESULTS_CSV_COLUMNS = [
    ("symbol", "SYMBOL"),
    ("companyName", "COMPANY NAME"),
    ("audited", "AUDITED / UNAUDITED"),
    ("cumulative", "CUMULATIVE / NON-CUMULATIVE"),
    ("consolidated", "CONSOLIDATED / NON-CONSOLIDATED"),
    ("indAs", "IND AS / NON IND AS"),
    ("period", "PERIOD"),
    ("toDate", "PERIOD ENDED"),
    ("relatingTo", "RELATING TO"),
    ("xbrl", "XBRL"),
    ("broadCastDate", "BROADCAST DATE/TIME"),
    ("filingDate", "FILING DATE"),
    ("financialYear", "FINANCIAL YEAR"),
    ("isin", "ISIN"),
]


def _local(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _parse_broadcast_stamp(value: str) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    for fmt in ("%d-%b-%Y %H:%M:%S", "%d-%b-%Y %H:%M"):
        try:
            return datetime.strptime(text, fmt).strftime("%d%m%Y%H%M%S")
        except ValueError:
            continue
    digits = re.sub(r"\D", "", text)
    return digits if len(digits) >= 12 else None


def _usable_url(value: str | None) -> str | None:
    url = str(value or "").strip()
    if not url or url in INVALID_XBRL or url.endswith("/-") or url.endswith("xbrl/-"):
        return None
    if url.startswith("//"):
        url = "https:" + url
    if url.startswith("/"):
        url = "https://nsearchives.nseindia.com" + url
    if not url.startswith("http"):
        return None
    return url


AMOUNT_RE = re.compile(
    r"\(?-?\d{1,3}(?:,\d{3})+(?:\.\d+)?\)?|\(?-?\d+\.\d{1,4}\)?|\(\d+\)"
)
_OCR_ENGINE = None


def _get_ocr():
    global _OCR_ENGINE
    if _OCR_ENGINE is False:
        return None
    if _OCR_ENGINE is None:
        try:
            from rapidocr_onnxruntime import RapidOCR

            _OCR_ENGINE = RapidOCR()
        except Exception as exc:
            logger.warning("RapidOCR unavailable: %s", exc)
            _OCR_ENGINE = False
            return None
    return _OCR_ENGINE


def _ocr_page_image(page) -> str:
    ocr = _get_ocr()
    if ocr is None:
        return ""
    try:
        import numpy as np
        import fitz

        pix = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = img[:, :, :3]
        result, _elapsed = ocr(img)
        if not result:
            return ""
        return "\n".join(str(row[1]).strip() for row in result if row and row[1])
    except Exception as exc:
        logger.warning("PDF OCR failed: %s", exc)
        return ""


def _extract_pdf_document(content: bytes) -> dict:
    """Native text plus OCR on scanned pages (Financial_Results_*.pdf inside NSE ZIPs)."""
    pages = []
    try:
        import fitz

        doc = fitz.open(stream=content, filetype="pdf")
        for index in range(doc.page_count):
            page = doc[index]
            text = (page.get_text("text") or "").strip()
            if len(text) < 40:
                text = _ocr_page_image(page)
            pages.append({"page_no": index + 1, "text": text or ""})
        doc.close()
    except Exception as exc:
        logger.warning("PyMuPDF extract failed, falling back to pypdf: %s", exc)
        pages = [{"page_no": 1, "text": _extract_pdf_text(content)}]

    items = []
    full_parts = []
    for page in pages:
        full_parts.append(f"----- page {page['page_no']} -----\n{page['text']}")
        for line_no, raw in enumerate(page["text"].splitlines(), start=1):
            raw = re.sub(r"\s+", " ", raw).strip()
            if len(raw) < 3:
                continue
            amounts = AMOUNT_RE.findall(raw)
            particulars = AMOUNT_RE.sub(" ", raw)
            particulars = re.sub(r"\s+", " ", particulars).strip(" -:|")
            items.append(
                {
                    "page_no": page["page_no"],
                    "line_no": line_no,
                    "raw_line": raw[:2000],
                    "particulars": (particulars or raw)[:500],
                    "amounts": (amounts + [None, None, None, None, None])[:5],
                }
            )
    return {"text": "\n".join(full_parts).strip()[:200000], "items": items}


def _extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages[:20]:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()[:20000]
    except Exception as exc:
        logger.warning("PDF text extract failed: %s", exc)
        return ""


def _extract_xbrl_facts(content: bytes, limit: int = 400) -> list[dict]:
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return []
    skip = {
        "xbrl", "schemaRef", "context", "entity", "identifier", "period",
        "instant", "startDate", "endDate", "scenario", "unit", "measure",
        "divide", "unitNumerator", "unitDenominator",
    }
    facts = []
    for el in root.iter():
        name = _local(el.tag)
        if name in skip or not (el.text and el.text.strip()):
            continue
        facts.append({
            "concept": name[:255],
            "context_ref": (el.attrib.get("contextRef") or "")[:120],
            "unit_ref": (el.attrib.get("unitRef") or "")[:80],
            "decimals": (el.attrib.get("decimals") or "")[:20],
            "value": el.text.strip()[:4000],
        })
        if len(facts) >= limit:
            break
    return facts


class NseFilingIngestService:
    def __init__(self):
        self.nse = NseFetchService()
        self.db_name = config.DB_STOCK_MARKET
        FILINGS_DIR.mkdir(parents=True, exist_ok=True)
        self.ensure_tables()

    def ensure_tables(self):
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS nse_corporate_filings (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                source VARCHAR(40) NOT NULL,
                symbol VARCHAR(30) NOT NULL,
                company_name VARCHAR(255) NULL,
                seq_id VARCHAR(40) NOT NULL,
                period VARCHAR(40) NULL,
                relating_to VARCHAR(80) NULL,
                from_date VARCHAR(40) NULL,
                to_date VARCHAR(40) NULL,
                financial_year VARCHAR(80) NULL,
                audited VARCHAR(40) NULL,
                consolidated VARCHAR(80) NULL,
                broadcast_at VARCHAR(40) NULL,
                filing_date VARCHAR(40) NULL,
                description TEXT NULL,
                xbrl_url TEXT NULL,
                attachment_url TEXT NULL,
                payload_json JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_filing (source, symbol, seq_id, period, to_date)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS nse_filing_files (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                filing_id BIGINT NULL,
                symbol VARCHAR(30) NOT NULL,
                source_url VARCHAR(700) NOT NULL,
                stored_path VARCHAR(500) NULL,
                original_name VARCHAR(255) NULL,
                inner_name VARCHAR(255) NULL,
                mime VARCHAR(80) NULL,
                sha256 CHAR(64) NOT NULL,
                byte_size INT NULL,
                extracted_text LONGTEXT NULL,
                parse_status VARCHAR(20) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_file (sha256, inner_name)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS nse_filing_xbrl_facts (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                file_id BIGINT NOT NULL,
                symbol VARCHAR(30) NOT NULL,
                concept VARCHAR(255) NOT NULL,
                context_ref VARCHAR(120) NULL,
                unit_ref VARCHAR(80) NULL,
                decimals VARCHAR(20) NULL,
                value TEXT NULL,
                INDEX idx_file (file_id),
                INDEX idx_symbol_concept (symbol, concept)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS nse_company_dossier (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(30) NOT NULL,
                source_name VARCHAR(80) NOT NULL,
                category VARCHAR(40) NULL,
                ok TINYINT(1) DEFAULT 0,
                record_count INT DEFAULT 0,
                error_message TEXT NULL,
                payload_json LONGTEXT NULL,
                fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_symbol_source (symbol, source_name)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS nse_filing_pdf_items (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                file_id BIGINT NOT NULL,
                symbol VARCHAR(30) NOT NULL,
                page_no INT NULL,
                line_no INT NULL,
                particulars VARCHAR(500) NULL,
                amount_1 VARCHAR(40) NULL,
                amount_2 VARCHAR(40) NULL,
                amount_3 VARCHAR(40) NULL,
                amount_4 VARCHAR(40) NULL,
                amount_5 VARCHAR(40) NULL,
                raw_line TEXT NULL,
                INDEX idx_pdf_file (file_id),
                INDEX idx_pdf_symbol (symbol)
            )
            """
        )
        conn.commit()
        cur.close()
        conn.close()

    def listed_symbols(self, limit: int = 0) -> list[str]:
        """Full EQUITY_L.csv universe already synced into listed_companies (~2600–3000)."""
        conn = db_manager.get_connection(self.db_name, dict_cursor=True)
        cur = conn.cursor()
        sql = """
            SELECT DISTINCT REPLACE(REPLACE(UPPER(TRIM(symbol)), '.NS', ''), '.BO', '') AS symbol
            FROM listed_companies
            WHERE symbol IS NOT NULL AND TRIM(symbol) <> ''
            ORDER BY symbol
        """
        if limit and int(limit) > 0:
            sql += " LIMIT %s"
            cur.execute(sql, (int(limit),))
        else:
            cur.execute(sql)
        rows = cur.fetchall() or []
        cur.close()
        conn.close()
        symbols = [row["symbol"] for row in rows if row.get("symbol")]
        logger.info("Filing ingest universe: %s listed_companies symbols", len(symbols))
        return symbols

    def fetch_financial_results_csv_rows(self, period: str, from_date: str | None = None, to_date: str | None = None) -> list[dict]:
        """Same feed as the page Download (.csv) button (CFfinancialequity-download).

        No from/to dates = current page table (~3,816 quarterly rows).
        """
        try:
            self.nse.session.get(
                RESULTS_PAGE,
                headers=self.nse.get_headers("https://www.nseindia.com/"),
                timeout_seconds=20,
            )
        except Exception as exc:
            logger.warning("Financial-results page warmup failed: %s", exc)
        endpoint = f"/api/corporates-financial-results?index=equities&period={period}"
        if from_date and to_date:
            endpoint += f"&from_date={from_date}&to_date={to_date}"
        response = self.nse.fetch_optional_json(endpoint, retries=3)
        records = self.nse.extract_records(response["data"]) if response.get("ok") else []
        logger.info(
            "NSE financial-results CSV feed period=%s dates=%s..%s rows=%s ok=%s",
            period,
            from_date or "page",
            to_date or "page",
            len(records),
            response.get("ok"),
        )
        return [row for row in records if isinstance(row, dict)]

    def _write_results_csv(self, period: str, records: list[dict]) -> str:
        FILINGS_DIR.mkdir(parents=True, exist_ok=True)
        path = FILINGS_DIR / f"CFfinancialequity_{period}_{date.today().isoformat()}.csv"
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow([label for _, label in RESULTS_CSV_COLUMNS])
            for row in records:
                writer.writerow([row.get(key, "") for key, _ in RESULTS_CSV_COLUMNS])
        return str(path)

    def _record_to_filing(self, record: dict, period: str) -> dict:
        symbol = str(record.get("symbol") or "").replace(".NS", "").strip().upper()
        xbrl_url = _usable_url(record.get("xbrl"))
        return {
            "source": "financial_results",
            "symbol": symbol,
            "company_name": record.get("companyName"),
            "seq_id": str(record.get("seqNumber") or record.get("params") or "")[:40],
            "period": record.get("period") or period,
            "relating_to": record.get("relatingTo"),
            "from_date": record.get("fromDate"),
            "to_date": record.get("toDate"),
            "financial_year": record.get("financialYear"),
            "audited": record.get("audited"),
            "consolidated": record.get("consolidated"),
            "broadcast_at": record.get("broadCastDate"),
            "filing_date": record.get("filingDate"),
            "description": record.get("resultDescription"),
            "xbrl_url": xbrl_url,
            "attachment_url": xbrl_url,
            "payload": record,
        }

    def ingest_results_csv_feed(
        self,
        periods: list[str] | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        max_files: int = 4,
        limit: int = 0,
        include_dossier: bool = True,
    ) -> dict:
        page_view = not str(from_date or "").strip() or str(from_date).lower() in ("page", "current")
        if page_view:
            periods = periods or ["Quarterly"]
            from_date = None
            to_date = None
        else:
            periods = periods or ["Quarterly", "Annual"]
            to_date = to_date or date.today().strftime("%d-%m-%Y")
        csv_paths = []
        grouped: dict[str, list[dict]] = {}
        inserted_filings = 0
        total_filings = 0

        for period in periods:
            records = self.fetch_financial_results_csv_rows(period, from_date, to_date)
            csv_paths.append(self._write_results_csv(period, records))
            for record in records:
                filing = self._record_to_filing(record, period)
                if not filing["symbol"] or not filing["seq_id"]:
                    continue
                filing_id, inserted = self._upsert_filing(filing)
                total_filings += 1
                if inserted:
                    inserted_filings += 1
                grouped.setdefault(filing["symbol"], []).append({**record, "_filing_id": filing_id})
            time.sleep(0.8)

        symbols = sorted(grouped)
        if limit and int(limit) > 0:
            symbols = symbols[: int(limit)]

        totals = {
            "success": True,
            "source": "nse_financial_results_csv",
            "from_date": from_date,
            "to_date": to_date,
            "csv_paths": csv_paths,
            "symbols": 0,
            "company_count": len(symbols),
            "filings": total_filings,
            "inserted_filings": inserted_filings,
            "dossier_sources": 0,
            "files": 0,
            "facts": 0,
            "skipped_files": 0,
            "failed_downloads": 0,
            "errors": [],
        }

        for idx, symbol in enumerate(symbols, start=1):
            remaining = max_files
            rows = grouped.get(symbol) or []
            rows.sort(key=lambda item: str(item.get("broadCastDate") or ""), reverse=True)
            try:
                if include_dossier:
                    dossier = self.nse.fetch_company_dossier(symbol)
                    totals["dossier_sources"] += self._save_dossier(symbol, dossier)
                for record in rows:
                    if remaining <= 0:
                        break
                    urls = []
                    xbrl_url = _usable_url(record.get("xbrl"))
                    if xbrl_url:
                        urls.append(xbrl_url)
                    urls.extend(self._na_zip_urls(symbol, record.get("broadCastDate")))
                    part = self._download_urls(record.get("_filing_id"), symbol, urls, remaining)
                    totals["files"] += part["files"]
                    totals["facts"] += part["facts"]
                    totals["skipped_files"] += part["skipped"]
                    totals["failed_downloads"] += part["failed"]
                    remaining -= max(
                        part["files"] + part.get("failed", 0) + part.get("skipped", 0),
                        1,
                    )
                totals["symbols"] += 1
                logger.info("[filings-csv] %s/%s %s files_left_budget=%s", idx, len(symbols), symbol, remaining)
            except Exception as exc:
                logger.exception("CSV-feed attachment ingest failed for %s", symbol)
                totals["errors"].append({"symbol": symbol, "error": str(exc)})
            if idx % 25 == 0:
                time.sleep(0.4)

        totals["error_count"] = len(totals["errors"])
        totals["errors"] = totals["errors"][:25]
        return totals

    def _save_dossier(self, symbol: str, dossier: dict) -> int:
        sources = dossier.get("sources") or {}
        if not sources:
            return 0
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        saved = 0
        for name, source in sources.items():
            records = source.get("records") or []
            cur.execute(
                """
                INSERT INTO nse_company_dossier (
                    symbol, source_name, category, ok, record_count, error_message, payload_json
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    category=VALUES(category),
                    ok=VALUES(ok),
                    record_count=VALUES(record_count),
                    error_message=VALUES(error_message),
                    payload_json=VALUES(payload_json),
                    fetched_at=CURRENT_TIMESTAMP
                """,
                (
                    symbol,
                    str(name)[:80],
                    source.get("category"),
                    1 if source.get("ok") else 0,
                    int(source.get("record_count") or len(records) or 0),
                    source.get("error"),
                    json.dumps(records, default=str)[:1000000],
                ),
            )
            saved += 1
        conn.commit()
        cur.close()
        conn.close()
        return saved

    def _upsert_filing(self, row: dict) -> tuple[int, bool]:
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO nse_corporate_filings (
                source, symbol, company_name, seq_id, period, relating_to,
                from_date, to_date, financial_year, audited, consolidated,
                broadcast_at, filing_date, description, xbrl_url, attachment_url, payload_json
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
            ON DUPLICATE KEY UPDATE
                company_name=VALUES(company_name),
                relating_to=VALUES(relating_to),
                xbrl_url=VALUES(xbrl_url),
                attachment_url=VALUES(attachment_url),
                payload_json=VALUES(payload_json),
                id=LAST_INSERT_ID(id)
            """,
            (
                row["source"],
                row["symbol"],
                row.get("company_name"),
                row["seq_id"],
                row.get("period") or "",
                row.get("relating_to"),
                row.get("from_date"),
                row.get("to_date") or "",
                row.get("financial_year"),
                row.get("audited"),
                row.get("consolidated"),
                row.get("broadcast_at"),
                row.get("filing_date"),
                row.get("description"),
                row.get("xbrl_url"),
                row.get("attachment_url"),
                json.dumps(row.get("payload") or {}, default=str),
            ),
        )
        inserted = cur.rowcount == 1
        filing_id = cur.lastrowid
        conn.commit()
        cur.close()
        conn.close()
        return filing_id, inserted

    def _file_exists(self, sha256: str, inner_name: str) -> bool:
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM nse_filing_files WHERE sha256=%s AND inner_name=%s LIMIT 1",
            (sha256, inner_name),
        )
        found = cur.fetchone() is not None
        cur.close()
        conn.close()
        return found

    def _save_file(
        self,
        *,
        filing_id: int | None,
        symbol: str,
        source_url: str,
        original_name: str,
        inner_name: str,
        content: bytes,
        mime: str,
    ) -> dict:
        sha = hashlib.sha256(content).hexdigest()
        lower = inner_name.lower()
        pdf_items = []
        if self._file_exists(sha, inner_name):
            file_id = self._lookup_file_id(sha, inner_name)
            if file_id and lower.endswith(".pdf"):
                parsed = _extract_pdf_document(content)
                self._store_pdf_items(file_id, symbol, parsed["items"])
                self._update_extracted_text(file_id, parsed["text"], "pdf_ocr")
                return {"inserted": False, "facts": len(parsed["items"]), "skipped": True}
            return {"inserted": False, "facts": 0, "skipped": True}

        symbol_dir = FILINGS_DIR / symbol
        symbol_dir.mkdir(parents=True, exist_ok=True)
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", inner_name)[:180] or "file.bin"
        stored = symbol_dir / f"{sha[:12]}_{safe_name}"
        stored.write_bytes(content)

        text = ""
        facts = []
        parse_status = "stored"
        lower = inner_name.lower()
        if lower.endswith(".xml") or mime == "application/xml":
            facts = _extract_xbrl_facts(content)
            text = "\n".join(f"{f['concept']}={f['value']}" for f in facts[:80])
            parse_status = "xbrl" if facts else "xml"
        elif lower.endswith(".pdf"):
            parsed = _extract_pdf_document(content)
            text = parsed["text"]
            pdf_items = parsed["items"]
            parse_status = "pdf_ocr" if pdf_items else "pdf"

        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO nse_filing_files (
                filing_id, symbol, source_url, stored_path, original_name, inner_name,
                mime, sha256, byte_size, extracted_text, parse_status
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                filing_id,
                symbol,
                source_url[:700],
                str(stored),
                original_name[:255],
                inner_name[:255],
                mime[:80],
                sha,
                len(content),
                text[:250000] if text else None,
                parse_status,
            ),
        )
        file_id = cur.lastrowid
        if facts:
            cur.executemany(
                """
                INSERT INTO nse_filing_xbrl_facts (
                    file_id, symbol, concept, context_ref, unit_ref, decimals, value
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                [
                    (
                        file_id,
                        symbol,
                        f["concept"],
                        f["context_ref"],
                        f["unit_ref"],
                        f["decimals"],
                        f["value"],
                    )
                    for f in facts
                ],
            )
        conn.commit()
        cur.close()
        conn.close()
        if pdf_items:
            self._store_pdf_items(file_id, symbol, pdf_items)
        return {"inserted": True, "facts": len(facts) + len(pdf_items), "skipped": False}

    def _lookup_file_id(self, sha256: str, inner_name: str) -> int | None:
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM nse_filing_files WHERE sha256=%s AND inner_name=%s LIMIT 1",
            (sha256, inner_name),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return row[0] if row else None

    def _update_extracted_text(self, file_id: int, text: str, parse_status: str):
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute(
            "UPDATE nse_filing_files SET extracted_text=%s, parse_status=%s WHERE id=%s",
            (text[:250000] if text else None, parse_status, file_id),
        )
        conn.commit()
        cur.close()
        conn.close()

    def _store_pdf_items(self, file_id: int, symbol: str, items: list[dict]):
        if not items:
            return
        conn = db_manager.get_connection(self.db_name)
        cur = conn.cursor()
        cur.execute("DELETE FROM nse_filing_pdf_items WHERE file_id=%s", (file_id,))
        cur.executemany(
            """
            INSERT INTO nse_filing_pdf_items (
                file_id, symbol, page_no, line_no, particulars,
                amount_1, amount_2, amount_3, amount_4, amount_5, raw_line
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            [
                (
                    file_id,
                    symbol,
                    item["page_no"],
                    item["line_no"],
                    item["particulars"],
                    item["amounts"][0],
                    item["amounts"][1],
                    item["amounts"][2],
                    item["amounts"][3],
                    item["amounts"][4],
                    item["raw_line"],
                )
                for item in items
            ],
        )
        conn.commit()
        cur.close()
        conn.close()

    def ingest_local_pdf(self, symbol: str, path: str, source_url: str | None = None) -> dict:
        pdf_path = Path(path)
        content = pdf_path.read_bytes()
        result = self._save_file(
            filing_id=None,
            symbol=str(symbol).upper(),
            source_url=(source_url or str(pdf_path))[:700],
            original_name=pdf_path.name,
            inner_name=pdf_path.name,
            content=content,
            mime="application/pdf",
        )
        result["symbol"] = str(symbol).upper()
        result["path"] = str(pdf_path)
        return result

    def _ingest_bytes(self, filing_id, symbol, url, content, original_name) -> dict:
        stats = {"files": 0, "facts": 0, "skipped": 0}
        name = original_name or os.path.basename(url.split("?")[0]) or "attachment.bin"
        lower = name.lower()
        if lower.endswith(".zip") or content[:2] == b"PK":
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as zf:
                    for info in zf.infolist():
                        if info.is_dir():
                            continue
                        inner = os.path.basename(info.filename)
                        payload = zf.read(info)
                        mime = "application/pdf" if inner.lower().endswith(".pdf") else (
                            "application/xml" if inner.lower().endswith(".xml") else "application/octet-stream"
                        )
                        result = self._save_file(
                            filing_id=filing_id,
                            symbol=symbol,
                            source_url=url,
                            original_name=name,
                            inner_name=inner,
                            content=payload,
                            mime=mime,
                        )
                        if result["skipped"]:
                            stats["skipped"] += 1
                        else:
                            stats["files"] += 1
                            stats["facts"] += result["facts"]
                return stats
            except zipfile.BadZipFile:
                logger.warning("Not a zip: %s", url)

        mime = "application/xml" if lower.endswith(".xml") else (
            "application/pdf" if lower.endswith(".pdf") else "application/octet-stream"
        )
        result = self._save_file(
            filing_id=filing_id,
            symbol=symbol,
            source_url=url,
            original_name=name,
            inner_name=name,
            content=content,
            mime=mime,
        )
        if result["skipped"]:
            stats["skipped"] += 1
        else:
            stats["files"] += 1
            stats["facts"] += result["facts"]
        return stats

    def _download_urls(self, filing_id, symbol, urls, remaining: int) -> dict:
        totals = {"files": 0, "facts": 0, "skipped": 0, "failed": 0}
        for url in urls:
            if remaining <= 0:
                break
            fetched = self.nse.fetch_bytes(url, retries=2, referer=RESULTS_PAGE)
            if not fetched["ok"]:
                totals["failed"] += 1
                continue
            name = os.path.basename(url.split("?")[0])
            part = self._ingest_bytes(filing_id, symbol, url, fetched["data"], name)
            totals["files"] += part["files"]
            totals["facts"] += part["facts"]
            totals["skipped"] += part["skipped"]
            remaining -= max(part["files"], 1)
            time.sleep(0.35)
        return totals

    def _na_zip_urls(self, symbol: str, broadcast_at: str) -> list[str]:
        stamp = _parse_broadcast_stamp(broadcast_at)
        if not stamp:
            return []
        return [
            f"https://nsearchives.nseindia.com/na_attachments/{symbol}_NA_{stamp}_{idx}.zip"
            for idx in (1, 2)
        ]

    def ingest_symbol(
        self,
        symbol: str,
        periods: list[str] | None = None,
        max_files: int = 12,
        include_announcements: bool = False,
    ) -> dict:
        clean = str(symbol or "").replace(".NS", "").strip().upper()
        periods = periods or ["Quarterly", "Annual"]
        remaining = max_files
        summary = {
            "symbol": clean,
            "filings": 0,
            "inserted_filings": 0,
            "files": 0,
            "facts": 0,
            "skipped_files": 0,
            "failed_downloads": 0,
        }

        for period in periods:
            endpoint = (
                f"/api/corporates-financial-results?index=equities"
                f"&symbol={clean}&period={period}"
            )
            response = self.nse.fetch_optional_json(endpoint, retries=2)
            records = self.nse.extract_records(response["data"]) if response["ok"] else []
            time.sleep(0.4)
            for record in records:
                if not isinstance(record, dict):
                    continue
                xbrl_url = _usable_url(record.get("xbrl"))
                attachment_urls = []
                if xbrl_url:
                    attachment_urls.append(xbrl_url)
                attachment_urls.extend(self._na_zip_urls(clean, record.get("broadCastDate")))
                filing_id, inserted = self._upsert_filing(
                    {
                        "source": "financial_results",
                        "symbol": clean,
                        "company_name": record.get("companyName"),
                        "seq_id": str(record.get("seqNumber") or record.get("params") or "")[:40],
                        "period": record.get("period") or period,
                        "relating_to": record.get("relatingTo"),
                        "from_date": record.get("fromDate"),
                        "to_date": record.get("toDate"),
                        "financial_year": record.get("financialYear"),
                        "audited": record.get("audited"),
                        "consolidated": record.get("consolidated"),
                        "broadcast_at": record.get("broadCastDate"),
                        "filing_date": record.get("filingDate"),
                        "description": record.get("resultDescription"),
                        "xbrl_url": xbrl_url,
                        "attachment_url": attachment_urls[0] if attachment_urls else None,
                        "payload": record,
                    }
                )
                summary["filings"] += 1
                if inserted:
                    summary["inserted_filings"] += 1
                if remaining > 0:
                    part = self._download_urls(filing_id, clean, attachment_urls, remaining)
                    summary["files"] += part["files"]
                    summary["facts"] += part["facts"]
                    summary["skipped_files"] += part["skipped"]
                    summary["failed_downloads"] += part["failed"]
                    remaining -= max(
                        part["files"] + part.get("failed", 0) + part.get("skipped", 0),
                        1,
                    )

        if include_announcements:
            response = self.nse.fetch_optional_json(
                f"/api/corporate-announcements?index=equities&symbol={clean}",
                retries=2,
            )
            records = self.nse.extract_records(response["data"]) if response["ok"] else []
            for record in records[: max(max_files, 20)]:
                if not isinstance(record, dict):
                    continue
                url = _usable_url(record.get("attchmntFile"))
                filing_id, inserted = self._upsert_filing(
                    {
                        "source": "announcement",
                        "symbol": clean,
                        "company_name": record.get("sm_name"),
                        "seq_id": str(record.get("seq_id") or "")[:40],
                        "period": "",
                        "relating_to": record.get("desc"),
                        "from_date": None,
                        "to_date": "",
                        "financial_year": None,
                        "audited": None,
                        "consolidated": None,
                        "broadcast_at": record.get("an_dt"),
                        "filing_date": record.get("an_dt"),
                        "description": record.get("attchmntText") or record.get("desc"),
                        "xbrl_url": None,
                        "attachment_url": url,
                        "payload": record,
                    }
                )
                summary["filings"] += 1
                if inserted:
                    summary["inserted_filings"] += 1
                if url and remaining > 0:
                    part = self._download_urls(filing_id, clean, [url], remaining)
                    summary["files"] += part["files"]
                    summary["facts"] += part["facts"]
                    summary["skipped_files"] += part["skipped"]
                    summary["failed_downloads"] += part["failed"]
                    remaining -= part["files"]

        return summary

    def ingest_all(
        self,
        limit: int = 0,
        periods: list[str] | None = None,
        max_files: int = 8,
        include_announcements: bool = False,
        include_dossier: bool = True,
        symbol: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict:
        job_name = "nse_financial_filings_one" if symbol else "nse_financial_filings"
        with CronJobContext(job_name, "nse") as job:
            if symbol:
                part = self.ingest_symbol(
                    symbol,
                    periods=periods,
                    max_files=max_files,
                    include_announcements=include_announcements,
                )
                job.add_record(
                    processed=1,
                    inserted=part.get("inserted_filings", 0) + part.get("files", 0),
                )
                job.set_data(**part)
                return {"success": True, **part}

            totals = self.ingest_results_csv_feed(
                periods=periods,
                from_date=from_date,
                to_date=to_date,
                max_files=max_files,
                limit=limit,
                include_dossier=include_dossier,
            )
            job.add_record(
                processed=totals.get("company_count", 0),
                inserted=totals.get("inserted_filings", 0) + totals.get("files", 0),
            )
            job.set_data(**{k: v for k, v in totals.items() if k != "errors"})
            return totals


def ingest_financial_filings(**kwargs):
    return NseFilingIngestService().ingest_all(**kwargs)
