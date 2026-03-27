"""Speech-to-Text service using mlx-whisper.

Transcribes complete audio segments (PCM 16-bit, 16 kHz mono) into text.
Runs locally on Apple Silicon via the MLX framework.
"""

from __future__ import annotations

import asyncio
import io
import struct
import tempfile
import wave
from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    language: str
    duration_s: float


@dataclass
class STTConfig:
    model_name: str = "mlx-community/whisper-large-v3-turbo"
    language: str = "fr"
    sample_rate: int = 16_000


class STTService:
    """Wraps mlx-whisper for local speech-to-text transcription."""

    def __init__(self, config: STTConfig | None = None) -> None:
        self._config = config or STTConfig()

    async def transcribe(self, audio: bytes) -> TranscriptionResult:
        """Transcribe a complete audio segment to text.

        Args:
            audio: Raw PCM 16-bit 16 kHz mono audio bytes.

        Returns:
            TranscriptionResult with the transcribed text.
        """
        duration_s = len(audio) / (2 * self._config.sample_rate)

        wav_buffer = self._pcm_to_wav(audio)

        result = await asyncio.get_event_loop().run_in_executor(
            None, self._run_whisper, wav_buffer,
        )

        text = result.get("text", "").strip()
        language = result.get("language", self._config.language)

        return TranscriptionResult(
            text=text,
            language=language,
            duration_s=duration_s,
        )

    def _pcm_to_wav(self, pcm_data: bytes) -> bytes:
        """Convert raw PCM 16-bit mono to WAV format."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self._config.sample_rate)
            wf.writeframes(pcm_data)
        return buf.getvalue()

    def _run_whisper(self, wav_data: bytes) -> dict:
        """Run mlx-whisper transcription (blocking, run in executor)."""
        import mlx_whisper

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(wav_data)
            tmp.flush()
            return mlx_whisper.transcribe(
                tmp.name,
                path_or_hf_repo=self._config.model_name,
                language=self._config.language,
            )
