"""OSCAR ADK Tools"""

from requests_oauthlib import OAuth1
import requests
import sys


def init(oscar_url, consumer_key, consumer_secret, sessions_dict):
    global OSCAR_URL, CONSUMER_KEY, CONSUMER_SECRET, sessions
    OSCAR_URL = oscar_url
    CONSUMER_KEY = consumer_key
    CONSUMER_SECRET = consumer_secret
    sessions = sessions_dict


def oscar_request(method: str, endpoint: str, session_id: str, **kwargs) -> requests.Response:
    session = sessions.get(session_id)
    if not session:
        raise ValueError("Not authenticated")
    auth = OAuth1(CONSUMER_KEY, CONSUMER_SECRET, session["access_token"], session["access_token_secret"], signature_method='HMAC-SHA1')
    cookies = {"JSESSIONID": session.get("jsessionid")} if session.get("jsessionid") else {}
    req = requests.Request(method, f"{OSCAR_URL}{endpoint}", auth=auth, cookies=cookies, **kwargs)
    prepared = req.prepare()
    resp = requests.Session().send(prepared, verify=False)
    print(f"[response] {resp.status_code} {resp.text}", flush=True, file=sys.stderr)
    return resp


def handle_response(resp: requests.Response, name: str) -> dict:
    """Standard response handling with logging."""
    result = resp.json() if resp.ok else {"error": resp.status_code, "text": resp.text}
    print(f"[{name}] {result}", flush=True, file=sys.stderr)
    return result


from demographic_tools import DEMOGRAPHIC_TOOLS, TOOL_DESCRIPTIONS as DEMOGRAPHIC_DESCRIPTIONS
from appointment_tools import APPOINTMENT_TOOLS, APPOINTMENT_TOOL_DESCRIPTIONS
from measurement_tools import MEASUREMENT_TOOLS, MEASUREMENT_TOOL_DESCRIPTIONS
from document_tools import DOCUMENT_TOOLS, DOCUMENT_TOOL_DESCRIPTIONS
from provider_tools import PROVIDER_TOOLS, PROVIDER_TOOL_DESCRIPTIONS
from rx_tools import RX_TOOLS, RX_TOOL_DESCRIPTIONS
from tickler_tools import TICKLER_TOOLS, TICKLER_TOOL_DESCRIPTIONS
from inbox_tools import INBOX_TOOLS, INBOX_TOOL_DESCRIPTIONS
from notes_tools import NOTES_TOOLS, NOTES_TOOL_DESCRIPTIONS
from util_tools import UTIL_TOOLS, UTIL_TOOL_DESCRIPTIONS
from cpsbc_tools import CPSBC_TOOLS, CPSBC_TOOL_DESCRIPTIONS

TOOLS = (
    DEMOGRAPHIC_TOOLS +
    APPOINTMENT_TOOLS +
    MEASUREMENT_TOOLS +
    DOCUMENT_TOOLS +
    PROVIDER_TOOLS +
    RX_TOOLS +
    TICKLER_TOOLS +
    INBOX_TOOLS +
    NOTES_TOOLS +
    UTIL_TOOLS +
    CPSBC_TOOLS
)

MCP_TOOL_DESCRIPTIONS = {
    "search-drugs": "Searching FDA drug database...",
    "get-drug-details": "Fetching drug details from FDA...",
    "get-health-statistics": "Fetching WHO health statistics...",
    "search-medical-literature": "Searching PubMed...",
    "get-article-details": "Fetching article from PubMed...",
    "search-drug-nomenclature": "Searching RxNorm...",
    "search-google-scholar": "Searching Google Scholar...",
    "search-clinical-guidelines": "Searching clinical guidelines...",
    "search-medical-databases": "Searching medical databases...",
    "search-medical-journals": "Searching medical journals...",
    "get-cache-stats": "Fetching cache statistics...",
    "search-pediatric-guidelines": "Searching AAP pediatric guidelines...",
    "search-pediatric-literature": "Searching pediatric journals...",
    "get-child-health-statistics": "Fetching child health statistics...",
    "search-pediatric-drugs": "Searching pediatric drug information...",
    "search-aap-guidelines": "Searching AAP guidelines...",
}

TOOL_DESCRIPTIONS = {
    **DEMOGRAPHIC_DESCRIPTIONS,
    **APPOINTMENT_TOOL_DESCRIPTIONS,
    **MEASUREMENT_TOOL_DESCRIPTIONS,
    **DOCUMENT_TOOL_DESCRIPTIONS,
    **PROVIDER_TOOL_DESCRIPTIONS,
    **RX_TOOL_DESCRIPTIONS,
    **TICKLER_TOOL_DESCRIPTIONS,
    **INBOX_TOOL_DESCRIPTIONS,
    **NOTES_TOOL_DESCRIPTIONS,
    **UTIL_TOOL_DESCRIPTIONS,
    **CPSBC_TOOL_DESCRIPTIONS,
    **MCP_TOOL_DESCRIPTIONS,
}
