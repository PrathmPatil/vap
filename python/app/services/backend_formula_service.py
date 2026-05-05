import logging
import os
import time
from typing import Any, Dict

import requests

logger = logging.getLogger(__name__)

DEFAULT_BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000/vap").rstrip("/")
FORMULA_REFRESH_PATH = "/formula/run-formula-engine"


def trigger_backend_formula_refresh(trigger_source: str, timeout_seconds: int = 900) -> Dict[str, Any]:
    """Trigger the backend formula engine so formula tables are ready before the UI reads them."""
    url = f"{DEFAULT_BACKEND_BASE_URL}{FORMULA_REFRESH_PATH}"
    started_at = time.perf_counter()

    try:
        logger.info(f"🔄 Triggering backend formula refresh from {trigger_source}")
        response = requests.post(
            url,
            json={"trigger_source": trigger_source},
            timeout=timeout_seconds,
        )

        duration_seconds = round(time.perf_counter() - started_at, 3)

        try:
            payload = response.json()
        except ValueError:
            payload = {"raw": response.text}

        if response.ok:
            logger.info(
                f"✅ Backend formula refresh finished in {duration_seconds}s (status={response.status_code})"
            )
            return {
                "success": True,
                "status_code": response.status_code,
                "duration_seconds": duration_seconds,
                "response": payload,
            }

        logger.warning(
            f"⚠ Backend formula refresh returned {response.status_code} after {duration_seconds}s"
        )
        return {
            "success": False,
            "status_code": response.status_code,
            "duration_seconds": duration_seconds,
            "response": payload,
        }
    except Exception as error:
        duration_seconds = round(time.perf_counter() - started_at, 3)
        logger.exception(
            f"❌ Backend formula refresh failed after {duration_seconds}s: {error}"
        )
        return {
            "success": False,
            "duration_seconds": duration_seconds,
            "error": str(error),
        }