import json
import asyncio
import logging
from typing import Dict, List, Set, Any
from datetime import datetime

from .database import get_db_connection
from .engine import run_autonomous_watcher_cycle

logger = logging.getLogger("watcher_manager")

class WatcherManager:
    def __init__(self):
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.sse_subscribers: Set[asyncio.Queue] = set()
        self.running = False

    async def broadcast_event(self, event_type: str, collector_id: str, data: Dict[str, Any]):
        """Broadcasts an SSE event payload to all connected frontend clients."""
        payload = {
            "event_type": event_type,
            "collector_id": collector_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        formatted = f"data: {json.dumps(payload)}\n\n"

        disconnected = set()
        for queue in list(self.sse_subscribers):
            try:
                queue.put_nowait(formatted)
            except Exception:
                disconnected.add(queue)

        for q in disconnected:
            self.sse_subscribers.discard(q)

    async def _collector_watcher_loop(self, collector_id: str):
        """Autonomous loop running periodically for a single collector."""
        logger.info(f"Watcher loop started for collector: {collector_id}")
        while self.running:
            try:
                conn = await get_db_connection()
                async with conn.execute("SELECT * FROM collectors WHERE id = ?", (collector_id,)) as cursor:
                    c_row = await cursor.fetchone()
                async with conn.execute("SELECT rules_json FROM collector_schemas WHERE collector_id = ?", (collector_id,)) as cursor:
                    s_row = await cursor.fetchone()
                await conn.close()

                if not c_row or not s_row:
                    logger.warning(f"Collector {collector_id} or schema missing, exiting loop")
                    break

                collector = dict(c_row)
                schema_rules = json.loads(s_row["rules_json"])
                poll_interval = max(5, collector["current_poll_interval"])

                # Broadcast beat start
                await self.broadcast_event("beat_start", collector_id, {"collector_name": collector["name"], "status": collector["status"]})

                # Run autonomous cycle
                result = await run_autonomous_watcher_cycle(collector, schema_rules)

                # Broadcast cycle finish
                await self.broadcast_event("beat_complete", collector_id, result)

                # Sleep per self-adjusted poll interval
                await asyncio.sleep(poll_interval)

            except asyncio.CancelledError:
                logger.info(f"Watcher loop cancelled for collector: {collector_id}")
                break
            except Exception as e:
                logger.error(f"Error in watcher loop for collector {collector_id}: {e}", exc_info=True)
                await asyncio.sleep(15)

    async def sync_and_start_watchers(self):
        """Fetch all collectors from SQLite and ensure watcher task is running for each."""
        conn = await get_db_connection()
        async with conn.execute("SELECT id FROM collectors") as cursor:
            rows = await cursor.fetchall()
        await conn.close()

        current_ids = {row["id"] for row in rows}

        # Cancel tasks for removed collectors
        for cid in list(self.active_tasks.keys()):
            if cid not in current_ids:
                self.active_tasks[cid].cancel()
                del self.active_tasks[cid]

        # Start tasks for new collectors
        for cid in current_ids:
            if cid not in self.active_tasks or self.active_tasks[cid].done():
                task = asyncio.create_task(self._collector_watcher_loop(cid))
                self.active_tasks[cid] = task

    async def start(self):
        self.running = True
        await self.sync_and_start_watchers()
        logger.info("Watcher Manager service started.")

    async def stop(self):
        self.running = False
        for cid, task in self.active_tasks.items():
            task.cancel()
        self.active_tasks.clear()
        logger.info("Watcher Manager service stopped.")

watcher_manager = WatcherManager()
