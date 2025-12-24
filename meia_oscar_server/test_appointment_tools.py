"""Tests for appointment_tools.py"""

import pytest
from unittest.mock import patch, MagicMock
import sys


@pytest.fixture(autouse=True)
def setup_tools_module(mock_sessions):
    """Setup tools module before importing appointment_tools"""
    # Mock the tools module to avoid circular import
    mock_tools = MagicMock()
    mock_tools.oscar_request = MagicMock()
    sys.modules['tools'] = mock_tools
    
    # Initialize with mock sessions
    import tools
    tools.OSCAR_URL = "http://test"
    tools.CONSUMER_KEY = "key"
    tools.CONSUMER_SECRET = "secret"
    tools.sessions = mock_sessions
    
    yield mock_tools
    
    # Cleanup
    if 'appointment_tools' in sys.modules:
        del sys.modules['appointment_tools']


class TestGetDailyAppointments:
    def test_get_daily_appointments_all_providers(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response([{"id": 1}])
        
        # Import after mocking
        import importlib
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        result = appointment_tools.get_daily_appointments("2025-01-15", mock_tool_context)
        
        setup_tools_module.oscar_request.assert_called_once_with(
            "GET", "/ws/services/schedule/day/2025-01-15", "test-session-123"
        )

    def test_get_daily_appointments_specific_provider(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response([])
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        appointment_tools.get_daily_appointments("2025-01-15", mock_tool_context, provider_no="123")
        
        setup_tools_module.oscar_request.assert_called_once_with(
            "GET", "/ws/services/schedule/123/day/2025-01-15", "test-session-123"
        )


class TestCreateAppointment:
    def test_create_appointment_time_conversion_pm(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"id": 1})
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        appointment_tools.create_appointment(1, "999", "2025-01-15", "14:30", 30, mock_tool_context)
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["startTime12hWithMedian"] == "2:30 PM"
        assert json_data["duration"] == 30
        assert json_data["status"] == "t"

    def test_create_appointment_time_conversion_am(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"id": 2})
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        appointment_tools.create_appointment(1, "999", "2025-01-15", "09:00", 15, mock_tool_context)
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["startTime12hWithMedian"] == "9:00 AM"

    def test_create_appointment_noon(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"id": 3})
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        appointment_tools.create_appointment(1, "999", "2025-01-15", "12:00", 60, mock_tool_context)
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["startTime12hWithMedian"] == "12:00 PM"

    def test_create_appointment_with_optional_fields(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"id": 4})
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        appointment_tools.create_appointment(1, "999", "2025-01-15", "10:00", 30, mock_tool_context,
                                             reason="Follow-up", notes="Patient notes", status="H")
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["reason"] == "Follow-up"
        assert json_data["notes"] == "Patient notes"
        assert json_data["status"] == "H"


class TestUpdateAppointmentStatus:
    def test_update_appointment_status(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"success": True})
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        appointment_tools.update_appointment_status(123, "B", mock_tool_context)
        
        setup_tools_module.oscar_request.assert_called_once_with(
            "POST", "/ws/services/schedule/appointment/123/updateStatus",
            "test-session-123", json={"status": "B"}
        )


class TestDeleteAppointment:
    def test_delete_appointment_success(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response(status_code=200)
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        result = appointment_tools.delete_appointment(123, mock_tool_context)
        
        assert result["success"] is True

    def test_delete_appointment_failure(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response(ok=False, status_code=404, text="Not found")
        
        if 'appointment_tools' in sys.modules:
            del sys.modules['appointment_tools']
        import appointment_tools
        
        result = appointment_tools.delete_appointment(999, mock_tool_context)
        
        assert result["error"] == 404
