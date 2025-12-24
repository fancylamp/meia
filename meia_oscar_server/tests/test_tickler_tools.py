"""Tests for tickler_tools.py"""

import pytest
from unittest.mock import MagicMock
import sys


@pytest.fixture(autouse=True)
def setup_tools_module(mock_sessions):
    """Setup tools module before importing tickler_tools"""
    mock_tools = MagicMock()
    mock_tools.oscar_request = MagicMock()
    sys.modules['tools'] = mock_tools
    
    import tools
    tools.sessions = mock_sessions
    
    yield mock_tools
    
    if 'tickler_tools' in sys.modules:
        del sys.modules['tickler_tools']


class TestGetMyTicklers:
    def test_get_my_ticklers(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response([{"id": 1, "message": "Follow up"}])
        
        if 'tickler_tools' in sys.modules:
            del sys.modules['tickler_tools']
        import tickler_tools
        
        result = tickler_tools.get_my_ticklers(mock_tool_context, limit=10)
        
        setup_tools_module.oscar_request.assert_called_once_with(
            "GET", "/ws/services/tickler/mine", "test-session-123", params={"limit": 10}
        )


class TestSearchTicklers:
    def test_search_ticklers_default(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"content": []})
        
        if 'tickler_tools' in sys.modules:
            del sys.modules['tickler_tools']
        import tickler_tools
        
        tickler_tools.search_ticklers(mock_tool_context)
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["status"] == "A"

    def test_search_ticklers_with_filters(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"content": []})
        
        if 'tickler_tools' in sys.modules:
            del sys.modules['tickler_tools']
        import tickler_tools
        
        tickler_tools.search_ticklers(mock_tool_context, status="C", priority="High", patient_id=1)
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["status"] == "C"
        assert json_data["priority"] == "High"
        assert json_data["demographicNo"] == "1"


class TestCreateTickler:
    def test_create_tickler(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"success": True})
        
        if 'tickler_tools' in sys.modules:
            del sys.modules['tickler_tools']
        import tickler_tools
        
        tickler_tools.create_tickler(1, "999", "2025-01-20", "Call patient", mock_tool_context, priority="High")
        
        json_data = setup_tools_module.oscar_request.call_args[1]["json"]
        assert json_data["demographicNo"] == 1
        assert json_data["taskAssignedTo"] == "999"
        assert json_data["message"] == "Call patient"
        assert json_data["priority"] == "High"
        assert json_data["status"] == "A"


class TestCompleteTicklers:
    def test_complete_ticklers(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response({"success": True})
        
        if 'tickler_tools' in sys.modules:
            del sys.modules['tickler_tools']
        import tickler_tools
        
        tickler_tools.complete_ticklers([1, 2, 3], mock_tool_context)
        
        setup_tools_module.oscar_request.assert_called_once_with(
            "POST", "/ws/services/tickler/complete", "test-session-123", json={"ticklers": [1, 2, 3]}
        )
