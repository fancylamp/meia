"""OSCAR Tickler/Task Tools"""

import sys
from typing import Optional
from tools import oscar_request


def get_my_ticklers(tool_context, limit: int = 20) -> dict:
    """Get ticklers assigned to the current provider.

    Args:
        limit: Maximum ticklers to return (default 20)

    Returns:
        dict with list of ticklers on success, or error/text on failure
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
        status: Tickler status - A (active), C (completed), D (deleted) (default A)
        priority: Priority filter (optional)
        assignee: Provider ID to filter by assignee (optional)
        patient_id: Patient demographic ID to filter (optional)

    Returns:
        dict with list of matching ticklers on success, or error/text on failure
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
    """Create a new tickler/task.

    Args:
        patient_id: Patient demographic ID
        task_assigned_to: Provider ID to assign the tickler to
        service_date: Service date in YYYY-MM-DD format
        message: Tickler message content
        priority: Priority level - Low, Normal, High (default Normal)

    Returns:
        dict with created tickler on success, or error/text on failure
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
        tickler_ids: List of tickler IDs to complete

    Returns:
        dict with success status on success, or error/text on failure
    """
    resp = oscar_request("POST", "/ws/services/tickler/complete", tool_context.state.get("session_id"),
                         json={"ticklers": tickler_ids})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[complete_ticklers] {result}", flush=True, file=sys.stderr)
    return result


def add_tickler_note(tickler_id: int, patient_id: int, note_text: str, tool_context) -> dict:
    """Add a note to an existing tickler.

    Args:
        tickler_id: Tickler ID to attach the note to
        patient_id: Patient demographic ID
        note_text: The note content

    Returns:
        dict with success status on success, or error/text on failure
    """
    note_data = {
        "note": note_text,
        "noteId": 0,
        "tickler": {"id": int(tickler_id), "demographicNo": int(patient_id)}
    }
    resp = oscar_request("POST", "/ws/services/notes/ticklerSaveNote", tool_context.state.get("session_id"), json=note_data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[add_tickler_note] {result}", flush=True, file=sys.stderr)
    return result


TICKLER_TOOLS = [get_my_ticklers, search_ticklers, create_tickler, complete_ticklers]

TICKLER_TOOL_DESCRIPTIONS = {
    "get_my_ticklers": "Fetching my ticklers...",
    "search_ticklers": "Searching ticklers...",
    "create_tickler": "Creating tickler...",
    "complete_ticklers": "Completing ticklers...",
}
