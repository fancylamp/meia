"""OSCAR Demographic/Patient Tools"""

import sys
from typing import Optional
from tools import oscar_request


def search_patients(query: str, tool_context) -> dict:
    """Search patients by name or chart number.

    Args:
        query: Search term (name or chart number)

    Returns:
        dict with content list of matching patients on success, or error/text on failure
    """
    resp = oscar_request("GET", "/ws/services/demographics/quickSearch", tool_context.state.get("session_id"), params={"query": query})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[search_patients] {result}", flush=True, file=sys.stderr)
    return result


def get_patient_details(patient_id: int, tool_context) -> dict:
    """Get patient details by ID.

    Args:
        patient_id: Patient demographic ID

    Returns:
        dict with patient demographics, contacts, and status lists on success, or error/text on failure
    """
    resp = oscar_request("GET", f"/ws/services/demographics/{patient_id}", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_patient_details] {result}", flush=True, file=sys.stderr)
    return result


def get_patient_allergies(patient_id: int, tool_context) -> dict:
    """Get patient allergies.

    Args:
        patient_id: Patient demographic ID

    Returns:
        dict with list of active allergies on success, or error/text on failure
    """
    resp = oscar_request("GET", "/ws/services/allergies/active", tool_context.state.get("session_id"), params={"demographicNo": patient_id})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_patient_allergies] {result}", flush=True, file=sys.stderr)
    return result


def create_patient(first_name: str, last_name: str, date_of_birth: str, sex: str, tool_context,
                   hin: Optional[str] = None, address: Optional[str] = None, city: Optional[str] = None,
                   province: Optional[str] = None, postal: Optional[str] = None, phone: Optional[str] = None,
                   email: Optional[str] = None) -> dict:
    """Create a new patient demographic record.

    Args:
        first_name: Patient's first name
        last_name: Patient's last name
        date_of_birth: Date of birth in YYYY-MM-DD format
        sex: Patient sex (M or F)
        hin: Health insurance number (optional)
        address: Street address (optional)
        city: City (optional)
        province: Province code e.g. ON (optional)
        postal: Postal code (optional)
        phone: Phone number (optional)
        email: Email address (optional)

    Returns:
        dict with demographicNo and patient details on success, or error/text on failure
    """
    dob_parts = date_of_birth.split("-")
    data = {
        "firstName": first_name,
        "lastName": last_name,
        "dobYear": dob_parts[0],
        "dobMonth": dob_parts[1],
        "dobDay": dob_parts[2],
        "sex": sex,
    }
    if hin:
        data["hin"] = hin
    if phone:
        data["phone"] = phone
    if email:
        data["email"] = email
    if address or city or province or postal:
        data["address"] = {}
        if address:
            data["address"]["address"] = address
        if city:
            data["address"]["city"] = city
        if province:
            data["address"]["province"] = province
        if postal:
            data["address"]["postal"] = postal

    resp = oscar_request("POST", "/ws/services/demographics", tool_context.state.get("session_id"), json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[create_patient] {result}", flush=True, file=sys.stderr)
    return result


DEMOGRAPHIC_TOOLS = [search_patients, get_patient_details, get_patient_allergies, create_patient]

TOOL_DESCRIPTIONS = {
    "search_patients": "Searching patient database...",
    "get_patient_details": "Retrieving patient details...",
    "get_patient_allergies": "Fetching patient allergies...",
    "create_patient": "Creating new patient record...",
}
