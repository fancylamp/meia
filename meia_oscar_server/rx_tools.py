"""OSCAR Prescription/Rx Tools"""

import sys
from typing import Optional
from tools import oscar_request


def get_patient_medications(patient_id: int, tool_context, status: str = "current") -> dict:
    """Get medications for a patient.

    Args:
        patient_id: Patient demographic ID
        status: Medication filter:
            "current" - active medications (default)
            "archived" - discontinued/past medications
            "longterm" - long-term/chronic medications
            "all" - all medications regardless of status

    Returns:
        dict with array of medications, each containing:
        drugId, brandName, genericName, dosage, frequency, route, quantity,
        startDate, endDate, prescribingProvider, instructions, archived
    """
    resp = oscar_request("GET", f"/ws/services/rx/drugs/{status}/{patient_id}", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_patient_medications] {result}", flush=True, file=sys.stderr)
    return result


def get_prescriptions(patient_id: int, tool_context) -> dict:
    """Get prescriptions (Rx records) for a patient.

    Args:
        patient_id: Patient demographic ID

    Returns:
        dict with array of prescriptions, each containing:
        scriptNo, dateWritten, drugs (array), providerNo, providerName
    """
    resp = oscar_request("GET", "/ws/services/rx/prescriptions", tool_context.state.get("session_id"),
                         params={"demographicNo": patient_id})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_prescriptions] {result}", flush=True, file=sys.stderr)
    return result


def get_drug_history(drug_id: int, patient_id: int, tool_context) -> dict:
    """Get prescription history for a specific drug for a patient.

    Args:
        drug_id: Drug ID from get_patient_medications
        patient_id: Patient demographic ID

    Returns:
        dict with array of historical prescriptions for this drug,
        showing dosage changes, refills, and discontinuation dates
    """
    resp = oscar_request("GET", "/ws/services/rx/history", tool_context.state.get("session_id"),
                         params={"id": drug_id, "demographicNo": patient_id})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_drug_history] {result}", flush=True, file=sys.stderr)
    return result


RX_TOOLS = [get_patient_medications, get_prescriptions, get_drug_history]

RX_TOOL_DESCRIPTIONS = {
    "get_patient_medications": "Fetching patient medications...",
    "get_prescriptions": "Fetching prescriptions...",
    "get_drug_history": "Fetching drug history...",
}
