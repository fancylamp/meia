"""Tests for demographic_tools.py"""

import pytest
from unittest.mock import patch, MagicMock


class TestSearchPatients:
    def test_search_patients_success(self, mock_tool_context, mock_oscar_response, mock_sessions):
        with patch("demographic_tools.oscar_request") as mock_req, \
             patch("demographic_tools.handle_response") as mock_handle:
            mock_req.return_value = mock_oscar_response([{"demographicNo": 1, "firstName": "John", "lastName": "Doe"}])
            mock_handle.return_value = [{"demographicNo": 1, "firstName": "John", "lastName": "Doe"}]
            
            from demographic_tools import search_patients
            result = search_patients("John", mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/demographics/quickSearch", "test-session-123", params={"query": "John"})
            assert result == [{"demographicNo": 1, "firstName": "John", "lastName": "Doe"}]

    def test_search_patients_error(self, mock_tool_context, mock_oscar_response):
        with patch("demographic_tools.oscar_request") as mock_req, \
             patch("demographic_tools.handle_response") as mock_handle:
            mock_req.return_value = mock_oscar_response(ok=False, status_code=500, text="Server error")
            mock_handle.return_value = {"error": 500, "text": "Server error"}
            
            from demographic_tools import search_patients
            result = search_patients("test", mock_tool_context)
            
            assert result == {"error": 500, "text": "Server error"}


class TestGetPatientDetails:
    def test_get_patient_details_success(self, mock_tool_context, mock_oscar_response):
        with patch("demographic_tools.oscar_request") as mock_req, \
             patch("demographic_tools.handle_response") as mock_handle:
            mock_req.return_value = mock_oscar_response({"demographicNo": 1, "firstName": "Jane"})
            mock_handle.return_value = {"demographicNo": 1, "firstName": "Jane"}
            
            from demographic_tools import get_patient_details
            result = get_patient_details(1, mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/demographics/1", "test-session-123")
            assert result["firstName"] == "Jane"


class TestGetPatientAllergies:
    def test_get_patient_allergies_success(self, mock_tool_context, mock_oscar_response):
        with patch("demographic_tools.oscar_request") as mock_req, \
             patch("demographic_tools.handle_response") as mock_handle:
            mock_req.return_value = mock_oscar_response([{"description": "Penicillin", "severity": "High"}])
            mock_handle.return_value = [{"description": "Penicillin", "severity": "High"}]
            
            from demographic_tools import get_patient_allergies
            result = get_patient_allergies(1, mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/allergies/active", "test-session-123", params={"demographicNo": 1})
            assert result[0]["description"] == "Penicillin"


class TestCreatePatient:
    def test_create_patient_minimal(self, mock_tool_context, mock_oscar_response):
        with patch("demographic_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response({"demographicNo": 100})
            
            from demographic_tools import create_patient
            result = create_patient("John", "Doe", "1990-05-15", "M", mock_tool_context)
            
            call_args = mock_req.call_args
            assert call_args[0] == ("POST", "/ws/services/demographics", "test-session-123")
            json_data = call_args[1]["json"]
            assert json_data["firstName"] == "John"
            assert json_data["lastName"] == "Doe"
            assert json_data["dobYear"] == "1990"
            assert json_data["dobMonth"] == "05"
            assert json_data["dobDay"] == "15"
            assert json_data["sex"] == "M"

    def test_create_patient_with_address(self, mock_tool_context, mock_oscar_response):
        with patch("demographic_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response({"demographicNo": 101})
            
            from demographic_tools import create_patient
            result = create_patient("Jane", "Smith", "1985-12-01", "F", mock_tool_context,
                                    address="123 Main St", city="Toronto", province="ON", postal="M5V 1A1")
            
            json_data = mock_req.call_args[1]["json"]
            assert json_data["address"]["address"] == "123 Main St"
            assert json_data["address"]["city"] == "Toronto"
            assert json_data["address"]["province"] == "ON"
            assert json_data["address"]["postal"] == "M5V 1A1"
