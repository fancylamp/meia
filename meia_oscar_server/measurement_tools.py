"""OSCAR Measurement/Vital Signs Tools"""

import sys
from typing import List, Optional
from tools import oscar_request


def get_patient_measurements(patient_id: int, types: List[str], tool_context) -> dict:
    """Get measurements/vitals for a patient by type.

    Args:
        patient_id: Patient demographic ID
        types: List of measurement type codes. Common types:
            Vitals: HT (height cm), WT (weight kg), BP (blood pressure), HR/P (heart rate bpm),
                    TEMP (temperature °C), RESP/RR (respiratory rate), 02 (oxygen saturation %)
            Labs: A1C, FBS (fasting glucose), EGFR, SCR (creatinine), HDL, LDL, TCHL (total cholesterol),
                  TG/TRIG (triglycerides), TSH, INR, Hb, ALT, AST
            Diabetes: A1C, FBS, EGFR, ACR (albumin/creatinine ratio)
            Cardiac: BP, HR, TCHD (TC/HDL ratio), FRAM (Framingham risk %)
            Other: BMI, WAIS (waist cm), SMK (smoking Yes/No/X), NOSK (cigarettes/day)

    Returns:
        dict with measurements array containing type, dataField (value), dateObserved, comments
    """
    resp = oscar_request("POST", f"/ws/services/measurements/{patient_id}", tool_context.state.get("session_id"), json={"types": types})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_patient_measurements] {result}", flush=True, file=sys.stderr)
    return result


def save_measurement(patient_id: int, measurement_type: str, value: str, date_observed: str,
                     tool_context, comments: Optional[str] = None) -> dict:
    """Save a measurement/vital sign for a patient.

    Args:
        patient_id: Patient demographic ID
        measurement_type: Type code (case-insensitive). Common types:
            HT (height cm), WT (weight kg), BP (blood pressure as "120/80"),
            HR/P (heart rate bpm), TEMP (temperature °C), BMI, A1C, FBS, etc.
        value: Measurement value as string. Format depends on type:
            BP: "120/80", HT: "175", WT: "70.5", A1C: "0.065", SMK: "Yes/No/X"
        date_observed: Date in YYYY-MM-DD format (required)
        comments: Additional notes (optional)

    Returns:
        dict with saved measurement details including id, type, dataField, dateObserved
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
