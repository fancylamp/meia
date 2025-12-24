# OSCAR Server backend

Server for OSCAR medical records REST APIs.

## Setup

```bash
uv sync
```

## Environment Variables

```bash
# Required for Contact Hub (AI phone system)
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token

# Required for ngrok tunnel (for local development)
export NGROK_AUTHTOKEN=your_ngrok_authtoken

# Only needed if NOT using start-tunnel.js
export BACKEND_PUBLIC_URL=https://your-public-url.com
```

## Run Server

```bash
uv run python server.py  # Runs on http://localhost:8000
```

## Local Development with Ngrok (Test Only)

For testing Twilio webhooks locally:

```bash
npm install @ngrok/ngrok  # Install locally in this directory
node start-tunnel.js  # Starts server + ngrok, BACKEND_PUBLIC_URL set automatically
```

## Testing

```bash
# Install dev dependencies
uv sync --extra dev

# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest test_demographic_tools.py

# Run with coverage (requires pytest-cov)
uv run pytest --cov=. --cov-report=term-missing
```

## OAuth 1.0 Authentication

1. Extract `provider_no` and `session_id` from OSCAR browser session
2. Generate OAuth 1.0 tokens using OSCAR's OAuth endpoint
3. Use tokens for authenticated API requests
