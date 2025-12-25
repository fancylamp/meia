"""OSCAR API client using stored service tokens for phone system"""

import os
import requests
from requests_oauthlib import OAuth1
import store

OSCAR_URL = os.getenv("OSCAR_URL", "https://ec2-16-52-150-143.ca-central-1.compute.amazonaws.com:8443/oscar")
CONSUMER_KEY = os.getenv("OSCAR_CONSUMER_KEY", "ocf56sfzwdd21ma7")
CONSUMER_SECRET = os.getenv("OSCAR_CONSUMER_SECRET", "3bbcwhshleje74mu")


def _get_auth():
    """Get OAuth1 auth using stored service tokens"""
    config = store.get_clinic_config()
    token = config.get("service_token")
    secret = config.get("service_token_secret")
    if not token or not secret:
        return None
    return OAuth1(CONSUMER_KEY, CONSUMER_SECRET, token, secret)


def search_patients(query: str) -> list:
    """Search patients by name (LastName,FirstName format)"""
    auth = _get_auth()
    if not auth:
        print("[oscar_client] No auth tokens available")
        return []
    # OSCAR quickSearch expects LastName,FirstName format
    # Convert "FirstName LastName" to "LastName,FirstName"
    parts = query.strip().split()
    if len(parts) == 2:
        query = f"{parts[1]},{parts[0]}"  # LastName,FirstName
    print(f"[oscar_client] Searching with query='{query}'")
    resp = requests.get(f"{OSCAR_URL}/ws/services/demographics/quickSearch", params={"query": query}, auth=auth, verify=False)
    print(f"[oscar_client] Response: {resp.status_code} {resp.text[:200] if resp.text else ''}")
    return resp.json().get("content", []) if resp.ok else []


def get_patient_details(demographic_no: int) -> dict | None:
    """Get patient details including DOB for verification"""
    auth = _get_auth()
    if not auth:
        return None
    resp = requests.get(f"{OSCAR_URL}/ws/services/demographics/{demographic_no}", auth=auth, verify=False)
    return resp.json() if resp.ok else None


def get_patient_appointments(demographic_no: int) -> list:
    """Get patient's upcoming appointments"""
    auth = _get_auth()
    if not auth:
        return []
    resp = requests.post(f"{OSCAR_URL}/ws/services/schedule/{demographic_no}/appointmentHistory", auth=auth, verify=False)
    print(f"[oscar_client] get_patient_appointments: {resp.status_code} {resp.text[:500] if resp.text else ''}")
    return resp.json() if resp.ok else []


def create_appointment(demographic_no: int, provider_no: str, date: str, start_time: str, duration: int = 15, reason: str = "") -> dict | None:
    """Create an appointment"""
    auth = _get_auth()
    if not auth:
        return None
    # Convert 24h time to 12h with AM/PM for OSCAR compatibility
    h, m = map(int, start_time.split(":"))
    period = "AM" if h < 12 else "PM"
    h12 = h if 1 <= h <= 12 else (h - 12 if h > 12 else 12)
    time_12h = f"{h12}:{m:02d} {period}"
    
    data = {
        "demographicNo": demographic_no,
        "providerNo": provider_no,
        "appointmentDate": date,
        "startTime12hWithMedian": time_12h,
        "duration": duration,
        "status": "t",
    }
    if reason:
        data["reason"] = reason
    print(f"[oscar_client] create_appointment: {data}")
    resp = requests.post(f"{OSCAR_URL}/ws/services/schedule/add", json=data, auth=auth, verify=False)
    print(f"[oscar_client] create_appointment response: {resp.status_code} {resp.text[:500] if resp.text else ''}")
    return resp.json() if resp.ok else None


def get_appointment(appointment_no: int) -> dict | None:
    """Get appointment details for ownership verification"""
    auth = _get_auth()
    if not auth:
        return None
    resp = requests.get(f"{OSCAR_URL}/ws/services/schedule/appointment/{appointment_no}", auth=auth, verify=False)
    print(f"[oscar_client] get_appointment({appointment_no}): {resp.status_code} {resp.text[:500] if resp.text else ''}")
    return resp.json() if resp.ok else None


def cancel_appointment(appointment_no: int) -> bool:
    """Cancel an appointment"""
    auth = _get_auth()
    if not auth:
        return False
    resp = requests.post(f"{OSCAR_URL}/ws/services/schedule/deleteAppointment", json={"id": appointment_no}, auth=auth, verify=False)
    return resp.ok


def get_providers() -> list:
    """Get list of providers/doctors"""
    auth = _get_auth()
    if not auth:
        return []
    resp = requests.get(f"{OSCAR_URL}/ws/services/providerService/providers_json", auth=auth, verify=False)
    print(f"[oscar_client] get_providers: {resp.status_code} {resp.text[:500] if resp.text else ''}")
    if resp.ok:
        data = resp.json()
        return data.get("content", []) if isinstance(data, dict) else data
    return []


def get_day_appointments(provider_no: str, date: str) -> list:
    """Get existing appointments for a provider on a date (to determine busy times)"""
    auth = _get_auth()
    if not auth:
        return []
    resp = requests.get(f"{OSCAR_URL}/ws/services/schedule/{provider_no}/day/{date}", auth=auth, verify=False)
    print(f"[oscar_client] get_day_appointments: {resp.status_code} {resp.text[:500] if resp.text else ''}")
    return resp.json() if resp.ok else []
