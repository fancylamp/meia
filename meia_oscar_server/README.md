# OSCAR Server backend

Server for OSCAR medical records REST APIs.

## Setup

```bash
uv sync
```

## Run Server

```bash
uv run python server.py  # Runs on http://localhost:8000
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
