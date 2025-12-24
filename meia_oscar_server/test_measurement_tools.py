"""Tests for measurement_tools.py"""

import pytest
from unittest.mock import patch


class TestGetPatientMeasurements:
    def test_get_patient_measurements(self, mock_tool_context, mock_oscar_response):
        with patch("measurement_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([{"type": "BP", "dataField": "120/80"}])
            
            from measurement_tools import get_patient_measurements
            result = get_patient_measurements(1, ["BP", "HR"], mock_tool_context)
            
            mock_req.assert_called_once_with("POST", "/ws/services/measurements/1", "test-session-123", json={"types": ["BP", "HR"]})
            assert result[0]["type"] == "BP"


class TestSaveMeasurement:
    def test_save_measurement(self, mock_tool_context, mock_oscar_response):
        with patch("measurement_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response({"id": 1, "type": "WT"})
            
            from measurement_tools import save_measurement
            result = save_measurement(1, "WT", "75.5", "2025-01-15", mock_tool_context, comments="Morning weight")
            
            json_data = mock_req.call_args[1]["json"]
            assert json_data["type"] == "WT"
            assert json_data["dataField"] == "75.5"
            assert json_data["dateObserved"] == "2025-01-15"
            assert json_data["comments"] == "Morning weight"
