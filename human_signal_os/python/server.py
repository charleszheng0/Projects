"""
Inflect — Speech Engine Server
================================
FastAPI server that receives 3-second audio chunks from the browser,
runs the full speech analysis pipeline, and returns structured scores.

Start with:
    python server.py
    # or
    uvicorn server:app --host 0.0.0.0 --port 8000 --reload

Prereqs:
    pip install -r requirements.txt
    brew install ffmpeg  (macOS)
"""

import os
import logging
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import speech_module
import deep_analysis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan: warm up Whisper on startup so first request isn't slow ──────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Warming up Whisper model…")
    try:
        speech_module.get_whisper_model()
        logger.info("Whisper ready.")
    except Exception as e:
        logger.warning(f"Whisper warmup failed (will retry on first request): {e}")
    yield


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Inflect Speech Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Liveness probe — browser polls this to show 'Speech Engine: online' UI."""
    return {"status": "ok", "whisper": _whisper_loaded()}


@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    """
    Receive a 3-second audio chunk (WebM/Opus from MediaRecorder) and return
    speech confidence scores.

    Returns:
        {
          "pitch_variance":  int 0–100,
          "volume_trailing": int 0–100,
          "filler_density":  int 0–100,
          "speech_rate":     int 0–100,
          "pause_quality":   int 0–100,
          "upspeak":         int 0–100,
          "vocal_fry":       int 0–100,
          "composite":       int 0–100,
          "transcript":      str,
          "paa_features":    dict,
        }
    """
    if audio.size is not None and audio.size > 10_000_000:  # 10 MB guard
        raise HTTPException(status_code=413, detail="Audio chunk too large")

    # Determine file extension from content type
    content_type = audio.content_type or "audio/webm"
    ext_map = {
        "audio/webm":  ".webm",
        "audio/ogg":   ".ogg",
        "audio/wav":   ".wav",
        "audio/mp4":   ".mp4",
        "audio/mpeg":  ".mp3",
    }
    ext = ext_map.get(content_type.split(";")[0].strip(), ".webm")

    # Write to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = speech_module.analyze_audio(tmp_path)
        return result
    except Exception as e:
        logger.error(f"[/analyze] Unhandled error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/deep-analyze")
async def deep_analyze(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
):
    """
    Receive a full video file, extract audio, run the deep analysis pipeline
    (Librosa + pyAudioAnalysis + Whisper large + Hume stub + AssemblyAI stub),
    and return a comprehensive JSON report.

    The video is processed synchronously (can be slow — Whisper large may take
    1–2 minutes on CPU). Run the server with a generous timeout or consider
    deploying with workers.

    Returns:
        {
          "speech_metrics": { ...7 metrics... },
          "transcript":     [ { text, start, end }, ... ],
          "pyaudio_emotion": str,
          "hume":           { confidence, distress, excitement, calmness },
          "assemblyai":     { sentences, chapters, fillerWords },
        }
    """
    if video.size is not None and video.size > 500_000_000:  # 500 MB guard
        raise HTTPException(status_code=413, detail="Video file too large (max 500 MB)")

    content_type = video.content_type or "video/mp4"
    ext_map = {
        "video/mp4":  ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
        "video/x-msvideo": ".avi",
        "video/ogg":  ".ogv",
    }
    ext = ext_map.get(content_type.split(";")[0].strip(), ".mp4")

    # Save uploaded video to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_video:
        content = await video.read()
        tmp_video.write(content)
        tmp_video_path = tmp_video.name

    tmp_audio_path = None
    try:
        # Extract audio from video
        tmp_audio_path = deep_analysis.extract_audio_from_video(tmp_video_path)

        # Run full pipeline
        result = deep_analysis.analyze_video(tmp_audio_path)
        return result

    except Exception as e:
        logger.error(f"[/deep-analyze] Unhandled error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Schedule cleanup of temp files after response is sent
        def _cleanup():
            for p in [tmp_video_path, tmp_audio_path]:
                if p:
                    try:
                        os.unlink(p)
                    except OSError:
                        pass
        background_tasks.add_task(_cleanup)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _whisper_loaded() -> bool:
    return speech_module._whisper_model is not None


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
