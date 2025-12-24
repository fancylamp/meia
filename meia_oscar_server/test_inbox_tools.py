"""Tests for inbox_tools.py"""

import pytest
from unittest.mock import MagicMock
import sys


@pytest.fixture(autouse=True)
def setup_tools_module(mock_sessions):
    """Setup tools module before importing inbox_tools"""
    mock_tools = MagicMock()
    mock_tools.oscar_request = MagicMock()
    sys.modules['tools'] = mock_tools
    
    import tools
    tools.sessions = mock_sessions
    
    yield mock_tools
    
    if 'inbox_tools' in sys.modules:
        del sys.modules['inbox_tools']


class TestGetMyInbox:
    def test_get_my_inbox(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response([{"id": 1, "type": "LAB"}])
        
        if 'inbox_tools' in sys.modules:
            del sys.modules['inbox_tools']
        import inbox_tools
        
        result = inbox_tools.get_my_inbox(mock_tool_context, limit=10)
        
        setup_tools_module.oscar_request.assert_called_once_with(
            "GET", "/ws/services/inbox/mine", "test-session-123", params={"limit": 10}
        )


class TestGetInboxCount:
    def test_get_inbox_count(self, mock_tool_context, mock_oscar_response, setup_tools_module):
        setup_tools_module.oscar_request.return_value = mock_oscar_response(text="5")
        
        if 'inbox_tools' in sys.modules:
            del sys.modules['inbox_tools']
        import inbox_tools
        
        result = inbox_tools.get_inbox_count(mock_tool_context)
        
        assert result["count"] == "5"
