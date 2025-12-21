"""OSCAR Appointment/Scheduling Tools"""

import sys
from typing import Optional
from tools import oscar_request


def get_daily_appointments(date: str, tool_context, provider_no: Optional[str] = None) -> dict:
    """Get appointments for a specific day.

    Args:
        date: Date in YYYY-MM-DD format, or "today" for current date
        provider_no: Provider ID to filter by, or "me" for current user (optional - omit for all providers)

    Returns:
        dict with array of appointments, each containing:
        id, demographicNo, providerNo, appointmentDate, startTime, endTime, duration,
        status, type, reason, notes, demographicName, providerName
    """
    endpoint = f"/ws/services/schedule/{provider_no}/day/{date}" if provider_no else f"/ws/services/schedule/day/{date}"
    resp = oscar_request("GET", endpoint, tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_daily_appointments] {result}", flush=True, file=sys.stderr)
    return result


def get_appointment_statuses(tool_context) -> dict:
    """Get available appointment statuses configured in the system.

    Returns:
        dict with array of status objects containing:
        status (code), description, color, active flag
        Common statuses: t (To Do), H (Here), P (Picked), B (Billed), N (No Show), C (Cancelled)
    """
    resp = oscar_request("GET", "/ws/services/schedule/statuses", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_appointment_statuses] {result}", flush=True, file=sys.stderr)
    return result


def get_appointment_types(tool_context) -> dict:
    """Get available appointment types configured in the system.

    Returns:
        dict with array of appointment type objects containing:
        name, duration (default minutes), location, notes
    """
    resp = oscar_request("GET", "/ws/services/schedule/types", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_appointment_types] {result}", flush=True, file=sys.stderr)
    return result


def create_appointment(patient_id: int, provider_no: str, date: str, start_time: str, duration: int, tool_context,
                       reason: Optional[str] = None, notes: Optional[str] = None, appointment_type: Optional[str] = None,
                       status: Optional[str] = None) -> dict:
    """Create a new appointment.

    Args:
        patient_id: Patient demographic ID
        provider_no: Provider ID (use get_providers or get_current_provider to find)
        date: Appointment date in YYYY-MM-DD format
        start_time: Start time in HH:MM format (24-hour, e.g., "14:30")
        duration: Duration in minutes (e.g., 15, 30, 60)
        reason: Appointment reason/chief complaint (optional)
        notes: Internal notes (optional)
        appointment_type: Type from get_appointment_types (optional)
        status: Status code from get_appointment_statuses (optional, defaults to "t")

    Returns:
        dict with created appointment including id, appointmentDate, startTime, etc.
    """
    data = {
        "demographicNo": patient_id,
        "providerNo": provider_no,
        "appointmentDate": date,
        "startTime": start_time,
        "duration": duration,
    }
    if reason:
        data["reason"] = reason
    if notes:
        data["notes"] = notes
    if appointment_type:
        data["type"] = appointment_type
    if status:
        data["status"] = status

    resp = oscar_request("POST", "/ws/services/schedule/add", tool_context.state.get("session_id"), json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[create_appointment] {result}", flush=True, file=sys.stderr)
    return result


def update_appointment_status(appointment_id: int, status: str, tool_context) -> dict:
    """Update an appointment's status.

    Args:
        appointment_id: Appointment ID
        status: New status code. Common values:
            t (To Do), H (Here), P (Picked), B (Billed), N (No Show), C (Cancelled)
            Use get_appointment_statuses to see all available codes.

    Returns:
        dict with updated appointment details
    """
    resp = oscar_request("POST", f"/ws/services/schedule/appointment/{appointment_id}/updateStatus",
                         tool_context.state.get("session_id"), json={"status": status})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[update_appointment_status] {result}", flush=True, file=sys.stderr)
    return result


def get_patient_appointment_history(patient_id: int, tool_context) -> dict:
    """Get appointment history for a patient.

    Args:
        patient_id: Patient demographic ID

    Returns:
        dict with array of past and future appointments for the patient,
        each containing id, appointmentDate, startTime, providerName, status, reason
    """
    resp = oscar_request("POST", f"/ws/services/schedule/{patient_id}/appointmentHistory", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_patient_appointment_history] {result}", flush=True, file=sys.stderr)
    return result


def delete_appointment(appointment_id: int, tool_context) -> dict:
    """Delete/cancel an appointment.

    Args:
        appointment_id: Appointment ID to delete

    Returns:
        dict with success: True on success, or error/text on failure
    """
    resp = oscar_request("POST", "/ws/services/schedule/deleteAppointment", tool_context.state.get("session_id"), json={"id": appointment_id})
    if resp.ok:
        result = {"success": True, "status": resp.status_code}
    else:
        result = {"error": resp.status_code, "text": resp.text}
    print(f"[delete_appointment] {result}", flush=True, file=sys.stderr)
    return result


APPOINTMENT_TOOLS = [
    get_daily_appointments, get_appointment_statuses, get_appointment_types,
    create_appointment, update_appointment_status, get_patient_appointment_history, delete_appointment
]

APPOINTMENT_TOOL_DESCRIPTIONS = {
    "get_daily_appointments": "Fetching daily appointments...",
    "get_appointment_statuses": "Fetching appointment statuses...",
    "get_appointment_types": "Fetching appointment types...",
    "create_appointment": "Creating appointment...",
    "update_appointment_status": "Updating appointment status...",
    "get_patient_appointment_history": "Fetching patient appointment history...",
    "delete_appointment": "Deleting appointment...",
}
