import logging
import os
import time
from typing import Any, Dict, Iterable, List, Optional

import requests

logger = logging.getLogger(__name__)

DEFAULT_BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000/vap").rstrip("/")
FORMULA_REFRESH_PATH = "/formula/run-formula-engine"


def trigger_backend_formula_refresh(
    trigger_source: str,
    trade_date: Optional[str] = None,
    timeout_seconds: int = 900,
) -> Dict[str, Any]:
    """Run backend formula engine for a PR bhavcopy trade date."""
    url = f"{DEFAULT_BACKEND_BASE_URL}{FORMULA_REFRESH_PATH}"
    started_at = time.perf_counter()
    payload: Dict[str, Any] = {"trigger_source": trigger_source}

    if trade_date:
        payload["trade_date"] = trade_date

    try:
        logger.info(
            "Triggering backend formula refresh from %s for trade_date=%s",
            trigger_source,
            trade_date or "latest",
        )
        response = requests.post(url, json=payload, timeout=timeout_seconds)
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
            return {
                "success": True,
                "status_code": response.status_code,
                "duration_seconds": duration_seconds,
                "response": body,
            }

        logger.warning(
            "Backend formula refresh returned %s after %ss",
            response.status_code,
            duration_seconds,
        )
        return {
            "success": False,
            "status_code": response.status_code,
            "duration_seconds": duration_seconds,
            "response": body,
        }
    except Exception as error:
        duration_seconds = round(time.perf_counter() - started_at, 3)
        logger.exception(
            "Backend formula refresh failed after %ss: %s",
            duration_seconds,
            error,
        )
        return {
            "success": False,
            "duration_seconds": duration_seconds,
            "error": str(error),
        }


def trigger_backend_formula_refresh_for_dates(
    trigger_source: str,
    trade_dates: Iterable[str],
) -> List[Dict[str, Any]]:
    """Run formulas in chronological order for multiple bhavcopy dates."""
    results: List[Dict[str, Any]] = []

    for trade_date in sorted(set(trade_dates)):
        result = trigger_backend_formula_refresh(trigger_source, trade_date=trade_date)
        result["trade_date"] = trade_date
        results.append(result)

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
