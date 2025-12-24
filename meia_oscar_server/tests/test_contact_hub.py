"""Tests for Contact Hub endpoints"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with patch("server.medical_mcp_toolset"):
        from server import app
        return TestClient(app)


class TestGetContactHub:
    def test_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.get("/contact-hub?session_id=invalid")
            assert response.status_code == 401

    def test_success(self, client):
        with patch("server.sessions", {"test": {}}), \
             patch("server.clinic_config", {"phone_number": "+15551234567", "fax_number": None}):
            response = client.get("/contact-hub?session_id=test")
            assert response.status_code == 200
            assert response.json()["phone_number"] == "+15551234567"


class TestEnrollContactHub:
    def test_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.post("/contact-hub/enroll", json={"session_id": "invalid"})
            assert response.status_code == 401

    def test_already_enrolled(self, client):
        with patch("server.sessions", {"test": {}}), \
             patch("server.clinic_config", {"phone_number": "+15551234567", "phone_sid": "PN123"}):
            response = client.post("/contact-hub/enroll", json={"session_id": "test"})
            assert response.status_code == 200
            assert response.json()["phone_number"] == "+15551234567"

    def test_twilio_not_configured(self, client):
        with patch("server.sessions", {"test": {}}), \
             patch("server.clinic_config", {"phone_number": None}), \
             patch("server.TWILIO_ACCOUNT_SID", None):
            response = client.post("/contact-hub/enroll", json={"session_id": "test"})
            assert response.status_code == 500
            assert "Twilio not configured" in response.json()["error"]


class TestDeletePhone:
    def test_unauthenticated(self, client):
        with patch("server.sessions", {}):
            response = client.request("DELETE", "/contact-hub/phone", json={"session_id": "invalid"})
            assert response.status_code == 401

    def test_no_phone_enrolled(self, client):
        mock_twilio = MagicMock()
        mock_twilio.incoming_phone_numbers.list.return_value = []
        with patch("server.sessions", {"test": {}}), \
             patch("server.clinic_config", {"phone_number": None, "phone_sid": None}), \
             patch("twilio.rest.Client", return_value=mock_twilio):
            response = client.request("DELETE", "/contact-hub/phone", json={"session_id": "test"})
            assert response.status_code == 400
            assert "No phone enrolled" in response.json()["error"]


class TestCallIncoming:
    def test_returns_twiml(self, client):
        response = client.post("/call/incoming", headers={"host": "example.com"})
        assert response.status_code == 200
        assert "application/xml" in response.headers["content-type"]
        assert "<Stream url=\"wss://example.com/call/\"" in response.text
