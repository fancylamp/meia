"""OSCAR Inbox/Labs/Docs Tools"""

from tools import oscar_request, handle_response


def get_my_inbox(tool_context, limit: int = 20) -> dict:
    """Get unacknowledged inbox items (labs, documents, reports) for current provider.

    Args:
        limit: Maximum items to return (default 20)

    Returns:
        dict with array of inbox items, each containing:
        id, type (LAB/DOC), demographicNo, demographicName, description, dateReceived, status
    """
    resp = oscar_request("GET", "/ws/services/inbox/mine", tool_context.state.get("session_id"),
                         params={"limit": limit})
    return handle_response(resp, "get_my_inbox")


def get_inbox_count(tool_context) -> dict:
    """Get count of unacknowledged inbox items for current provider.

    Returns:
        dict with count (integer) of pending inbox items requiring review
    """
    resp = oscar_request("GET", "/ws/services/inbox/mine/count", tool_context.state.get("session_id"))
    return {"count": resp.text} if resp.ok else {"error": resp.status_code, "text": resp.text}


INBOX_TOOLS = [get_my_inbox, get_inbox_count]

INBOX_TOOL_DESCRIPTIONS = {
    "get_my_inbox": "Fetching inbox items...",
    "get_inbox_count": "Fetching inbox count...",
}
