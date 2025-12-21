"""OSCAR Notes/Encounter Tools

Uses tickler workaround for saving notes.
Note: get_patient_notes is not available via OAuth API due to OSCAR session requirements.
"""

import sys
from datetime import datetime
from tools import oscar_request


def save_note(patient_id: int, note_text: str, tool_context) -> dict:
    """Save an encounter note for a patient.

    Args:
        patient_id: Patient demographic ID
        note_text: The note content

    Returns:
        dict with success status on success, or error/text on failure
    """
    import uuid
    session_id = tool_context.state.get("session_id")
    unique_marker = f"_temp_{uuid.uuid4().hex[:8]}_"
    
    # Get current provider ID
    resp = oscar_request("GET", "/ws/services/providerService/provider/me", session_id)
    if not resp.ok:
        return {"error": resp.status_code, "text": "Failed to get current provider"}
    provider_no = resp.json().get("providerNo")
    
    # 1. Create temp tickler with unique marker
    tickler_data = {
        "demographicNo": patient_id,
        "taskAssignedTo": provider_no,
        "message": unique_marker,
        "serviceDate": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "priority": "Normal",
        "status": "A"
    }
    resp = oscar_request("POST", "/ws/services/tickler/add", session_id, json=tickler_data)
    if not resp.ok:
        return {"error": resp.status_code, "text": resp.text}
    create_result = resp.json()
    if not create_result.get("success"):
        return {"error": "Tickler creation failed", "details": create_result}
    
    # 2. Search for the tickler we just created
    resp = oscar_request("POST", "/ws/services/tickler/search", session_id,
                         params={"startIndex": 0, "limit": 50},
                         json={"demographicNo": str(patient_id), "status": "A"})
    if not resp.ok:
        return {"error": resp.status_code, "text": resp.text}
    
    tickler_id = None
    for t in resp.json().get("content", []):
        if t.get("message") == unique_marker:
            tickler_id = t.get("id")
            break
    
    if not tickler_id:
        return {"error": "Could not find created tickler", "marker": unique_marker}
    
    # 3. Save note via ticklerSaveNote
    note_data = {
        "note": note_text,
        "noteId": 0,
        "tickler": {"id": int(tickler_id), "demographicNo": int(patient_id)}
    }
    resp = oscar_request("POST", "/ws/services/notes/ticklerSaveNote", session_id, json=note_data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    
    # 4. Complete temp tickler
    oscar_request("POST", "/ws/services/tickler/complete", session_id, json={"ticklers": [int(tickler_id)]})
    
    print(f"[save_note] {result}", flush=True, file=sys.stderr)
    return result


NOTES_TOOLS = [save_note]

NOTES_TOOL_DESCRIPTIONS = {
    "save_note": "Saving encounter note...",
}
