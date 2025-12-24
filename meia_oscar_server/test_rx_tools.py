"""Tests for rx_tools.py"""

import pytest
from unittest.mock import patch


class TestGetPatientMedications:
    def test_get_patient_medications_current(self, mock_tool_context, mock_oscar_response):
        with patch("rx_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([{"drugId": 1, "brandName": "Aspirin"}])
            
            from rx_tools import get_patient_medications
            result = get_patient_medications(1, mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/rx/drugs/current/1", "test-session-123")

    def test_get_patient_medications_archived(self, mock_tool_context, mock_oscar_response):
        with patch("rx_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([])
            
            from rx_tools import get_patient_medications
            get_patient_medications(1, mock_tool_context, status="archived")
            
            mock_req.assert_called_once_with("GET", "/ws/services/rx/drugs/archived/1", "test-session-123")


class TestGetPrescriptions:
    def test_get_prescriptions(self, mock_tool_context, mock_oscar_response):
        with patch("rx_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([{"scriptNo": 1}])
            
            from rx_tools import get_prescriptions
            result = get_prescriptions(1, mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/rx/prescriptions", "test-session-123", params={"demographicNo": 1})


class TestGetDrugHistory:
    def test_get_drug_history(self, mock_tool_context, mock_oscar_response):
        with patch("rx_tools.oscar_request") as mock_req:
            mock_req.return_value = mock_oscar_response([])
            
            from rx_tools import get_drug_history
            get_drug_history(100, 1, mock_tool_context)
            
            mock_req.assert_called_once_with("GET", "/ws/services/rx/history", "test-session-123", params={"id": 100, "demographicNo": 1})
