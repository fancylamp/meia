# OSCAR Server backend

Server for OSCAR medical records REST APIs.

### Authentication
- `create_session_from_oscar_credentials(provider_no, session_id)` - Create OAuth session from OSCAR credentials

## OAuth 1.0 Authentication

1. Extract `provider_no` and `session_id` from OSCAR browser session
2. Generate OAuth 1.0 tokens using OSCAR's OAuth endpoint
3. Use tokens for authenticated API requests

## Setup

```bash
uv sync
```

## Usage

```bash
uv run server.py  # Runs on http://localhost:8000
```