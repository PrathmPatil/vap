"""Unit tests for ManualJobHub (no live server required)."""
from __future__ import annotations

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.manual_job_hub import ManualJobHub


class ManualJobHubTests(unittest.IsolatedAsyncioTestCase):
    async def test_connect_sends_connected(self):
        hub = ManualJobHub()
        ws = MagicMock()
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()

        await hub.connect(ws)

        ws.accept.assert_awaited_once()
        ws.send_json.assert_awaited()
        payload = ws.send_json.await_args.args[0]
        self.assertEqual(payload["type"], "connected")
        self.assertIn(ws, hub._connections)

    async def test_disconnect_removes_client(self):
        hub = ManualJobHub()
        ws = MagicMock()
        hub._connections.add(ws)
        hub.disconnect(ws)
        self.assertNotIn(ws, hub._connections)

    def test_emit_without_loop_is_safe(self):
        hub = ManualJobHub()
        # Should not raise when loop is missing
        hub.emit("job_queued", job_label="test")

    async def test_emit_broadcasts_to_clients(self):
        hub = ManualJobHub()
        loop = asyncio.get_running_loop()
        hub.set_loop(loop)

        ws = MagicMock()
        ws.send_json = AsyncMock()
        hub._connections.add(ws)

        hub.emit("job_started", job_name="formula_manual_range", log_id=1)
        await asyncio.sleep(0.05)

        ws.send_json.assert_awaited()
        payload = ws.send_json.await_args.args[0]
        self.assertEqual(payload["type"], "job_started")
        self.assertEqual(payload["job_name"], "formula_manual_range")


if __name__ == "__main__":
    unittest.main()
