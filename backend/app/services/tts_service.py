"""Text-to-Speech service using Chatterbox TTS.

Converts text (questions, follow-ups) into audio chunks that can be
streamed back to the client over WebSocket.
"""

from __future__ import annotations

import asyncio
import io
import struct
from collections.abc import AsyncIterator
from dataclasses import dataclass

import torch
import torchaudio


@dataclass
class TTSConfig:
    sample_rate: int = 24_000
    chunk_size: int = 4096  # bytes per streamed chunk
    device: str = "mps"  # Apple Silicon GPU


class TTSService:
    """Wraps Chatterbox for local text-to-speech synthesis."""

    def __init__(self, config: TTSConfig | None = None) -> None:
        self._config = config or TTSConfig()
        self._model = None

    async def load_model(self) -> None:
        """Load the Chatterbox TTS model. Call once at startup."""
        loop = asyncio.get_event_loop()
        self._model = await loop.run_in_executor(None, self._load_chatterbox)

    def _load_chatterbox(self):
        from chatterbox.tts import ChatterboxTTS

        return ChatterboxTTS.from_pretrained(device=self._config.device)

    async def synthesize(self, text: str) -> bytes:
        """Synthesize full audio from text.

        Returns:
            Raw PCM 16-bit audio bytes at configured sample_rate.
        """
        if self._model is None:
            raise RuntimeError("TTS model not loaded — call load_model() first")

        wav_tensor = await asyncio.get_event_loop().run_in_executor(
            None, self._generate, text,
        )

        return self._tensor_to_pcm(wav_tensor)

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize audio and yield chunks for streaming."""
        full_audio = await self.synthesize(text)
        chunk_size = self._config.chunk_size

        for i in range(0, len(full_audio), chunk_size):
            yield full_audio[i : i + chunk_size]

    def _generate(self, text: str) -> torch.Tensor:
        """Run Chatterbox generation (blocking)."""
        return self._model.generate(text)

    def _tensor_to_pcm(self, wav_tensor: torch.Tensor) -> bytes:
        """Convert a float32 tensor [-1, 1] to PCM 16-bit bytes."""
        if wav_tensor.dim() > 1:
            wav_tensor = wav_tensor.squeeze(0)

        wav_tensor = wav_tensor.cpu().clamp(-1.0, 1.0)
        pcm = (wav_tensor * 32767).to(torch.int16)
        return pcm.numpy().tobytes()
