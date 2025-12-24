"""Pytest fixtures for OSCAR backend tests"""

import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_sessions():
    """Mock sessions dict with authenticated session"""
    return {
        "test-session-123": {
            "access_token": "test_token",
            "access_token_secret": "test_secret",
            "jsessionid": "test_jsession",
            "provider_id": "999",
        }
    }


@pytest.fixture
def mock_tool_context():
    """Mock tool context with session state"""
    ctx = MagicMock()
    ctx.state = {"session_id": "test-session-123"}
    return ctx


@pytest.fixture
def mock_oscar_response():
    """Factory for mock OSCAR API responses"""
    def _make_response(json_data=None, status_code=200, ok=True, text=""):
        resp = MagicMock()
        resp.ok = ok
        resp.status_code = status_code
        resp.text = text
        resp.json.return_value = json_data or {}
        return resp
    return _make_response
