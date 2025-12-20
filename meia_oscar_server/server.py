"""FastAPI backend with Google ADK Agent for OSCAR integration"""

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from google.adk.models.lite_llm import LiteLlm
from google.genai import types
from requests_oauthlib import OAuth1
import requests
import uvicorn
import uuid
import os
from typing import Dict

import tools
from tools import TOOL_DESCRIPTIONS
from voice import VoiceTranscriber

# Configuration
OSCAR_URL = "https://ec2-16-52-150-143.ca-central-1.compute.amazonaws.com:8443/oscar"
BEDROCK_MODEL = "arn:aws:bedrock:ca-central-1:063347417131:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0"
BACKEND_URL = "http://localhost:8000"
CONSUMER_KEY = "ocf56sfzwdd21ma7"
CONSUMER_SECRET = "3bbcwhshleje74mu"

# Storage
sessions: Dict[str, Dict] = {}
pending: Dict[str, Dict] = {}
tools.init(OSCAR_URL, CONSUMER_KEY, CONSUMER_SECRET, sessions)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

session_service = InMemorySessionService()


def oauth1(token=None, token_secret=None, verifier=None, callback=None):
    return OAuth1(CONSUMER_KEY, CONSUMER_SECRET, token, token_secret, verifier=verifier, callback_uri=callback, signature_method='HMAC-SHA1', signature_type='AUTH_HEADER')


oscar_agent = Agent(
    name="oscar_agent",
    model=LiteLlm(model=f"bedrock/{BEDROCK_MODEL}"),
    instruction=
        """
            You are a medical assistant with access to the OSCAR EMR system. Help users find patient information.
        """,
    tools=tools.TOOLS,
)

runner = Runner(agent=oscar_agent, app_name="oscar_app", session_service=session_service)


# ============ OAuth Endpoints ============

@app.get("/auth/login")
async def auth_login():
    session_id = str(uuid.uuid4())
    # Request scopes for read/write access to demographics
    params = {"scope": "read write"}
    response = requests.post(f"{OSCAR_URL}/ws/oauth/initiate", auth=oauth1(callback=f"{BACKEND_URL}/auth/callback"), params=params, verify=False)
    print(f"[oauth/initiate] {response.status_code} {response.text}", flush=True)
    response.raise_for_status()
    creds = dict(x.split('=') for x in response.text.split('&'))
    pending[creds['oauth_token']] = {"session_id": session_id, "secret": creds['oauth_token_secret']}
    return JSONResponse({"session_id": session_id, "auth_url": f"{OSCAR_URL}/ws/oauth/authorize?oauth_token={creds['oauth_token']}"})


@app.get("/auth/callback")
async def auth_callback(oauth_token: str, oauth_verifier: str):
    p = pending.pop(oauth_token, None)
    if not p:
        return HTMLResponse("<h1>Invalid token</h1>", status_code=400)
    response = requests.post(f"{OSCAR_URL}/ws/oauth/token", auth=oauth1(oauth_token, p["secret"], verifier=oauth_verifier), verify=False)
    response.raise_for_status()
    creds = dict(x.split('=') for x in response.text.split('&'))
    sessions[p["session_id"]] = {"access_token": creds['oauth_token'], "access_token_secret": creds['oauth_token_secret']}
    await session_service.create_session(app_name="oscar_app", user_id=p["session_id"], session_id=p["session_id"], state={"session_id": p["session_id"]})
    return HTMLResponse(f"""<!DOCTYPE html><html><body><h2>Success!</h2><script>
        window.opener?.postMessage({{type:'oauth_complete',session_id:'{p["session_id"]}',success:true}},'*');
        setTimeout(()=>window.close(),1000);
    </script></body></html>""")


@app.get("/auth/status")
async def auth_status(session_id: str):
    return JSONResponse({"authenticated": session_id in sessions})


@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    
    async def event_stream():
        import json
        content = types.Content(role="user", parts=[types.Part(text=data["message"])])
        async for event in runner.run_async(user_id=session_id, session_id=session_id, new_message=content):
            if not event.content or not event.content.parts:
                continue
            for part in event.content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    desc = TOOL_DESCRIPTIONS.get(part.function_call.name, f"Calling {part.function_call.name}...")
                    yield f"data: {json.dumps({'type': 'tool_call', 'name': part.function_call.name, 'description': desc})}\n\n"
                elif hasattr(part, 'function_response') and part.function_response:
                    yield f"data: {json.dumps({'type': 'tool_result', 'name': part.function_response.name})}\n\n"
                elif hasattr(part, 'text') and part.text and event.is_final_response():
                    yield f"data: {json.dumps({'type': 'response', 'text': part.text})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.websocket("/voice")
async def voice_websocket(websocket: WebSocket, session_id: str):
    if session_id not in sessions:
        await websocket.close(code=4001)
        return
    
    await websocket.accept()
    
    async def send_transcript(text: str):
        await websocket.send_json({"transcript": text})
    
    transcriber = VoiceTranscriber(send_transcript)
    
    try:
        while True:
            data = await websocket.receive_bytes()
            await transcriber.process_chunk(data)
    except WebSocketDisconnect:
        pass
    finally:
        await transcriber.flush()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
