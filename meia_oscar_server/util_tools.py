"""Utility Tools"""

from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Los_Angeles")


def get_current_datetime(tool_context) -> dict:
    """Get the current date and time.

    Returns:
        dict with date (YYYY-MM-DD), time (HH:MM:SS), datetime (ISO format), timestamp (Unix)
    """
    now = datetime.now(TZ)
    return {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "datetime": now.isoformat(),
        "timestamp": int(now.timestamp()),
    }


UTIL_TOOLS = [get_current_datetime]

UTIL_TOOL_DESCRIPTIONS = {
    "get_current_datetime": "Getting current date and time...",
}
