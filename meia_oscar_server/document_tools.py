"""OSCAR Document Tools"""

from typing import Optional
from tools import oscar_request


def save_document(patient_id: int, provider_no: str, file_name: str, file_contents: str, content_type: str,
                  tool_context, description: Optional[str] = None, source: Optional[str] = None) -> dict:
    """Save a document to a patient's chart.

    Args:
        patient_id: Patient demographic ID
        provider_no: Provider ID who is uploading the document
        file_name: Document filename with extension (e.g., "lab_results.pdf")
        file_contents: Use 'USE_PENDING_ATTACHMENT' to use the most recently uploaded file, or provide base64-encoded file contents
        content_type: MIME type of the document (e.g., application/pdf, image/png)
        description: Document title/description shown in OSCAR (defaults to filename)
        source: Document source description (optional, defaults to "Meia AI Upload")

    Returns:
        dict with created document record including documentNo, fileName, contentType
    """
    session_id = tool_context.state.get("session_id")
    
    # Get file data from pending attachment if specified
    if file_contents == "USE_PENDING_ATTACHMENT":
        from tools import sessions
        pending = sessions.get(session_id, {}).get("pending_attachments", [])
        if not pending:
            return {"error": "No pending attachment found. Please upload a file first."}
        att = pending[0]  # Use first pending attachment
        file_contents = att["data"]
        if not content_type or content_type == "USE_PENDING_ATTACHMENT":
            content_type = att["type"]
        if not file_name or file_name == "USE_PENDING_ATTACHMENT":
            file_name = att["name"]
    
    # Validate base64
    import base64
    try:
        base64.b64decode(file_contents)
    except Exception as e:
        return {"error": f"Invalid base64 data: {e}"}
    
    data = {
        "demographicNo": patient_id,
        "providerNo": provider_no,
        "fileName": file_name,
        "fileContents": file_contents,
        "contentType": content_type,
        "description": description or file_name,
        "source": source or "Meia AI Upload",
    }

    resp = oscar_request("POST", "/ws/services/document/saveDocumentToDemographic", session_id, json=data)
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    
    # Clear only the used attachment after successful save
    if resp.ok:
        from tools import sessions
        pending = sessions.get(session_id, {}).get("pending_attachments", [])
        if pending:
            pending.pop(0)
    
    return result


DOCUMENT_TOOLS = [save_document]

DOCUMENT_TOOL_DESCRIPTIONS = {
    "save_document": "Saving document to patient record...",
}
