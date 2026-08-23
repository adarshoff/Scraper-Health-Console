import json
import sqlite3
from datetime import datetime, timedelta
from .database import get_db_path, init_db_sync

SEED_COLLECTORS = [
    {
        "id": "hn-top-stories",
        "name": "Hacker News Tech Frontpage",
        "target_url": "https://news.ycombinator.com",
        "description": "Extract top stories: title, article url, score points, submitter author, and total comments count.",
        "collector_id": "c_hn_top_stories_v1",
        "baseline_poll_interval": 60,
        "rules": [
            {"name": "title", "required": True, "expected_type": "str", "min_length": 3},
            {"name": "url", "required": True, "expected_type": "url"},
            {"name": "points", "required": False, "expected_type": "int"},
            {"name": "author", "required": False, "expected_type": "str"},
            {"name": "comments", "required": False, "expected_type": "int"}
        ],
        "sample_data": [
            {"title": "Show HN: Open Source Autonomous Scraper Console", "url": "https://github.com/brightdata/scraper-console", "points": 342, "author": "dev_hero", "comments": 89},
            {"title": "Why Web Unlocker & AI Extraction standardizes Scraping", "url": "https://brightdata.com/blog/ai-extraction", "points": 185, "author": "data_guru", "comments": 42},
            {"title": "FastAPI 0.111 Released with Enhanced Async Engine Support", "url": "https://fastapi.tiangolo.com/release-notes", "points": 512, "author": "tiangolo", "comments": 140}
        ]
    },
    {
        "id": "github-trending",
        "name": "GitHub Open Source Trends",
        "target_url": "https://github.com/trending",
        "description": "Extract daily trending repositories: repository name, repository link, description text, star rating count, primary language.",
        "collector_id": "c_gh_trending_repos_v1",
        "baseline_poll_interval": 60,
        "rules": [
            {"name": "name", "required": True, "expected_type": "str", "min_length": 3},
            {"name": "url", "required": True, "expected_type": "url"},
            {"name": "description", "required": False, "expected_type": "str"},
            {"name": "stars", "required": False, "expected_type": "int"},
            {"name": "language", "required": False, "expected_type": "str"}
        ],
        "sample_data": [
            {"name": "brightdata/bdata-cli", "url": "https://github.com/brightdata/bdata-cli", "description": "CLI tool for Bright Data Web Scraper Studio", "stars": 1250, "language": "TypeScript"},
            {"name": "fastapi/fastapi", "url": "https://github.com/fastapi/fastapi", "description": "High performance async framework for building APIs with Python", "stars": 72400, "language": "Python"},
            {"name": "facebook/react", "url": "https://github.com/facebook/react", "description": "The library for web and native user interfaces", "stars": 224000, "language": "JavaScript"}
        ]
    },
    {
        "id": "books-catalog",
        "name": "Books to Scrape Catalog",
        "target_url": "http://books.toscrape.com",
        "description": "Extract bookstore products: title, price in GBP, star rating text, and stock availability status.",
        "collector_id": "c_books_catalog_v1",
        "baseline_poll_interval": 60,
        "rules": [
            {"name": "name", "required": True, "expected_type": "str", "min_length": 3},
            {"name": "price", "required": True, "expected_type": "str"},
            {"name": "rating", "required": False, "expected_type": "str"},
            {"name": "availability", "required": False, "expected_type": "str"}
        ],
        "sample_data": [
            {"name": "A Light in the Attic", "price": "£51.77", "rating": "Three", "availability": "In stock"},
            {"name": "Tipping the Velvet", "price": "£53.74", "rating": "One", "availability": "In stock"},
            {"name": "Soumission", "price": "£50.10", "rating": "One", "availability": "In stock"}
        ]
    }
]

def seed_database_if_empty():
    """Initializes tables and populates default collectors with initial baseline runs."""
    init_db_sync()
    db_file = get_db_path()
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM collectors")
    count = cursor.fetchone()[0]

    if count == 0:
        now = datetime.utcnow()
        for item in SEED_COLLECTORS:
            cid = item["id"]
            now_iso = now.isoformat()

            cursor.execute(
                """
                INSERT INTO collectors (id, name, target_url, description, collector_id, status, current_severity, baseline_poll_interval, current_poll_interval, consecutive_healthy_runs, total_heals, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'healthy', 'NONE', ?, ?, 5, 0, ?, ?)
                """,
                (cid, item["name"], item["target_url"], item["description"], item["collector_id"], item["baseline_poll_interval"], item["baseline_poll_interval"], now_iso, now_iso)
            )

            cursor.execute(
                "INSERT INTO collector_schemas (collector_id, rules_json) VALUES (?, ?)",
                (cid, json.dumps(item["rules"]))
            )

            # Known good snapshot
            cursor.execute(
                "INSERT INTO known_good_snapshots (collector_id, snapshot_json, updated_at) VALUES (?, ?, ?)",
                (cid, json.dumps(item["sample_data"]), now_iso)
            )

            # Seed historical runs over past 2 hours
            for i in range(10):
                hist_time = (now - timedelta(minutes=(10 - i) * 12)).isoformat()
                cursor.execute(
                    """
                    INSERT INTO run_history (collector_id, run_timestamp, is_valid, schema_score, execution_time_ms, data_json)
                    VALUES (?, ?, 1, 1.0, 450.0, ?)
                    """,
                    (cid, hist_time, json.dumps(item["sample_data"]))
                )

            # Seed initial audit log entry
            cursor.execute(
                """
                INSERT INTO audit_logs (collector_id, event_type, severity, step_title, reasoning, poll_interval, created_at)
                VALUES (?, 'beat', 'NONE', 'Collector Initialized', 'Registered collector and saved baseline snapshot.', ?, ?)
                """,
                (cid, item["baseline_poll_interval"], now_iso)
            )

        conn.commit()
    conn.close()
