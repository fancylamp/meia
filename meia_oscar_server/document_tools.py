"""OSCAR Document Tools"""

import sys
from typing import Optional
from tools import oscar_request


def save_document(patient_id: int, provider_no: str, file_name: str, file_contents: str, content_type: str,
                  tool_context, source: Optional[str] = None) -> dict:
    """Save a document to a patient's record.

    Args:
        patient_id: Patient demographic ID
        provider_no: Provider ID
        file_name: Document filename
        file_contents: Base64 encoded file contents
        content_type: MIME type (e.g., "application/pdf", "image/png")
        source: Document source (optional, defaults to "REST API")

    Returns:
        dict with created document record on success, or error/text on failure
    """
    data = {
        "demographicNo": patient_id,
        "providerNo": provider_no,
        "fileName": file_name,
        "fileContents": file_contents,
        "contentType": content_type,
    }
    if source:
        data["source"] = source

    resp = oscar_request("POST", "/ws/services/document/saveDocumentToDemographic", tool_context.state.get("session_id"), json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[save_document] {result}", flush=True, file=sys.stderr)
    return result


DOCUMENT_TOOLS = [save_document]

DOCUMENT_TOOL_DESCRIPTIONS = {
    "save_document": "Saving document to patient record...",
}
