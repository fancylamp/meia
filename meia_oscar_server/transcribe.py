"""AWS Transcribe - Raw PCM input from frontend"""

import asyncio
import io
import uuid
import json
import boto3
from amazon_transcribe.client import TranscribeStreamingClient
from amazon_transcribe.handlers import TranscriptResultStreamHandler
from amazon_transcribe.model import TranscriptEvent


class LiveTranscriptHandler(TranscriptResultStreamHandler):
    def __init__(self, stream, callback):
        super().__init__(stream)
        self.callback = callback

    async def handle_transcript_event(self, event: TranscriptEvent):
        for result in event.transcript.results:
            if result.alternatives:
                text = result.alternatives[0].transcript
                if text:
                    await self.callback(text, is_partial=result.is_partial)


class EncounterTranscriber:
    def __init__(self, send_callback):
        self.send_callback = send_callback
        self.pcm_chunks: list[bytes] = []
        self.stream = None
        self.handler_task = None
        self.last_final_text = ""

    async def start_streaming(self):
        client = TranscribeStreamingClient(region="ca-central-1")
        self.stream = await client.start_stream_transcription(
            language_code="en-US",
            media_sample_rate_hz=48000,
            media_encoding="pcm",
        )
        handler = LiveTranscriptHandler(self.stream.output_stream, self._on_transcript)
        self.handler_task = asyncio.create_task(self._run_handler(handler))

    async def _run_handler(self, handler):
        try:
            await handler.handle_events()
        except Exception:
            pass

    async def _on_transcript(self, text: str, is_partial: bool):
        if is_partial:
            await self.send_callback({"text": self.last_final_text + text, "partial": True})
        else:
            self.last_final_text += text + " "
            await self.send_callback({"text": self.last_final_text.strip(), "partial": False})

    async def process_chunk(self, pcm_bytes: bytes):
        self.pcm_chunks.append(pcm_bytes)
        if not self.stream:
            await self.start_streaming()
        try:
            await self.stream.input_stream.send_audio_event(audio_chunk=pcm_bytes)
        except Exception:
            pass

    async def finish(self) -> str:
        if self.stream:
            await self.stream.input_stream.end_stream()
            if self.handler_task:
                await self.handler_task

        if not self.pcm_chunks:
            return self.last_final_text.strip()

        # Create WAV for batch transcription
        combined = b"".join(self.pcm_chunks)
        return await self._batch_transcribe(combined)

    async def _batch_transcribe(self, pcm_data: bytes) -> str:
        # Build WAV header
        wav = io.BytesIO()
        wav.write(b"RIFF")
        wav.write((36 + len(pcm_data)).to_bytes(4, "little"))
        wav.write(b"WAVEfmt ")
        wav.write((16).to_bytes(4, "little"))  # chunk size
        wav.write((1).to_bytes(2, "little"))   # PCM format
        wav.write((1).to_bytes(2, "little"))   # mono
        wav.write((48000).to_bytes(4, "little"))  # sample rate
        wav.write((96000).to_bytes(4, "little"))  # byte rate
        wav.write((2).to_bytes(2, "little"))   # block align
        wav.write((16).to_bytes(2, "little"))  # bits per sample
        wav.write(b"data")
        wav.write(len(pcm_data).to_bytes(4, "little"))
        wav.write(pcm_data)
        wav_data = wav.getvalue()

        s3 = boto3.client("s3")
        transcribe = boto3.client("transcribe", region_name="ca-central-1")
        bucket = "meia-transcribe-temp"
        key = f"encounters/{uuid.uuid4()}.wav"

        s3.upload_fileobj(io.BytesIO(wav_data), bucket, key)

        job_name = f"encounter-{uuid.uuid4()}"
        transcribe.start_medical_transcription_job(
            MedicalTranscriptionJobName=job_name,
            LanguageCode="en-US",
            MediaFormat="wav",
            Media={"MediaFileUri": f"s3://{bucket}/{key}"},
            OutputBucketName=bucket,
            Specialty="PRIMARYCARE",
            Type="CONVERSATION",
        )

        while True:
            resp = transcribe.get_medical_transcription_job(MedicalTranscriptionJobName=job_name)
            status = resp["MedicalTranscriptionJob"]["TranscriptionJobStatus"]
            if status == "COMPLETED":
                result_key = f"medical/{job_name}.json"
                obj = s3.get_object(Bucket=bucket, Key=result_key)
                result = json.loads(obj["Body"].read())
                text = result["results"]["transcripts"][0]["transcript"]
                s3.delete_object(Bucket=bucket, Key=key)
                s3.delete_object(Bucket=bucket, Key=result_key)
                return text
            elif status == "FAILED":
                s3.delete_object(Bucket=bucket, Key=key)
                raise Exception("Transcription failed")
            await asyncio.sleep(1)
