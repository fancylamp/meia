"""OSCAR Inbox/Labs/Docs Tools"""

import sys
from tools import oscar_request


def get_my_inbox(tool_context, limit: int = 20) -> dict:
    """Get unacknowledged inbox items (labs/docs) for current provider.

    Args:
        limit: Maximum items to return (default 20)

    Returns:
        dict with list of inbox items on success, or error/text on failure
    """
    resp = oscar_request("GET", "/ws/services/inbox/mine", tool_context.state.get("session_id"),
                         params={"limit": limit})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_my_inbox] {result}", flush=True, file=sys.stderr)
    return result


def get_inbox_count(tool_context) -> dict:
    """Get count of unacknowledged inbox items for current provider.

    Returns:
        dict with count on success, or error/text on failure
    """
    resp = oscar_request("GET", "/ws/services/inbox/mine/count", tool_context.state.get("session_id"))
    result = {"count": resp.text} if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_inbox_count] {result}", flush=True, file=sys.stderr)
    return result


INBOX_TOOLS = [get_my_inbox, get_inbox_count]

INBOX_TOOL_DESCRIPTIONS = {
    "get_my_inbox": "Fetching inbox items...",
    "get_inbox_count": "Fetching inbox count...",
}
