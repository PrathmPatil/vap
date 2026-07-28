import logging
import os
import threading
import time
from typing import Any, Dict, Iterable, List, Optional

import requests

logger = logging.getLogger(__name__)

DEFAULT_BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000/vap").rstrip("/")
FORMULA_REFRESH_PATH = "/formula/run-formula-engine"

# Serialize Python→Node formula calls. Concurrent daily/manual/range jobs
# otherwise stampede the Node DB pool and hang forever in running_formulas.
_formula_refresh_lock = threading.Lock()


def _formula_timeout_seconds() -> int:
    try:
        return max(120, int(os.getenv("FORMULA_REFRESH_TIMEOUT_SECONDS", "600")))
    except ValueError:
        return 600


def _formula_max_retries() -> int:
    try:
        return max(1, int(os.getenv("FORMULA_REFRESH_RETRIES", "3")))
    except ValueError:
        return 3


def _formula_auth_headers() -> Dict[str, str]:
    """Headers so Node accepts the Python→backend formula call."""
    headers = {"Content-Type": "application/json"}
    api_key = (
        os.getenv("INTERNAL_API_KEY")
        or os.getenv("BACKEND_INTERNAL_API_KEY")
        or ""
    ).strip()
    if api_key:
        headers["X-Internal-Api-Key"] = api_key
        return headers

    bearer = (
        os.getenv("BACKEND_FORMULA_BEARER_TOKEN")
        or os.getenv("BACKEND_AUTH_TOKEN")
        or ""
    ).strip()
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"

    return headers


def _is_retryable_error(error: Exception) -> bool:
    msg = str(error).lower()
    return any(
        token in msg
        for token in (
            "timed out",
            "timeout",
            "connection aborted",
            "connection reset",
            "connection refused",
            "failed to establish",
            "10054",
            "10061",
            "remotely closed",
        )
    )


def trigger_backend_formula_refresh(
    trigger_source: str,
    trade_date: Optional[str] = None,
    timeout_seconds: Optional[int] = None,
    job_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run backend formula engine for a PR bhavcopy trade date (with retries)."""
    wait_timeout = max(
        timeout_seconds or _formula_timeout_seconds(),
        _formula_timeout_seconds(),
    )
    acquired = _formula_refresh_lock.acquire(timeout=wait_timeout)
    if not acquired:
        return {
            "success": False,
            "error": (
                "Timed out waiting for formula engine lock "
                "(another job is already running formulas)"
            ),
            "trade_date": trade_date,
        }
    try:
        return _trigger_backend_formula_refresh_unlocked(
            trigger_source,
            trade_date=trade_date,
            timeout_seconds=timeout_seconds,
            job_meta=job_meta,
        )
    finally:
        _formula_refresh_lock.release()


def _trigger_backend_formula_refresh_unlocked(
    trigger_source: str,
    trade_date: Optional[str] = None,
    timeout_seconds: Optional[int] = None,
    job_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    from app.services.manual_job_hub import manual_job_hub

    url = f"{DEFAULT_BACKEND_BASE_URL}{FORMULA_REFRESH_PATH}"
    started_at = time.perf_counter()
    payload: Dict[str, Any] = {"trigger_source": trigger_source}
    timeout = timeout_seconds or _formula_timeout_seconds()
    max_retries = _formula_max_retries()
    meta = job_meta or {}

    if trade_date:
        payload["trade_date"] = trade_date

    headers = _formula_auth_headers()
    if "X-Internal-Api-Key" not in headers and "Authorization" not in headers:
        logger.warning(
            "No INTERNAL_API_KEY / BACKEND_FORMULA_BEARER_TOKEN set — "
            "formula refresh will likely get 401"
        )

    last_error: Optional[str] = None
    last_body: Any = None
    last_status: Optional[int] = None

    for attempt in range(1, max_retries + 1):
        manual_job_hub.emit(
            "formula_started",
            trigger_source=trigger_source,
            trade_date=trade_date,
            attempt=attempt,
            max_attempts=max_retries,
            **meta,
        )
        try:
            logger.info(
                "Triggering backend formula refresh from %s for trade_date=%s "
                "(attempt %s/%s, timeout=%ss)",
                trigger_source,
                trade_date or "latest",
                attempt,
                max_retries,
                timeout,
            )
            response = requests.post(
                url, json=payload, headers=headers, timeout=timeout
            )
            duration_seconds = round(time.perf_counter() - started_at, 3)

            try:
                body = response.json()
            except ValueError:
                body = {"raw": response.text}

            if response.ok:
                logger.info(
                    "Backend formula refresh finished in %ss (status=%s, trade_date=%s)",
                    duration_seconds,
                    response.status_code,
                    body.get("trade_date"),
                )
                manual_job_hub.emit(
                    "formula_completed",
                    trigger_source=trigger_source,
                    trade_date=trade_date or body.get("trade_date"),
                    attempt=attempt,
                    duration_seconds=duration_seconds,
                    success=True,
                    **meta,
                )
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "duration_seconds": duration_seconds,
                    "attempts": attempt,
                    "response": body,
                }

            last_status = response.status_code
            last_body = body
            # Retry 502/503/504; do not retry 401/403/400
            if response.status_code in (502, 503, 504) and attempt < max_retries:
                logger.warning(
                    "Formula refresh HTTP %s on attempt %s — retrying in 10s",
                    response.status_code,
                    attempt,
                )
                time.sleep(10)
                continue

            logger.warning(
                "Backend formula refresh returned %s after %ss: %s",
                response.status_code,
                duration_seconds,
                body,
            )
            manual_job_hub.emit(
                "formula_failed",
                trigger_source=trigger_source,
                trade_date=trade_date,
                attempt=attempt,
                duration_seconds=duration_seconds,
                success=False,
                status_code=response.status_code,
                error=str(body),
                **meta,
            )
            return {
                "success": False,
                "status_code": response.status_code,
                "duration_seconds": duration_seconds,
                "attempts": attempt,
                "response": body,
            }
        except Exception as error:
            last_error = str(error)
            duration_seconds = round(time.perf_counter() - started_at, 3)
            if _is_retryable_error(error) and attempt < max_retries:
                wait = min(30, 5 * attempt)
                logger.warning(
                    "Formula refresh attempt %s failed (%s) — retry in %ss",
                    attempt,
                    error,
                    wait,
                )
                time.sleep(wait)
                continue

            logger.exception(
                "Backend formula refresh failed after %ss: %s",
                duration_seconds,
                error,
            )
            manual_job_hub.emit(
                "formula_failed",
                trigger_source=trigger_source,
                trade_date=trade_date,
                attempt=attempt,
                duration_seconds=duration_seconds,
                success=False,
                error=last_error,
                **meta,
            )
            return {
                "success": False,
                "duration_seconds": duration_seconds,
                "attempts": attempt,
                "error": last_error,
            }

    return {
        "success": False,
        "status_code": last_status,
        "duration_seconds": round(time.perf_counter() - started_at, 3),
        "attempts": max_retries,
        "error": last_error,
        "response": last_body,
    }


def trigger_backend_formula_refresh_for_dates(
    trigger_source: str,
    trade_dates: Iterable[str],
    context: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    """Run formulas in chronological order for multiple bhavcopy dates."""
    results: List[Dict[str, Any]] = []
    dates = sorted(set(trade_dates))
    total = len(dates)

    job_meta: Dict[str, Any] = {}
    if context is not None:
        job_meta = {
            "log_id": getattr(context, "log_id", None),
            "job_name": getattr(context, "job_name", None),
            "job_group": getattr(context, "job_group", None),
        }

    for index, trade_date in enumerate(dates, start=1):
        if context is not None and hasattr(context, "flush_progress"):
            context.flush_progress(
                phase="running_formulas",
                trade_date=trade_date,
                formula_index=index,
                formula_total=total,
            )
        result = trigger_backend_formula_refresh(
            trigger_source,
            trade_date=trade_date,
            job_meta={**job_meta, "formula_index": index, "formula_total": total},
        )
        result["trade_date"] = trade_date
        results.append(result)
        # Brief pause so Node can GC between heavy formula runs
        time.sleep(2)

    return results


def extract_trade_dates_from_bhavcopy_results(results: List[Dict[str, Any]]) -> List[str]:
    """Collect successful bhavcopy trade dates that stored PR data."""
    trade_dates: List[str] = []

    for item in results or []:
        if item.get("status") != "SUCCESS":
            continue

        data = item.get("data") or {}
        if data.get("pr", {}).get("status") not in ("SUCCESS", "ALREADY_EXISTS"):
            continue

        trade_date = item.get("date")
        if trade_date:
            trade_dates.append(trade_date)

    return trade_dates


def get_latest_pr_trade_date() -> Optional[str]:
    """Latest weekday with PR/eq data in bhavcopy DB (today first, look back 30 days)."""
    from datetime import datetime, timedelta
    from app.services.bhavcopy_service import bhavcopy_service

    today = datetime.now().date()
    for days_back in range(30):
        day = today - timedelta(days=days_back)
        if day.weekday() >= 5:
            continue
        date_obj = datetime.combine(day, datetime.min.time())
        if bhavcopy_service.is_trade_date_processed(date_obj):
            return str(day)
    return None


def list_pr_trade_dates_in_range(start_date: str, end_date: str) -> List[str]:
    """Weekdays in range that already have PR/eq bhavcopy in DB."""
    from datetime import datetime, timedelta
    from app.services.bhavcopy_service import bhavcopy_service

    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    dates: List[str] = []
    cursor = start
    while cursor <= end:
        if cursor.weekday() < 5 and bhavcopy_service.is_trade_date_processed(cursor):
            dates.append(str(cursor.date()))
        cursor += timedelta(days=1)
    return dates
