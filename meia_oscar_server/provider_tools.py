"""OSCAR Provider Tools"""

import sys
from typing import Optional
from tools import oscar_request


def get_providers(tool_context) -> dict:
    """Get list of all active providers in the system.

    Returns:
        dict with array of providers, each containing:
        providerNo (ID), firstName, lastName, providerType (doctor/nurse/admin),
        specialty, status, ohipNo, team
    """
    resp = oscar_request("GET", "/ws/services/providerService/providers_json", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_providers] {result}", flush=True, file=sys.stderr)
    return result


def get_current_provider(tool_context) -> dict:
    """Get the currently authenticated provider's details.

    Returns:
        dict with current provider info:
        providerNo, firstName, lastName, providerType, specialty, ohipNo, email, phone
    """
    resp = oscar_request("GET", "/ws/services/providerService/provider/me", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_current_provider] {result}", flush=True, file=sys.stderr)
    return result


def get_provider(provider_id: str, tool_context) -> dict:
    """Get provider details by ID.

    Args:
        provider_id: Provider ID (providerNo)

    Returns:
        dict with provider details:
        providerNo, firstName, lastName, providerType, specialty, status, ohipNo, team
    """
    # Use the JSON endpoint instead of XML
    resp = oscar_request("GET", f"/ws/services/providerService/providerjson/{provider_id}", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_provider] {result}", flush=True, file=sys.stderr)
    return result


def search_providers(search_term: str, tool_context, active: bool = True) -> dict:
    """Search providers by name.

    Args:
        search_term: Search term for provider name (partial match on first or last name)
        active: Filter by active status (default True - only active providers)

    Returns:
        dict with array of matching providers containing providerNo, firstName, lastName, providerType
    """
    resp = oscar_request("POST", "/ws/services/providerService/providers/search", tool_context.state.get("session_id"),
                         json={"searchTerm": search_term, "active": str(active).lower()})
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[search_providers] {result}", flush=True, file=sys.stderr)
    return result


PROVIDER_TOOLS = [get_providers, get_current_provider, get_provider, search_providers]

PROVIDER_TOOL_DESCRIPTIONS = {
    "get_providers": "Fetching providers...",
    "get_current_provider": "Fetching current provider...",
    "get_provider": "Fetching provider details...",
    "search_providers": "Searching providers...",
}
