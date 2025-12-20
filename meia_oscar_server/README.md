# OSCAR Server backend

Server for OSCAR medical records REST APIs.

## Available Tools

### Authentication
- `create_session_from_oscar_credentials(provider_no, session_id)` - Create OAuth session from OSCAR credentials

### Patient Management
- `search_patients(query, limit=10)` - Search patients by name, address, or chart number
- `get_patient_details(patient_id, include_allergies=False, include_measurements=False)` - Get detailed patient information
- `get_patient_allergies(patient_id)` - Get active allergies for a patient

## OSCAR REST APIs Available

- **Demographics**: `/ws/rs/demographics/` - Patient search, CRUD operations
- **Allergies**: `/ws/rs/allergies/` - Active allergies management
- **Measurements**: Vital signs and measurements
- **Prescriptions**: Medication management  
- **Documents**: Document management
- **Appointments**: Booking and scheduling
- **Messaging**: Internal messaging system

## OAuth 1.0 Authentication

1. Extract `provider_no` and `session_id` from OSCAR browser session
2. Generate OAuth 1.0 tokens using OSCAR's OAuth endpoint
3. Use tokens for authenticated API requests

## Setup

```bash
uv sync
```

## Usage

```bash
uv run server.py  # Runs on http://localhost:8000
```

## Voice Input

The server supports voice input via WebSocket at `/voice`. Audio is transcribed using Amazon Transcribe Medical for accurate medical terminology.

### Requirements

- ffmpeg installed (required by pydub for audio processing)
- S3 bucket for temporary audio storage
- AWS credentials (via env vars, `~/.aws/credentials`, or IAM role)

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `ca-central-1` | AWS region for S3 and Transcribe |
| `MEIA_VOICE_BUCKET` | `meia-voice-temp` | S3 bucket for temporary audio files |
| `AWS_ACCESS_KEY_ID` | - | AWS access key (optional if using IAM role) |
| `AWS_SECRET_ACCESS_KEY` | - | AWS secret key (optional if using IAM role) |

### AWS Permissions Required

- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the bucket
- `transcribe:StartMedicalTranscriptionJob`, `transcribe:GetMedicalTranscriptionJob`, `transcribe:DeleteMedicalTranscriptionJob`

### How it works

1. Frontend streams WebM audio chunks every 250ms via WebSocket
2. Backend buffers audio and detects silence using pydub
3. When 500ms of silence is detected, buffered audio is sent to Amazon Transcribe Medical
4. Transcripts are returned to the frontend via WebSocket