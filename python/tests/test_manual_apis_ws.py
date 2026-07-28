"""
Manual Cron API + WebSocket integration tests.
Run: python tests/test_manual_apis_ws.py
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import requests

try:
    import websockets
except ImportError:
    print("FAIL: websockets package missing — pip install websockets")
    sys.exit(1)

PYTHON_BASE = "http://127.0.0.1:8080"
BACKEND_BASE = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8080/bhavcopy/manual-jobs/ws"

PASS = 0
FAIL = 0
RESULTS: List[Dict[str, Any]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        status = "PASS"
    else:
        FAIL += 1
        status = "FAIL"
    RESULTS.append({"name": name, "status": status, "detail": detail})
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def http(
    method: str,
    url: str,
    *,
    timeout: float = 20,
    expect_status: Optional[List[int]] = None,
    **kwargs,
) -> Tuple[bool, int, Any]:
    expect_status = expect_status or [200]
    try:
        resp = requests.request(method, url, timeout=timeout, **kwargs)
        body: Any
        try:
            body = resp.json()
        except Exception:
            body = resp.text[:300]
        ok = resp.status_code in expect_status
        return ok, resp.status_code, body
    except Exception as exc:
        return False, 0, str(exc)


async def ws_roundtrip() -> Tuple[bool, str]:
    try:
        async with websockets.connect(WS_URL, open_timeout=5) as ws:
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            data = json.loads(msg)
            if data.get("type") != "connected":
                return False, f"expected connected, got {data}"
            await ws.send("ping")
            pong = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
            if pong.get("type") != "pong":
                return False, f"expected pong, got {pong}"
            return True, "connected+pong ok"
    except Exception as exc:
        return False, str(exc)


async def ws_listen_for(
    expected_types: List[str],
    trigger_fn,
    timeout: float = 25,
) -> Tuple[bool, List[str], str]:
    """Connect WS, run trigger_fn, collect events until expected types or timeout."""
    seen: List[str] = []
    try:
        async with websockets.connect(WS_URL, open_timeout=5) as ws:
            # drain connected
            await asyncio.wait_for(ws.recv(), timeout=5)

            # fire HTTP trigger in thread
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, trigger_fn)

            deadline = time.time() + timeout
            while time.time() < deadline:
                remaining = max(0.1, deadline - time.time())
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
                except asyncio.TimeoutError:
                    break
                try:
                    data = json.loads(raw)
                except Exception:
                    continue
                et = data.get("type")
                if et and et != "pong":
                    seen.append(et)
                if any(t in seen for t in expected_types):
                    return True, seen, "got expected event"
            return (
                any(t in seen for t in expected_types),
                seen,
                f"timeout; seen={seen}",
            )
    except Exception as exc:
        return False, seen, str(exc)


def main() -> int:
    print("=" * 60)
    print("Manual Cron API + WebSocket Test Report")
    print("=" * 60)

    # --- health ---
    ok, code, body = http("GET", f"{PYTHON_BASE}/bhavcopy/health")
    record("Python bhavcopy health", ok, f"HTTP {code}")

    ok, code, body = http("GET", f"{BACKEND_BASE}/vap/", expect_status=[200, 404])
    record("Backend reachable", ok or code in (200, 404), f"HTTP {code}")

    # --- WebSocket core ---
    ok, detail = asyncio.run(ws_roundtrip())
    record("WebSocket connect + ping/pong", ok, detail)

    # --- Quick read APIs ---
    ok, code, body = http(
        "GET",
        f"{PYTHON_BASE}/bhavcopy/missing-dates",
        params={"start_date": "2026-07-20", "end_date": "2026-07-24"},
    )
    record(
        "GET /bhavcopy/missing-dates",
        ok and isinstance(body, dict) and "missing_dates" in body,
        f"HTTP {code} missing_count={body.get('missing_count') if isinstance(body, dict) else None}",
    )

    ok, code, body = http(
        "GET",
        f"{PYTHON_BASE}/bhavcopy/status",
        params={"date": "2026-07-20"},
    )
    record("GET /bhavcopy/status?date=2026-07-20", ok, f"HTTP {code}")

    ok, code, body = http(
        "GET",
        f"{PYTHON_BASE}/bhavcopy/generate-url/2026-07-20",
    )
    record(
        "GET /bhavcopy/generate-url/{date}",
        ok and isinstance(body, dict) and "url" in body,
        f"HTTP {code}",
    )

    ok, code, body = http(
        "POST",
        f"{PYTHON_BASE}/bhavcopy/clear-stuck-logs",
        params={"older_than_minutes": 120},
    )
    record("POST /bhavcopy/clear-stuck-logs", ok, f"HTTP {code}")

    # --- New single-date formula route (background ack) ---
    ok, code, body = http(
        "POST",
        f"{PYTHON_BASE}/bhavcopy/run-formulas-for-date/2026-07-20",
        params={"background": "true"},
        timeout=15,
    )
    started = (
        ok
        and isinstance(body, dict)
        and body.get("status") == "STARTED"
        and body.get("track", {}).get("job_name") == "formula_manual_range"
    )
    record(
        "POST /bhavcopy/run-formulas-for-date/{date} background=true",
        started,
        f"HTTP {code} body_status={body.get('status') if isinstance(body, dict) else body}",
    )

    # --- Range formulas background ---
    ok, code, body = http(
        "POST",
        f"{PYTHON_BASE}/bhavcopy/run-formulas-for-range",
        params={
            "start_date": "2026-07-20",
            "end_date": "2026-07-20",
            "background": "true",
        },
        timeout=15,
    )
    record(
        "POST /bhavcopy/run-formulas-for-range background=true",
        ok and isinstance(body, dict) and body.get("status") == "STARTED",
        f"HTTP {code}",
    )

    # --- Fetch date+formulas background (won't re-download if already present) ---
    ok, code, body = http(
        "POST",
        f"{PYTHON_BASE}/bhavcopy/fetch-date-with-formulas/2026-07-20",
        params={"force_refresh": "false", "background": "true"},
        timeout=15,
    )
    record(
        "POST /bhavcopy/fetch-date-with-formulas/{date} background=true",
        ok and isinstance(body, dict) and body.get("status") == "STARTED",
        f"HTTP {code}",
    )

    # --- Fetch range+formulas background ---
    ok, code, body = http(
        "POST",
        f"{PYTHON_BASE}/bhavcopy/fetch-range-with-formulas",
        params={
            "start_date": "2026-07-20",
            "end_date": "2026-07-20",
            "force_refresh": "false",
            "background": "true",
        },
        timeout=15,
    )
    record(
        "POST /bhavcopy/fetch-range-with-formulas background=true",
        ok and isinstance(body, dict) and body.get("status") == "STARTED",
        f"HTTP {code}",
    )

    # --- WebSocket receives job_queued from background spawn ---
    def trigger_bg():
        http(
            "POST",
            f"{PYTHON_BASE}/bhavcopy/run-formulas-for-date/2026-07-20",
            params={"background": "true"},
            timeout=15,
        )

    ok, seen, detail = asyncio.run(
        ws_listen_for(
            ["job_queued", "job_started", "job_progress", "formula_started"],
            trigger_bg,
            timeout=20,
        )
    )
    record(
        "WebSocket receives progress after formula job start",
        ok,
        f"{detail}; events={seen}",
    )

    # --- Other python quick endpoints (catalog) ---
    for name, method, path in [
        ("Market status", "GET", "/indian-market/status"),
        ("IPO scraper NSE", "GET", "/ipo-scraper/fetch/nse"),
    ]:
        ok, code, body = http(method, f"{PYTHON_BASE}{path}", timeout=60)
        # Some may be slow/fail externally — accept 200 or 5xx as "reachable route"
        reachable = code != 0 and code != 404
        record(
            f"{method} {path} ({name})",
            reachable,
            f"HTTP {code}",
        )

    # OpenAPI path check for new route
    ok, code, body = http("GET", f"{PYTHON_BASE}/openapi.json", timeout=15)
    has_route = False
    if ok and isinstance(body, dict):
        paths = body.get("paths") or {}
        has_route = any("run-formulas-for-date" in p for p in paths)
    record(
        "OpenAPI includes /run-formulas-for-date",
        has_route,
        f"HTTP {code}",
    )

    print("=" * 60)
    print(f"TOTAL: {PASS} passed, {FAIL} failed, {PASS + FAIL} total")
    print("=" * 60)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
