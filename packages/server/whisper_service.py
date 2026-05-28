#!/usr/bin/env python3
"""
Local Whisper transcription microservice for FINORA chatbot.
Listens on 127.0.0.1:WHISPER_PORT and exposes POST /transcribe.

Install: pip install faster-whisper

Request body (JSON):
  { "audio": "<base64-encoded audio bytes>", "mime": "audio/webm" }

Response body (JSON):
  { "text": "transcribed text" }   -- on success
  { "error": "message" }           -- on failure (always JSON, never socket close)
"""

import sys
import os
import json
import base64
import tempfile
import traceback
import wave
import struct
from http.server import HTTPServer, BaseHTTPRequestHandler

# Force UTF-8 output on Windows (default cp1252 can't encode non-ASCII log chars)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    from faster_whisper import WhisperModel
except ImportError:
    print(
        "[whisper] faster-whisper not installed. Run: pip install faster-whisper",
        flush=True,
    )
    sys.exit(1)

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
PORT = int(os.environ.get("WHISPER_PORT", "8765"))

MIME_TO_EXT: dict[str, str] = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
}

print(f"[whisper] Loading model '{MODEL_SIZE}' (this may take a moment)...", flush=True)
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print("[whisper] Model ready", flush=True)


def _convert_to_wav(src_path: str) -> str:
    """
    Convert any audio file to a 16 kHz mono WAV using PyAV.
    Returns the path of the newly created temp WAV file.
    Caller must delete it.
    """
    import av
    import array as arr

    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    samples: list[bytes] = []
    with av.open(src_path) as container:
        audio_streams = [s for s in container.streams if s.type == "audio"]
        if not audio_streams:
            raise ValueError("No audio stream found in file")

        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(audio_streams[0]):
            for out_frame in resampler.resample(frame):
                samples.append(bytes(out_frame.planes[0]))
        # Flush remaining samples
        for out_frame in resampler.resample(None):
            samples.append(bytes(out_frame.planes[0]))

    pcm = b"".join(samples)
    n_samples = len(pcm) // 2  # 16-bit samples

    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)   # 16-bit
        wf.setframerate(16000)
        wf.writeframes(pcm)

    print(
        f"[whisper] converted to WAV: {n_samples} samples @ 16kHz ({len(pcm)} bytes)",
        flush=True,
    )
    return wav_path


class TranscribeHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # silence default access log

    def do_POST(self):
        if self.path != "/transcribe":
            self._send(404, {"error": "not found"})
            return

        tmp_path: str | None = None
        wav_path: str | None = None

        try:
            # ── 1. Parse request ───────────────────────────────────────────────
            length = int(self.headers.get("Content-Length", 0))
            if length == 0:
                self._send(400, {"error": "empty request body"})
                return

            body = self.rfile.read(length)
            payload = json.loads(body)

            audio_b64 = payload.get("audio", "")
            if not audio_b64:
                self._send(400, {"error": "missing 'audio' field in payload"})
                return

            # ── 2. Decode base64 ───────────────────────────────────────────────
            audio_bytes = base64.b64decode(audio_b64)
            mime = payload.get("mime", "audio/webm")
            ext = MIME_TO_EXT.get(mime, "webm")

            print(
                f"[whisper] request: mime={mime} size={len(audio_bytes)}b ext={ext}",
                flush=True,
            )

            if len(audio_bytes) == 0:
                self._send(400, {"error": "audio payload is 0 bytes"})
                return

            # ── 3. Write temp file ─────────────────────────────────────────────
            fd, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
            try:
                os.write(fd, audio_bytes)
            finally:
                os.close(fd)

            # ── 4. Transcribe (try native format first, then WAV fallback) ─────
            transcribe_path = tmp_path
            try:
                text = self._transcribe(transcribe_path)
            except Exception as primary_err:
                # Primary transcription failed — try WAV conversion fallback
                print(
                    f"[whisper] native transcription failed ({primary_err}), "
                    f"converting to WAV…",
                    flush=True,
                )
                print(traceback.format_exc(), file=sys.stderr, flush=True)

                wav_path = _convert_to_wav(tmp_path)
                text = self._transcribe(wav_path)

            print(
                f"[whisper] transcribed {len(audio_bytes)}b -> \"{text[:80]}\"",
                flush=True,
            )
            self._send(200, {"text": text})

        except Exception as exc:
            print(f"[whisper] ERROR: {exc}", flush=True)
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            try:
                self._send(500, {"error": str(exc)})
            except (BrokenPipeError, ConnectionResetError, OSError):
                # Client already disconnected — nothing to send
                pass
        finally:
            for p in (tmp_path, wav_path):
                if p:
                    try:
                        os.unlink(p)
                    except OSError:
                        pass

    @staticmethod
    def _transcribe(path: str) -> str:
        """
        Run faster-whisper on the given file path.

        beam_size=1         — 5× faster than beam_size=5 on CPU, good accuracy
        vad_filter=False    — skip Voice Activity Detection; VAD can hang on
                              streaming/fragmented WebM from browser MediaRecorder
        condition_on_previous_text=False — prevents hallucination loops on short clips
        """
        segments, _ = model.transcribe(
            path,
            language="fr",
            beam_size=1,
            vad_filter=False,
            condition_on_previous_text=False,
        )
        return " ".join(s.text.strip() for s in segments).strip()

    def _send(self, code: int, data: dict) -> None:
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()


httpd = HTTPServer(("127.0.0.1", PORT), TranscribeHandler)
print(f"[whisper] Listening on 127.0.0.1:{PORT}", flush=True)
httpd.serve_forever()
