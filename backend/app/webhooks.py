import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("webhooks")

WEBHOOK_URL = os.getenv("WEBHOOK_URL")

async def send_webhook_notification(event_type: str, collector_id: str, collector_name: str, message: str, details: Optional[Dict[str, Any]] = None):
    """
    Sends Slack/Discord formatted webhooks when scraper status changes.
    Fires on 'break', 'recovered', and 'heal_exhausted'.
    """
    if not WEBHOOK_URL:
        logger.info(f"Webhook skipped (WEBHOOK_URL not configured) for event={event_type} collector={collector_id}")
        return

    color_map = {
        "break": 15158332,        # Red / Orange
        "recovered": 3066993,     # Green
        "heal_exhausted": 10038562 # Dark Red / Purple
    }

    color = color_map.get(event_type, 3447003)

    payload = {
        "username": "Scraper Health Console Engine",
        "embeds": [
            {
                "title": f"🚨 Scraper Notification: {event_type.upper()}",
                "description": f"**Collector**: `{collector_name}` (`{collector_id}`)\n\n{message}",
                "color": color,
                "fields": [
                    {
                        "name": "Event Type",
                        "value": event_type,
                        "inline": True
                    },
                    {
                        "name": "Timestamp",
                        "value": details.get("timestamp") if details else "N/A",
                        "inline": True
                    }
                ],
                "footer": {
                    "text": "Bright Data Scraper Studio Autonomous Watcher"
                }
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(WEBHOOK_URL, json=payload, timeout=5.0)
            logger.info(f"Webhook sent: status={res.status_code}")
    except Exception as e:
        logger.error(f"Failed to post webhook: {e}")
