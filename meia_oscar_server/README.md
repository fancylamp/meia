# OSCAR Server backend

Server for OSCAR medical records REST APIs.

## Setup

```bash
uv sync
```

## Environment Variables

```bash
# OSCAR connection
export OSCAR_URL=https://your-oscar-instance/oscar
export OSCAR_CONSUMER_KEY=your_oauth_consumer_key
export OSCAR_CONSUMER_SECRET=your_oauth_consumer_secret
export BACKEND_URL=http://localhost:8000  # OAuth callback URL

# Bedrock model
export BEDROCK_MODEL=arn:aws:bedrock:region:account:inference-profile/...

# AWS resources (auto-created on first use)
export AWS_REGION=ca-central-1
export CLINIC_ID=your_clinic_id  # Used for S3 bucket name: meia-chat-{CLINIC_ID}
export DYNAMODB_TABLE=meia_providers  # Optional, defaults to meia_providers
export S3_BUCKET=meia-chat-your_clinic_id  # Optional, defaults to meia-chat-{CLINIC_ID}

# Twilio (for Contact Hub phone system)
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export BACKEND_PUBLIC_URL=https://your-public-url.com  # Twilio webhook URL
```

## Data Storage

The server uses a single-tenant model with DynamoDB + S3 for persistence:

**DynamoDB Table** (`meia_providers`):
- `provider_no` (PK) → Per-provider: personalization settings, chat session IDs
- `_clinic_config` → Shared clinic config: provisioned phone number/SID

**S3 Bucket** (`meia-chat-{CLINIC_ID}`):
- `{provider_no}/{chat_id}.json` → Chat message history

Both resources are auto-created on first access if they don't exist.

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
