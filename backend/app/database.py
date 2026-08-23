import os
import json
import sqlite3
import aiosqlite
from typing import List, Dict, Any, Optional
from datetime import datetime

DB_PATH = os.getenv("DATABASE_PATH", "/tmp/scraper_console.db" if os.environ.get("VERCEL") else os.path.join(os.path.dirname(__file__), "..", "data", "scraper_console.db"))

def get_db_path() -> str:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return DB_PATH

def init_db_sync():
    """Synchronously create tables if they do not exist."""
    db_file = get_db_path()
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS collectors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_url TEXT NOT NULL,
        description TEXT NOT NULL,
        collector_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'healthy',
        current_severity TEXT NOT NULL DEFAULT 'NONE',
        baseline_poll_interval INTEGER NOT NULL DEFAULT 60,
        current_poll_interval INTEGER NOT NULL DEFAULT 60,
        consecutive_healthy_runs INTEGER NOT NULL DEFAULT 0,
        total_heals INTEGER NOT NULL DEFAULT 0,
        last_healed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS collector_schemas (
        collector_id TEXT PRIMARY KEY,
        rules_json TEXT NOT NULL,
        FOREIGN KEY(collector_id) REFERENCES collectors(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS run_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collector_id TEXT NOT NULL,
        run_timestamp TEXT NOT NULL,
        is_valid INTEGER NOT NULL,
        schema_score REAL NOT NULL,
        execution_time_ms REAL NOT NULL,
        data_json TEXT NOT NULL,
        error_message TEXT,
        FOREIGN KEY(collector_id) REFERENCES collectors(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collector_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        step_title TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        diff_summary TEXT,
        prompt_used TEXT,
        attempt_number INTEGER DEFAULT 0,
        poll_interval INTEGER DEFAULT 60,
        created_at TEXT NOT NULL,
        FOREIGN KEY(collector_id) REFERENCES collectors(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS known_good_snapshots (
        collector_id TEXT PRIMARY KEY,
        snapshot_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(collector_id) REFERENCES collectors(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extractor_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collector_id TEXT NOT NULL,
        version_num INTEGER NOT NULL,
        template_spec_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(collector_id) REFERENCES collectors(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()


async def get_db_connection() -> aiosqlite.Connection:
    db_file = get_db_path()
    init_db_sync()
    try:
        from backend.app.seed_data import seed_database_if_empty
        seed_database_if_empty()
    except Exception:
        pass
    conn = await aiosqlite.connect(db_file)
    conn.row_factory = aiosqlite.Row
    return conn
