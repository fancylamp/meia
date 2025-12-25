"""Unit tests for call_handler.py"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from call_handler import CallSession


@pytest.fixture
def session():
    """Create a CallSession with mock callbacks"""
    return CallSession("stream123", "call123", AsyncMock(), AsyncMock())


class TestVerifyPatient:
    def test_invalid_dob_format(self, session):
        result = session._verify_patient("John Doe", "invalid", None)
        assert result == {"error": "Invalid date format."}

    @patch("call_handler.oscar_client.search_patients")
    def test_no_patient_found(self, mock_search, session):
        mock_search.return_value = []
        result = session._verify_patient("John Doe", "1990-01-15", None)
        assert "No patient found" in result["error"]

    @patch("call_handler.oscar_client.search_patients")
    def test_dob_mismatch(self, mock_search, session):
        mock_search.return_value = [{"demographicNo": 1, "dob": 0}]
        result = session._verify_patient("John Doe", "1990-01-15", None)
        assert "Date of birth does not match" in result["error"]

    @patch("call_handler.oscar_client.search_patients")
    def test_single_match_success(self, mock_search, session):
        # 1990-01-15 00:00:00 UTC in milliseconds
        dob_millis = 632361600000
        mock_search.return_value = [{"demographicNo": 42, "dob": dob_millis}]
        result = session._verify_patient("John", "1990-01-15", None)
        assert result["success"] is True
        assert session.verified_demographic_no == 42

    @patch("call_handler.oscar_client.search_patients")
    def test_multiple_matches_needs_phone(self, mock_search, session):
        dob_millis = 632361600000
        mock_search.return_value = [
            {"demographicNo": 1, "dob": dob_millis},
            {"demographicNo": 2, "dob": dob_millis},
        ]
        result = session._verify_patient("John", "1990-01-15", None)
        assert result["need_phone"] is True

    @patch("call_handler.oscar_client.search_patients")
    def test_phone_disambiguation(self, mock_search, session):
        dob_millis = 632361600000
        mock_search.return_value = [
            {"demographicNo": 1, "dob": dob_millis, "phone": "555-1111"},
            {"demographicNo": 2, "dob": dob_millis, "phone": "555-2222"},
        ]
        result = session._verify_patient("John", "1990-01-15", "2222")
        assert result["success"] is True
        assert session.verified_demographic_no == 2


class TestExecuteTool:
    def test_unverified_blocks_protected_tools(self, session):
        for tool in ["get_my_appointments", "book_appointment", "cancel_appointment"]:
            result = session._execute_tool(tool, {})
            assert "Identity not verified" in result["error"]

    @patch("call_handler.oscar_client.get_providers")
    def test_get_providers(self, mock_get, session):
        mock_get.return_value = [{"providerNo": "123", "firstName": "Jane", "lastName": "Smith"}]
        result = session._execute_tool("get_providers", {})
        assert result["providers"] == [{"provider_no": "123", "name": "Jane Smith"}]

    @patch("call_handler.oscar_client.get_day_appointments")
    def test_get_day_schedule(self, mock_get, session):
        mock_get.return_value = [{"startTime": "10:00 AM"}]
        result = session._execute_tool("get_day_schedule", {"provider_no": "123", "date": "2025-01-01"})
        assert result["booked_appointments"] == [{"startTime": "10:00 AM"}]
        assert "9am-5pm" in result["note"]

    @patch("call_handler.oscar_client.get_patient_appointments")
    def test_get_my_appointments_verified(self, mock_get, session):
        session.verified_demographic_no = 42
        mock_get.return_value = [{"id": 1}]
        result = session._execute_tool("get_my_appointments", {})
        assert result["appointments"] == [{"id": 1}]
        mock_get.assert_called_with(42)

    @patch("call_handler.oscar_client.create_appointment")
    def test_book_appointment_success(self, mock_create, session):
        session.verified_demographic_no = 42
        mock_create.return_value = {"id": 99}
        result = session._execute_tool("book_appointment", {"date": "2025-01-01", "time": "10:00"})
        assert result["success"] is True
        assert result["appointment"]["id"] == 99

    @patch("call_handler.oscar_client.create_appointment")
    def test_book_appointment_failure(self, mock_create, session):
        session.verified_demographic_no = 42
        mock_create.return_value = None
        result = session._execute_tool("book_appointment", {"date": "2025-01-01", "time": "10:00"})
        assert "Failed to book" in result["error"]

    @patch("call_handler.oscar_client.cancel_appointment")
    def test_cancel_appointment_success(self, mock_cancel, session):
        session.verified_demographic_no = 42
        mock_cancel.return_value = True
        result = session._execute_tool("cancel_appointment", {"appointment_id": 99})
        assert result["success"] is True

    @patch("call_handler.oscar_client.cancel_appointment")
    def test_cancel_appointment_failure(self, mock_cancel, session):
        session.verified_demographic_no = 42
        mock_cancel.return_value = False
        result = session._execute_tool("cancel_appointment", {"appointment_id": 99})
        assert "Failed to cancel" in result["error"]

    def test_unknown_tool(self, session):
        session.verified_demographic_no = 42  # Bypass verification check
        result = session._execute_tool("unknown_tool", {})
        assert "Unknown tool" in result["error"]


class TestTransferAndEndCall:
    def test_transfer_no_config(self, session):
        with patch.dict("os.environ", {}, clear=True):
            result = session._transfer_to_staff()
            assert "not available" in result["error"]

    def test_end_call_no_config(self, session):
        with patch.dict("os.environ", {}, clear=True):
            result = session._end_call()
            assert "Cannot end call" in result["error"]
