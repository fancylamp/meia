"""Voice transcription using silence detection + streaming transcription"""

import io
import os
import asyncio
import time
import boto3
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

SILENCE_THRESHOLD = -35  # dB
SILENCE_DURATION_MS = 500
AWS_REGION = os.getenv("AWS_REGION", "ca-central-1")


class VoiceTranscriber:
    """Buffers audio chunks, detects silence, transcribes complete phrases"""
    
    def __init__(self, on_transcript):
        self.on_transcript = on_transcript
        self.buffer = AudioSegment.empty()
        self.silence_ms = 0
    
    async def process_chunk(self, wav_bytes: bytes):
        """Process incoming WAV chunk, transcribe when silence detected"""
        try:
            chunk = AudioSegment.from_file(io.BytesIO(wav_bytes), format="wav")
        except Exception as e:
            print(f"[voice] chunk parse error: {e}")
            return
        
        has_speech = detect_nonsilent(chunk, min_silence_len=len(chunk), silence_thresh=SILENCE_THRESHOLD)
        
        if has_speech:
            self.buffer += chunk
            self.silence_ms = 0
        else:
            self.silence_ms += len(chunk)
            if len(self.buffer) > 0 and self.silence_ms >= SILENCE_DURATION_MS:
                await self._transcribe_buffer()
    
    async def _transcribe_buffer(self):
        """Transcribe buffered audio using Amazon Transcribe Medical Streaming"""
        if len(self.buffer) == 0:
            return
        
        audio = self.buffer.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        pcm_data = audio.raw_data
        
        self.buffer = AudioSegment.empty()
        self.silence_ms = 0
        
        start = time.time()
        try:
            transcript = await asyncio.to_thread(_transcribe_streaming, pcm_data)
            print(f"[voice] transcribe streaming: {time.time()-start:.2f}s")
            if transcript:
                await self.on_transcript(transcript)
        except Exception as e:
            print(f"[voice] transcription error: {e}")
    
    async def flush(self):
        """Transcribe any remaining buffered audio"""
        if len(self.buffer) > 0:
            await self._transcribe_buffer()


def _transcribe_streaming(pcm_data: bytes) -> str:
    """Transcribe PCM audio using Amazon Transcribe Medical Streaming"""
    from amazon_transcribe.client import TranscribeStreamingClient
    from amazon_transcribe.handlers import TranscriptResultStreamHandler
    from amazon_transcribe.model import TranscriptEvent
    import asyncio
    
    class Handler(TranscriptResultStreamHandler):
        def __init__(self, stream):
            super().__init__(stream)
            self.transcript = ""
        
        async def handle_transcript_event(self, event: TranscriptEvent):
            for result in event.transcript.results:
                if not result.is_partial and result.alternatives:
                    self.transcript += result.alternatives[0].transcript + " "
    
    async def run():
        client = TranscribeStreamingClient(region=AWS_REGION)
        stream = await client.start_stream_transcription(
            language_code="en-US",
            media_sample_rate_hz=16000,
            media_encoding="pcm",
        )
        
        handler = Handler(stream.output_stream)
        
        # Send audio in chunks
        chunk_size = 16000 * 2  # 1 second of 16kHz 16-bit audio
        for i in range(0, len(pcm_data), chunk_size):
            await stream.input_stream.send_audio_event(audio_chunk=pcm_data[i:i+chunk_size])
        await stream.input_stream.end_stream()
        
        await handler.handle_events()
        return handler.transcript.strip()
    
    return asyncio.run(run())
