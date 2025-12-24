"""Tests for provider_tools.py"""

import pytest
from unittest.mock import patch


class TestGetProviders:
    def test_get_providers(self, mock_tool_context, mock_oscar_response):
        with patch("provider_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([{"providerNo": "1", "firstName": "Dr"}])
            
            from provider_tools import get_providers
            result = get_providers(mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/providerService/providers_json", "test-session-123")


class TestGetCurrentProvider:
    def test_get_current_provider(self, mock_tool_context, mock_oscar_response):
        with patch("provider_tools.oscar_request") as mock_req, \
             patch("provider_tools.handle_response") as mock_handle:
            mock_req.return_value = mock_oscar_response({"providerNo": "999", "firstName": "Current"})
            mock_handle.return_value = {"providerNo": "999", "firstName": "Current"}
            
            from provider_tools import get_current_provider
            result = get_current_provider(mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/providerService/provider/me", "test-session-123")
            assert result["providerNo"] == "999"


class TestSearchProviders:
    def test_search_providers(self, mock_tool_context, mock_oscar_response):
        with patch("provider_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([{"providerNo": "1"}])
            
            from provider_tools import search_providers
            result = search_providers("Smith", mock_tool_context, active=False)
            
            json_data = mock_req.call_args[1]["json"]
            assert json_data["searchTerm"] == "Smith"
            assert json_data["active"] == "false"
