"""FastAPI backend with Google ADK Agent for OSCAR integration"""

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from google.adk.models.lite_llm import LiteLlm
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp.client.stdio import StdioServerParameters
from google.genai import types
from requests_oauthlib import OAuth1
import requests
import uvicorn
import uuid
import os
import json
import logging
import asyncio
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

import tools
from tools import TOOL_DESCRIPTIONS
from transcribe import EncounterTranscriber

# Configuration
OSCAR_URL = "https://ec2-16-52-150-143.ca-central-1.compute.amazonaws.com:8443/oscar"
BEDROCK_MODEL = "arn:aws:bedrock:ca-central-1:063347417131:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0"
BACKEND_URL = "http://localhost:8000"
CONSUMER_KEY = "ocf56sfzwdd21ma7"
CONSUMER_SECRET = "3bbcwhshleje74mu"

# Storage
sessions: dict[str, dict] = {}
pending: dict[str, dict] = {}
user_chat_sessions: dict[str, list] = {}
personalization: dict[str, dict] = {}
tools.init(OSCAR_URL, CONSUMER_KEY, CONSUMER_SECRET, sessions)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

session_service = InMemorySessionService()


def oauth1(token=None, token_secret=None, verifier=None, callback=None):
    return OAuth1(CONSUMER_KEY, CONSUMER_SECRET, token, token_secret, verifier=verifier, callback_uri=callback, signature_method='HMAC-SHA1', signature_type='AUTH_HEADER')


# MCP Toolset for medical-mcp server
mcp_path = Path(__file__).parent.parent / "medical-mcp-main" / "build" / "index.js"
medical_mcp_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(command="node", args=[str(mcp_path)]),
        timeout=30.0,
    ),
)

BASE_INSTRUCTION = """
    You are Meia, a medical assistant with access to the OSCAR EMR system. Your job is to assist the user (who can be a clinic administrator or a doctor)
    in running clinic administration tasks. 
    
    You have to your disposal powerful tools which access the OSCAR EMR API, which can mutate data in the database.
    You are also capable of generating text, emails, referral letters, or whatever content relevant to clinic administration should the user request it.
    Refrain from using emojis. Maintain a professional tone and diction.

    == Decision support web search MCP ==
    You also have various web search tools. These tools runs searches against knowledge sources such as PubMed and FDA drug database, etc.
    If the user asks about a technical question regardling medical expertise, try to search through the sources first and then incorporate with your own knowledge to give a concise answer.
    Remember, the user can always go to the source for more information or ask follow up questions.
    The response of the MCP server includes hyperlinks to the articles associated. You should include these hyperlinks in a source section.

    IMPORTANT:
    When faced with a request with ambiguity which prevents accurate execution of task, ask for clarification before executing.
    You must refuse requests not relevant to clinic administration.
    Keep non-relevant details in your responses concise, the user can always ask clarifying questions.

    Before executing any WRITE operation (creating, saving, or updating data), you MUST:
    1. Clearly show the user exactly what will be written (patient ID, content, values, etc.)
    2. Ask for explicit confirmation before proceeding
    3. Only execute the operation after the user confirms

    Write operations include: save_note, save_measurement, save_document, create_patient, create_appointment, create_tickler, update_appointment_status, complete_ticklers.

    Read operations (search, get, list) can be executed without confirmation.

    Always use query tools to get the latest information from the system. Never make assumptions based on previous conversation context - always verify current state by querying.

    == Suggested Quick Actions ==
    At the END of your response, you may include suggested follow-up actions using this format:
    [QUICK_ACTIONS: "Action 1", "Action 2", "Action 3", ...]
    
    Keep each action short (2-4 words). Use when natural follow-ups exist. Omit for purely informational responses.
"""

def get_agent(custom_prompt: str = ""):
    instruction = BASE_INSTRUCTION + (f"\n\n== User Custom Instructions ==\nThese are custom prompts specified by the user. You should apply them to the best of your ability but previous system prompts always take precedence:\n{custom_prompt}" if custom_prompt else "")
    return Agent(
        name="oscar_agent",
        model=LiteLlm(model=f"bedrock/{BEDROCK_MODEL}"),
        instruction=instruction,
        tools=tools.TOOLS + [medical_mcp_toolset],
    )


# ============ OAuth Endpoints ============

@app.get("/auth/login")
async def auth_login():
    log.info("[/auth/login] Request received")
    session_id = str(uuid.uuid4())
    # First make a request to get JSESSIONID cookie
    init_resp = requests.get(f"{OSCAR_URL}/ws/services/providerService/providers", verify=False)
    jsessionid = init_resp.cookies.get("JSESSIONID")
    print(f"[init] Got JSESSIONID: {jsessionid}", flush=True)
    
    # Request scopes for read/write access
    params = {"scope": "read write"}
    cookies = {"JSESSIONID": jsessionid} if jsessionid else {}
    response = requests.post(f"{OSCAR_URL}/ws/oauth/initiate", auth=oauth1(callback=f"{BACKEND_URL}/auth/callback"), params=params, cookies=cookies, verify=False)
    print(f"[oauth/initiate] {response.status_code} {response.text}", flush=True)
    response.raise_for_status()
    creds = dict(x.split('=') for x in response.text.split('&'))
    pending[creds['oauth_token']] = {"session_id": session_id, "secret": creds['oauth_token_secret'], "jsessionid": jsessionid}
    log.info(f"[/auth/login] Created session {session_id}")
    return JSONResponse({"session_id": session_id, "auth_url": f"{OSCAR_URL}/ws/oauth/authorize?oauth_token={creds['oauth_token']}"})


@app.get("/auth/callback")
async def auth_callback(oauth_token: str, oauth_verifier: str):
    log.info(f"[/auth/callback] token={oauth_token}")
    p = pending.pop(oauth_token, None)
    if not p:
        return HTMLResponse("<h1>Invalid token</h1>", status_code=400)
    cookies = {"JSESSIONID": p.get("jsessionid")} if p.get("jsessionid") else {}
    response = requests.post(f"{OSCAR_URL}/ws/oauth/token", auth=oauth1(oauth_token, p["secret"], verifier=oauth_verifier), cookies=cookies, verify=False)
    response.raise_for_status()
    creds = dict(x.split('=') for x in response.text.split('&'))
    sessions[p["session_id"]] = {"access_token": creds['oauth_token'], "access_token_secret": creds['oauth_token_secret'], "jsessionid": p.get("jsessionid")}
    
    # Fetch provider ID
    auth = oauth1(creds['oauth_token'], creds['oauth_token_secret'])
    provider_resp = requests.get(f"{OSCAR_URL}/ws/services/providerService/provider/me", auth=auth, cookies=cookies, verify=False)
    if provider_resp.ok:
        provider_data = provider_resp.json()
        sessions[p["session_id"]]["provider_id"] = provider_data.get("providerNo")
        log.info(f"[/auth/callback] Provider ID: {provider_data.get('providerNo')}")
    
    log.info(f"[/auth/callback] Session {p['session_id']} authenticated")
    await session_service.create_session(app_name="oscar_app", user_id=p["session_id"], session_id=p["session_id"], state={"session_id": p["session_id"]})
    return HTMLResponse(f"""<!DOCTYPE html><html><body><h2>Success!</h2><script>
        window.opener?.postMessage({{type:'oauth_complete',session_id:'{p["session_id"]}',success:true}},'*');
        setTimeout(()=>window.close(),1000);
    </script></body></html>""")


@app.get("/auth/status")
async def auth_status(session_id: str):
    authenticated = session_id in sessions
    log.info(f"[/auth/status] session={session_id[:8]}... authenticated={authenticated}")
    return JSONResponse({"authenticated": authenticated})


# ============ Chat Session Endpoints ============

@app.post("/chat-sessions")
async def create_chat_session(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    log.info(f"[POST /chat-sessions] session={session_id[:8] if session_id else None}...")
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    chat_id = str(uuid.uuid4())
    await session_service.create_session(app_name="oscar_app", user_id=session_id, session_id=chat_id, state={"session_id": session_id})
    user_chat_sessions.setdefault(session_id, []).append(chat_id)
    log.info(f"[POST /chat-sessions] Created chat {chat_id}")
    return JSONResponse({"id": chat_id})


@app.get("/chat-sessions")
async def list_chat_sessions(session_id: str):
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    return JSONResponse({"sessions": user_chat_sessions.get(session_id, [])})


@app.get("/chat-sessions/{chat_id}/messages")
async def get_chat_messages(chat_id: str, session_id: str):
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    session = await session_service.get_session(app_name="oscar_app", user_id=session_id, session_id=chat_id)
    if not session:
        return JSONResponse({"messages": []})
    messages = []
    for event in session.events:
        if event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, 'text') and part.text:
                    messages.append({"text": part.text, "isUser": event.content.role == "user"})
    return JSONResponse({"messages": messages})


@app.delete("/chat-sessions/{chat_id}")
async def delete_chat_session(chat_id: str, session_id: str):
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if session_id in user_chat_sessions:
        user_chat_sessions[session_id] = [c for c in user_chat_sessions[session_id] if c != chat_id]
    return JSONResponse({"success": True})


# ============ Personalization Endpoints ============

@app.get("/personalization")
async def get_personalization(session_id: str):
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    provider_id = sessions[session_id].get("provider_id")
    if not provider_id:
        log.warning(f"[GET /personalization] No provider_id for session {session_id[:8]}...")
        return JSONResponse({"error": "Provider ID not found"}, status_code=400)
    defaults = {
        "quick_actions": [{"text": "What are your capabilities?", "enabled": True}, {"text": "Create a new patient", "enabled": True}],
        "encounter_quick_actions": [{"text": "Generate a note for this encounter", "enabled": True}],
        "custom_prompt": ""
    }
    return JSONResponse({**defaults, **personalization.get(provider_id, {})})


@app.put("/personalization")
async def update_personalization(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    provider_id = sessions[session_id].get("provider_id")
    if not provider_id:
        log.warning(f"[PUT /personalization] No provider_id for session {session_id[:8]}...")
        return JSONResponse({"error": "Provider ID not found"}, status_code=400)
    personalization[provider_id] = {
        "quick_actions": data.get("quick_actions", []),
        "encounter_quick_actions": data.get("encounter_quick_actions", []),
        "custom_prompt": data.get("custom_prompt", "")
    }
    return JSONResponse({"success": True})


@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    chat_session_id = data.get("chat_session_id")
    log.info(f"[POST /chat] session={session_id[:8] if session_id else None}... chat={chat_session_id} msg={data.get('message', '')[:50]}...")
    if session_id not in sessions:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    if not chat_session_id:
        return JSONResponse({"error": "chat_session_id required"}, status_code=400)
    
    # Create session if it doesn't exist (e.g., "encounter" for EncounterPanel)
    session = await session_service.get_session(app_name="oscar_app", user_id=session_id, session_id=chat_session_id)
    if not session:
        await session_service.create_session(app_name="oscar_app", user_id=session_id, session_id=chat_session_id, state={"session_id": session_id})
    
    # Prepend context to message if provided
    message = data.get("message", "")
    if data.get("context"):
        log.info(f"[POST /chat] Prepending context ({len(data['context'])} chars)")
        message = f"{data['context']}\n\n{message}"
    
    # Get custom prompt for this user
    provider_id = sessions[session_id].get("provider_id")
    custom_prompt = personalization.get(provider_id, {}).get("custom_prompt", "") if provider_id else ""
    agent = get_agent(custom_prompt)
    agent_runner = Runner(agent=agent, app_name="oscar_app", session_service=session_service)
    
    async def event_stream():
        import json
        import re
        parts = [types.Part(text=message)] if message else []
        
        # Store attachments in session for tool access
        attachments = data.get("attachments", [])
        if attachments:
            sessions[session_id]["pending_attachments"] = attachments
        
        for att in attachments:
            import base64
            parts.append(types.Part(inline_data=types.Blob(mime_type=att["type"], data=base64.b64decode(att["data"]))))
            parts.append(types.Part(text=f"[Attached file: {att['name']}, type: {att['type']}. To save this document, use save_document with file_contents='USE_PENDING_ATTACHMENT']"))
        content = types.Content(role="user", parts=parts)
        run_config = RunConfig(streaming_mode=StreamingMode.SSE)
        streamed_text = ""
        try:
            async for event in agent_runner.run_async(user_id=session_id, session_id=chat_session_id, new_message=content, run_config=run_config):
                if not event.content or not event.content.parts:
                    continue
                for part in event.content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        desc = TOOL_DESCRIPTIONS.get(part.function_call.name, f"Calling {part.function_call.name}...")
                        yield f"data: {json.dumps({'type': 'tool_call', 'name': part.function_call.name, 'description': desc})}\n\n"
                    elif hasattr(part, 'function_response') and part.function_response:
                        yield f"data: {json.dumps({'type': 'tool_result', 'name': part.function_response.name})}\n\n"
                    elif hasattr(part, 'text') and part.text:
                        if event.is_final_response():
                            suggested_actions = []
                            match = re.search(r'\[QUICK_ACTIONS:\s*(.+?)\]', part.text)
                            if match:
                                suggested_actions = [a.strip().strip('"') for a in match.group(1).split(',')]
                            yield f"data: {json.dumps({'type': 'response', 'suggested_actions': suggested_actions})}\n\n"
                        else:
                            chunk = re.sub(r'\[QUICK_ACTIONS:[^\]]+\]', '', part.text)
                            # Skip if this is the cumulative chunk (equals accumulated text)
                            if chunk and chunk != streamed_text:
                                streamed_text += chunk
                                yield f"data: {json.dumps({'type': 'text_chunk', 'text': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'response', 'text': f'Error: {e}'})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ============ Encounter Recording WebSocket ============

@app.websocket("/recording/")
async def recording_websocket(websocket: WebSocket):
    await websocket.accept()
    log.info("[WS /recording/] Connection opened")
    
    async def send_transcript(data: dict):
        await websocket.send_json(data)
    
    transcriber = EncounterTranscriber(send_transcript)
    
    try:
        while True:
            data = await websocket.receive()
            if "text" in data and data["text"] == "end":
                log.info("[WS /recording/] End signal received, finishing...")
                final_text = await transcriber.finish()
                log.info(f"[WS /recording/] Final transcription: {final_text[:100]}..." if len(final_text) > 100 else f"[WS /recording/] Final transcription: {final_text}")
                await websocket.send_json({"type": "complete", "text": final_text})
                break
            elif "bytes" in data:
                await transcriber.process_chunk(data["bytes"])
    except WebSocketDisconnect:
        log.info("[WS /recording/] Connection closed")


@app.on_event("shutdown")
async def shutdown_event():
    await medical_mcp_toolset.close()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
