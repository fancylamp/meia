"""Tests for server.py FastAPI endpoints"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client with mocked dependencies"""
    with patch("server.medical_mcp_toolset"):
        from server import app
        return TestClient(app)


@pytest.fixture
def authenticated_session():
    """Setup authenticated session in server.sessions"""
    with patch("server.sessions", {
        "test-session": {
            "access_token": "token",
            "access_token_secret": "secret",
            "provider_id": "999"
        }
    }):
        yield


class TestAuthStatus:
    def test_auth_status_authenticated(self, client):
        with patch("server.sessions", {"test-session": {}}):
            response = client.get("/auth/status?session_id=test-session")
            assert response.status_code == 200
            assert response.json()["authenticated"] is True

    def test_auth_status_not_authenticated(self, client):
        with patch("server.sessions", {}):
            response = client.get("/auth/status?session_id=unknown")
            assert response.status_code == 200
            assert response.json()["authenticated"] is False


class TestChatSessions:
    def test_create_chat_session_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.post("/chat-sessions", json={"session_id": "invalid"})
            assert response.status_code == 401

    def test_list_chat_sessions_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.get("/chat-sessions?session_id=invalid")
            assert response.status_code == 401


class TestPersonalization:
    def test_get_personalization_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.get("/personalization?session_id=invalid")
            assert response.status_code == 401

    def test_get_personalization_no_provider(self, client):
        with patch("server.sessions", {"test": {}}):
            response = client.get("/personalization?session_id=test")
            assert response.status_code == 400

    def test_get_personalization_success(self, client):
        with patch("server.sessions", {"test": {"provider_id": "999"}}), \
             patch("store.get_personalization", return_value={"quick_actions": [], "custom_prompt": ""}):
            response = client.get("/personalization?session_id=test")
            assert response.status_code == 200
            data = response.json()
            assert "quick_actions" in data
            assert "custom_prompt" in data


class TestChat:
    def test_chat_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.post("/chat", json={"session_id": "invalid", "message": "hi"})
            assert response.status_code == 401

    def test_chat_missing_chat_session_id(self, client):
        with patch("server.sessions", {"test": {}}):
            response = client.post("/chat", json={"session_id": "test", "message": "hi"})
            assert response.status_code == 400
