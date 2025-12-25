"""OSCAR Demographic/Patient Tools"""

from typing import Optional
from tools import oscar_request, handle_response


def search_patients(query: str, tool_context) -> dict:
    """Search patients by name, chart number, or health insurance number.

    Args:
        query: Search term - can be:
            - Patient name in "LastName,FirstName" or "LastName" format (e.g., "Smith,John" or "Smith")
            - Chart number (prefix with "chartNo:" e.g., "chartNo:12345")
            - Address (prefix with "addr:" e.g., "addr:123 Main St")

    Returns:
        dict with content array of matching patients, each containing:
        demographicNo, firstName, lastName, sex, dateOfBirth, hin, chartNo
    """
    resp = oscar_request("GET", "/ws/services/demographics/quickSearch", tool_context.state.get("session_id"), params={"query": query})
    return handle_response(resp, "search_patients")


def get_patient_details(patient_id: int, tool_context) -> dict:
    """Get complete patient demographics by ID.

    Args:
        patient_id: Patient demographic ID (demographicNo)

    Returns:
        dict containing:
        - demographics: firstName, lastName, dateOfBirth, sex, hin, address, phone, email, etc.
        - contacts: emergency contacts and relationships
        - statusLists: patient status flags
    """
    resp = oscar_request("GET", f"/ws/services/demographics/{patient_id}", tool_context.state.get("session_id"))
    return handle_response(resp, "get_patient_details")


def get_patient_allergies(patient_id: int, tool_context) -> dict:
    """Get active allergies for a patient.

    Args:
        patient_id: Patient demographic ID

    Returns:
        dict with array of active allergies, each containing:
        description, reaction, severity, startDate, archived status
    """
    resp = oscar_request("GET", "/ws/services/allergies/active", tool_context.state.get("session_id"), params={"demographicNo": patient_id})
    return handle_response(resp, "get_patient_allergies")


def create_patient(first_name: str, last_name: str, date_of_birth: str, sex: str, tool_context,
                   hin: Optional[str] = None, address: Optional[str] = None, city: Optional[str] = None,
                   province: Optional[str] = None, postal: Optional[str] = None, phone: Optional[str] = None,
                   email: Optional[str] = None) -> dict:
    """Create a new patient demographic record.

    Args:
        first_name: Patient's first name
        last_name: Patient's last name
        date_of_birth: Date of birth in YYYY-MM-DD format
        sex: Patient sex - "M" (male) or "F" (female)
        hin: Health insurance number (optional, province-specific format)
        address: Street address (optional)
        city: City name (optional)
        province: Province code - ON, BC, AB, QC, etc. (optional)
        postal: Postal code in A1A 1A1 format (optional)
        phone: Phone number (optional)
        email: Email address (optional)

    Returns:
        dict with demographicNo (new patient ID) and created patient details
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
    return handle_response(resp, "create_patient")


DEMOGRAPHIC_TOOLS = [search_patients, get_patient_details, get_patient_allergies, create_patient]

TOOL_DESCRIPTIONS = {
    "search_patients": "Searching patient database...",
    "get_patient_details": "Retrieving patient details...",
    "get_patient_allergies": "Fetching patient allergies...",
    "create_patient": "Creating new patient record...",
}
