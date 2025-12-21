"""OSCAR Measurement/Vital Signs Tools"""

import sys
from typing import List, Optional
from tools import oscar_request


def get_patient_measurements(patient_id: int, types: List[str], tool_context) -> dict:
    """Get measurements for a patient by type.

    Args:
        patient_id: Patient demographic ID
        types: List of measurement types (e.g., ["ht", "wt", "bp"] for height, weight, blood pressure)

    Returns:
        dict with patient measurements on success, or error/text on failure
    """
    resp = oscar_request("POST", f"/ws/services/measurements/{patient_id}", tool_context.state.get("session_id"), json={"types": types})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_patient_measurements] {result}", flush=True, file=sys.stderr)
    return result


def save_measurement(patient_id: int, measurement_type: str, value: str, date_observed: str,
                     tool_context, comments: Optional[str] = None) -> dict:
    """Save a measurement for a patient.

    Args:
        patient_id: Patient demographic ID
        measurement_type: Type of measurement (e.g., "ht", "wt", "bp")
        value: Measurement value
        date_observed: Date observed in YYYY-MM-DD format (required)
        comments: Additional comments (optional)

    Returns:
        dict with saved measurement on success, or error/text on failure
    """
    data = {"type": measurement_type, "dataField": value, "dateObserved": date_observed}
    if comments:
        data["comments"] = comments

    resp = oscar_request("POST", f"/ws/services/measurements/{patient_id}/save", tool_context.state.get("session_id"), json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[save_measurement] {result}", flush=True, file=sys.stderr)
    return result


MEASUREMENT_TOOLS = [get_patient_measurements, save_measurement]

MEASUREMENT_TOOL_DESCRIPTIONS = {
    "get_patient_measurements": "Fetching patient measurements...",
    "save_measurement": "Saving measurement...",
}
