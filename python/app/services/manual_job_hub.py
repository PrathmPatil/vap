import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket

from app.services.cron_logger_service import _json_safe

logger = logging.getLogger(__name__)


class ManualJobHub:
    """Broadcast manual cron job progress to connected WebSocket clients."""

    def __init__(self):
        self._connections: Set[WebSocket] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        await websocket.send_json(
            self._wrap("connected", {"message": "subscribed to manual job updates"})
        )

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    def _wrap(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **_json_safe(payload),
        }

    async def _broadcast(self, event: Dict[str, Any]) -> None:
        dead = []
        for ws in list(self._connections):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def emit(self, event_type: str, **payload: Any) -> None:
        """Thread-safe broadcast from sync code (cron threads, requests.post, etc.)."""
        event = self._wrap(event_type, payload)
        loop = self._loop
        if loop is None or not loop.is_running():
            logger.warning(
                "ManualJobHub: no event loop — skipped %s (clients=%s)",
                event_type,
                len(self._connections),
            )
            return
        if not self._connections:
            logger.debug("ManualJobHub: emit %s with 0 clients", event_type)
        asyncio.run_coroutine_threadsafe(self._broadcast(event), loop)


manual_job_hub = ManualJobHub()
