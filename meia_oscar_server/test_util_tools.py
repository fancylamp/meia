"""Tests for util_tools.py"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from zoneinfo import ZoneInfo


class TestGetCurrentDatetime:
    def test_get_current_datetime(self, mock_tool_context):
        with patch("util_tools.datetime") as mock_dt:
            mock_now = datetime(2025, 1, 15, 10, 30, 45, tzinfo=ZoneInfo("America/Los_Angeles"))
            mock_dt.now.return_value = mock_now
            
            from util_tools import get_current_datetime
            result = get_current_datetime(mock_tool_context)
            
            assert result["date"] == "2025-01-15"
            assert result["time"] == "10:30:45"
            assert "timestamp" in result
