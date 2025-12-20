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
    req = requests.Request(method, f"{OSCAR_URL}{endpoint}", auth=auth, **kwargs)
    prepared = req.prepare()
    resp = requests.Session().send(prepared, verify=False)
    print(f"[response] {resp.status_code} {resp.text}", flush=True, file=sys.stderr)
    return resp


from demographic_tools import DEMOGRAPHIC_TOOLS, TOOL_DESCRIPTIONS

TOOLS = DEMOGRAPHIC_TOOLS
