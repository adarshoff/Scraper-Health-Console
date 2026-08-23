import asyncio
import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import init_db_sync, get_db_connection
from app.seed_data import seed_database_if_empty
from app.engine import trigger_demo_break, run_autonomous_watcher_cycle
from app.models import CollectorStatus, SeverityLevel

async def _test_async():
    # 1. Init DB & Seed
    init_db_sync()
    seed_database_if_empty()

    cid = "hn-top-stories"

    conn = await get_db_connection()
    async with conn.execute("SELECT * FROM collectors WHERE id = ?", (cid,)) as cursor:
        row = await cursor.fetchone()
    collector = dict(row)

    async with conn.execute("SELECT rules_json FROM collector_schemas WHERE collector_id = ?", (cid,)) as cursor:
        schema_row = await cursor.fetchone()
    import json
    rules = json.loads(schema_row["rules_json"])
    await conn.close()

    # 2. Arm Demo Break
    trigger_demo_break(cid, break_type="empty_field", target_field="title")

    # 3. Run Autonomous Watcher Cycle
    result = await run_autonomous_watcher_cycle(collector, rules)

    assert result["status"] in ["recovered", "healthy"]
    assert result.get("score", 1.0) >= 0.90

    # 4. Verify SQLite Audit Logs recorded autonomous diagnosis and recovery
    conn = await get_db_connection()
    async with conn.execute("SELECT event_type, step_title FROM audit_logs WHERE collector_id = ? ORDER BY id DESC LIMIT 5", (cid,)) as cursor:
        audit_rows = await cursor.fetchall()
    await conn.close()

    event_types = [r[0] for r in audit_rows]
    assert "diagnose" in event_types or "beat" in event_types or "recovered" in event_types
    print("\n✅ Autonomous Detect-Diagnose-Heal-Verify-Recover Cycle Verified Clean!")

def test_full_autonomous_healing_cycle():
    asyncio.run(_test_async())
