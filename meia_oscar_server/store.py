"""DynamoDB + S3 store for provider data and chat history"""

import boto3
import os
import json

TABLE_NAME = os.getenv("DYNAMODB_TABLE", "meia_providers")
CLINIC_ID = os.getenv("CLINIC_ID", "default")
S3_BUCKET = os.getenv("S3_BUCKET", f"meia-chat-{CLINIC_ID}")
REGION = os.getenv("AWS_REGION", "ca-central-1")
dynamodb = boto3.resource("dynamodb", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)
table = None
_initialized = False


def _ensure_resources():
    """Create DynamoDB table and S3 bucket if they don't exist"""
    global table, _initialized
    if _initialized:
        return
    
    # Create DynamoDB table
    try:
        dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[{"AttributeName": "provider_no", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "provider_no", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST"
        )
        dynamodb.meta.client.get_waiter("table_exists").wait(TableName=TABLE_NAME)
    except dynamodb.meta.client.exceptions.ResourceInUseException:
        pass
    
    table = dynamodb.Table(TABLE_NAME)
    
    # Create S3 bucket
    try:
        s3.create_bucket(Bucket=S3_BUCKET, CreateBucketConfiguration={"LocationConstraint": REGION})
    except (s3.exceptions.BucketAlreadyOwnedByYou, s3.exceptions.BucketAlreadyExists):
        pass
    
    _initialized = True


# ============ Personalization ============

def get_personalization(provider_no: str) -> dict:
    """Get provider personalization with defaults"""
    _ensure_resources()
    defaults = {
        "quick_actions": [{"text": "What are your capabilities?", "enabled": True}, {"text": "Create a new patient", "enabled": True}],
        "encounter_quick_actions": [{"text": "Generate a note for this encounter", "enabled": True}],
        "custom_prompt": ""
    }
    try:
        resp = table.get_item(Key={"provider_no": provider_no})
        item = resp.get("Item", {})
        return {**defaults, **item.get("personalization", {})}
    except Exception:
        return defaults


def save_personalization(provider_no: str, personalization: dict):
    """Save provider personalization"""
    _ensure_resources()
    table.update_item(
        Key={"provider_no": provider_no},
        UpdateExpression="SET personalization = :p",
        ExpressionAttributeValues={":p": personalization}
    )


# ============ Chat Sessions ============

def get_chat_sessions(provider_no: str) -> list:
    """Get list of chat session IDs for provider"""
    _ensure_resources()
    try:
        resp = table.get_item(Key={"provider_no": provider_no})
        return resp.get("Item", {}).get("chat_sessions", [])
    except Exception:
        return []


def add_chat_session(provider_no: str, chat_id: str):
    """Add a chat session ID to provider's list"""
    _ensure_resources()
    table.update_item(
        Key={"provider_no": provider_no},
        UpdateExpression="SET chat_sessions = list_append(if_not_exists(chat_sessions, :empty), :c)",
        ExpressionAttributeValues={":c": [chat_id], ":empty": []}
    )


def remove_chat_session(provider_no: str, chat_id: str):
    """Remove a chat session ID from provider's list"""
    _ensure_resources()
    sessions = get_chat_sessions(provider_no)
    if chat_id in sessions:
        sessions.remove(chat_id)
        table.update_item(
            Key={"provider_no": provider_no},
            UpdateExpression="SET chat_sessions = :s",
            ExpressionAttributeValues={":s": sessions}
        )


# ============ Chat History (S3) ============

def _chat_key(provider_no: str, chat_id: str) -> str:
    return f"{provider_no}/{chat_id}.json"


def get_chat_history(provider_no: str, chat_id: str) -> list:
    """Get chat messages from S3"""
    _ensure_resources()
    try:
        resp = s3.get_object(Bucket=S3_BUCKET, Key=_chat_key(provider_no, chat_id))
        return json.loads(resp["Body"].read())
    except Exception:
        return []


def save_chat_history(provider_no: str, chat_id: str, messages: list):
    """Save chat messages to S3"""
    _ensure_resources()
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=_chat_key(provider_no, chat_id),
        Body=json.dumps(messages),
        ContentType="application/json"
    )


def append_chat_message(provider_no: str, chat_id: str, message: dict):
    """Append a message to chat history"""
    messages = get_chat_history(provider_no, chat_id)
    messages.append(message)
    save_chat_history(provider_no, chat_id, messages)


def delete_chat_history(provider_no: str, chat_id: str):
    """Delete chat history from S3"""
    _ensure_resources()
    try:
        s3.delete_object(Bucket=S3_BUCKET, Key=_chat_key(provider_no, chat_id))
    except Exception:
        pass


# ============ Clinic Config ============

DEFAULT_INSTRUCTIONS = '''Greet the caller with:
"Hello, I am a clinic administration assistant powered by artificial intelligence. How can I help you today?
I can also speak in multiple languages if you'd like so feel free to use the language you are most comfortable in". Use English as the default.
'''


def get_clinic_config() -> dict:
    """Get clinic config (phone, fax, instructions). Initializes default if not exists."""
    _ensure_resources()
    try:
        resp = table.get_item(Key={"provider_no": "_clinic_config"})
        item = resp.get("Item")
        if not item or "instructions" not in item.get("config", {}):
            config = item.get("config", {}) if item else {}
            config["instructions"] = DEFAULT_INSTRUCTIONS
            save_clinic_config(config)
            return config
        return item["config"]
    except Exception:
        return {"instructions": DEFAULT_INSTRUCTIONS}


def save_clinic_config(config: dict):
    """Save clinic config"""
    _ensure_resources()
    table.update_item(
        Key={"provider_no": "_clinic_config"},
        UpdateExpression="SET config = :c",
        ExpressionAttributeValues={":c": config}
    )
