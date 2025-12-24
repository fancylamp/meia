"""OSCAR Tickler/Task Tools"""

import sys
from typing import Optional
from tools import oscar_request


def get_my_ticklers(tool_context, limit: int = 20) -> dict:
    """Get active ticklers/tasks assigned to the current provider.

    Args:
        limit: Maximum ticklers to return (default 20)

    Returns:
        dict with array of ticklers, each containing:
        id, demographicNo, demographicName, message, priority, status,
        serviceDate, creator, creatorName, taskAssignedTo, taskAssignedToName
    """
    resp = oscar_request("GET", "/ws/services/tickler/mine", tool_context.state.get("session_id"),
                         params={"limit": limit})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_my_ticklers] {result}", flush=True, file=sys.stderr)
    return result


def search_ticklers(tool_context, status: Optional[str] = "A", priority: Optional[str] = None,
                    assignee: Optional[str] = None, patient_id: Optional[int] = None) -> dict:
    """Search ticklers with filters.

    Args:
        status: Tickler status filter:
            "A" - Active (default)
            "C" - Completed
            "D" - Deleted
        priority: Priority filter - "Low", "Normal", "High" (optional)
        assignee: Provider ID to filter by assignee (optional)
        patient_id: Patient demographic ID to filter (optional)

    Returns:
        dict with content array of matching ticklers and total count
    """
    data = {}
    if status:
        data["status"] = status
    if priority:
        data["priority"] = priority
    if assignee:
        data["assignee"] = assignee
    if patient_id:
        data["demographicNo"] = str(patient_id)

    resp = oscar_request("POST", "/ws/services/tickler/search", tool_context.state.get("session_id"),
                         params={"startIndex": 0, "limit": 50}, json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[search_ticklers] {result}", flush=True, file=sys.stderr)
    return result


def create_tickler(patient_id: int, task_assigned_to: str, service_date: str, message: str, tool_context,
                   priority: str = "Normal") -> dict:
    """Create a new tickler/task reminder.

    Args:
        patient_id: Patient demographic ID
        task_assigned_to: Provider ID to assign the tickler to (use get_current_provider for self)
        service_date: Due/service date in YYYY-MM-DD format
        message: Tickler message/reminder content
        priority: Priority level - "Low", "Normal" (default), "High"

    Returns:
        dict with success: true on success. Note: tickler ID not returned, use search to find.
    """
    data = {
        "demographicNo": patient_id,
        "taskAssignedTo": task_assigned_to,
        "serviceDate": service_date,
        "message": message,
        "priority": priority,
        "status": "A"
    }
    resp = oscar_request("POST", "/ws/services/tickler/add", tool_context.state.get("session_id"), json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[create_tickler] {result}", flush=True, file=sys.stderr)
    return result


def complete_ticklers(tickler_ids: list, tool_context) -> dict:
    """Mark ticklers as completed.

    Args:
        tickler_ids: List of tickler IDs to mark complete (e.g., [1, 2, 3])

    Returns:
        dict with success status
    """
    resp = oscar_request("POST", "/ws/services/tickler/complete", tool_context.state.get("session_id"),
                         json={"ticklers": tickler_ids})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[complete_ticklers] {result}", flush=True, file=sys.stderr)
    return result


TICKLER_TOOLS = [get_my_ticklers, search_ticklers, create_tickler, complete_ticklers]

TICKLER_TOOL_DESCRIPTIONS = {
    "get_my_ticklers": "Fetching my ticklers...",
    "search_ticklers": "Searching ticklers...",
    "create_tickler": "Creating tickler...",
    "complete_ticklers": "Completing ticklers...",
}
