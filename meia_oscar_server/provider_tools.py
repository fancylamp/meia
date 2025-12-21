"""OSCAR Provider Tools"""

import sys
from typing import Optional
from tools import oscar_request


def get_providers(tool_context) -> dict:
    """Get list of active providers.

    Returns:
        dict with list of providers on success, or error/text on failure
    """
    resp = oscar_request("GET", "/ws/services/providerService/providers_json", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_providers] {result}", flush=True, file=sys.stderr)
    return result


def get_current_provider(tool_context) -> dict:
    """Get the currently logged in provider.

    Returns:
        dict with provider details on success, or error/text on failure
    """
    resp = oscar_request("GET", "/ws/services/providerService/provider/me", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_current_provider] {result}", flush=True, file=sys.stderr)
    return result


def get_provider(provider_id: str, tool_context) -> dict:
    """Get provider details by ID.

    Args:
        provider_id: Provider ID

    Returns:
        dict with provider details on success, or error/text on failure
    """
    # Use the JSON endpoint instead of XML
    resp = oscar_request("GET", f"/ws/services/providerService/providerjson/{provider_id}", tool_context.state.get("session_id"))
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[get_provider] {result}", flush=True, file=sys.stderr)
    return result


def search_providers(search_term: str, tool_context, active: bool = True) -> dict:
    """Search providers by name.

    Args:
        search_term: Search term for provider name
        active: Filter by active status (default True)

    Returns:
        dict with list of matching providers on success, or error/text on failure
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
