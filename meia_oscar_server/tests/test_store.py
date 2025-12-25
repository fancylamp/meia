"""Tests for store.py DynamoDB + S3 persistence"""

import pytest
from unittest.mock import patch, MagicMock
import store


@pytest.fixture(autouse=True)
def reset_store():
    """Reset store initialization state before each test"""
    store._initialized = False
    store.table = None


@pytest.fixture
def mock_resources():
    """Mock DynamoDB and S3 resources"""
    mock_table = MagicMock()
    mock_s3 = MagicMock()
    with patch.object(store, 'dynamodb') as mock_ddb, \
         patch.object(store, 's3', mock_s3):
        mock_ddb.Table.return_value = mock_table
        mock_ddb.meta.client.exceptions.ResourceInUseException = Exception
        mock_ddb.create_table.side_effect = Exception()  # Table exists
        mock_s3.exceptions.BucketAlreadyOwnedByYou = Exception
        mock_s3.exceptions.BucketAlreadyExists = Exception
        mock_s3.create_bucket.side_effect = Exception()  # Bucket exists
        yield {"table": mock_table, "s3": mock_s3}


class TestPersonalization:
    def test_get_personalization_returns_defaults(self, mock_resources):
        mock_resources["table"].get_item.return_value = {}
        result = store.get_personalization("123")
        assert "quick_actions" in result
        assert "custom_prompt" in result
        assert result["custom_prompt"] == ""

    def test_get_personalization_merges_stored(self, mock_resources):
        mock_resources["table"].get_item.return_value = {
            "Item": {"personalization": {"custom_prompt": "Be helpful"}}
        }
        result = store.get_personalization("123")
        assert result["custom_prompt"] == "Be helpful"
        assert "quick_actions" in result  # defaults still present

    def test_save_personalization(self, mock_resources):
        store.save_personalization("123", {"custom_prompt": "test"})
        mock_resources["table"].update_item.assert_called_once()


class TestChatSessions:
    def test_get_chat_sessions_empty(self, mock_resources):
        mock_resources["table"].get_item.return_value = {}
        result = store.get_chat_sessions("123")
        assert result == []

    def test_get_chat_sessions_returns_list(self, mock_resources):
        mock_resources["table"].get_item.return_value = {
            "Item": {"chat_sessions": ["a", "b"]}
        }
        result = store.get_chat_sessions("123")
        assert result == ["a", "b"]

    def test_add_chat_session(self, mock_resources):
        store.add_chat_session("123", "chat-1")
        mock_resources["table"].update_item.assert_called_once()

    def test_remove_chat_session(self, mock_resources):
        mock_resources["table"].get_item.return_value = {
            "Item": {"chat_sessions": ["a", "b"]}
        }
        store.remove_chat_session("123", "a")
        mock_resources["table"].update_item.assert_called()


class TestChatHistory:
    def test_get_chat_history_empty(self, mock_resources):
        mock_resources["s3"].get_object.side_effect = Exception()
        result = store.get_chat_history("123", "chat-1")
        assert result == []

    def test_save_chat_history(self, mock_resources):
        store.save_chat_history("123", "chat-1", [{"text": "hi", "isUser": True}])
        mock_resources["s3"].put_object.assert_called_once()

    def test_append_chat_message(self, mock_resources):
        mock_resources["s3"].get_object.side_effect = Exception()  # empty history
        store.append_chat_message("123", "chat-1", {"text": "hi", "isUser": True})
        mock_resources["s3"].put_object.assert_called_once()

    def test_delete_chat_history(self, mock_resources):
        store.delete_chat_history("123", "chat-1")
        mock_resources["s3"].delete_object.assert_called_once()


class TestClinicConfig:
    def test_get_clinic_config_empty(self, mock_resources):
        mock_resources["table"].get_item.return_value = {}
        result = store.get_clinic_config()
        assert result == {}

    def test_get_clinic_config_returns_config(self, mock_resources):
        mock_resources["table"].get_item.return_value = {
            "Item": {"config": {"phone_number": "+1555"}}
        }
        result = store.get_clinic_config()
        assert result["phone_number"] == "+1555"

    def test_save_clinic_config(self, mock_resources):
        store.save_clinic_config({"phone_number": "+1555"})
        mock_resources["table"].update_item.assert_called_once()
