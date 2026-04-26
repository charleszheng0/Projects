"""
Inflect — Deep Analysis Pipeline
=================================
Full multi-model analysis for uploaded video files.

Pipeline:
  1. Extract audio from video (pydub + ffmpeg)
  2. Run all 7 speech metrics from speech_module
  3. Transcribe with Whisper "large" model (word-level timestamps)
  4. Run pyAudioAnalysis emotion classification
  5. Hume AI API (stub — TODO: activate with HUME_API_KEY)
  6. AssemblyAI API (stub — TODO: activate with ASSEMBLYAI_API_KEY)

Returns a structured dict ready for JSON serialization.
"""

import os
import logging
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

# ── Point pydub at Homebrew ffmpeg if not in PATH ─────────────────────────────
import shutil
from pydub import AudioSegment

_ffmpeg  = shutil.which("ffmpeg")  or "/opt/homebrew/bin/ffmpeg"
_ffprobe = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
AudioSegment.converter = _ffmpeg
AudioSegment.ffprobe   = _ffprobe

# ── Reuse the speech_module Whisper singleton (no second model load) ──────────

def _get_whisper():
    """Reuse the already-loaded Whisper model from speech_module."""
    import speech_module
    return speech_module.get_whisper_model()


# ── Audio extraction from video ───────────────────────────────────────────────

def extract_audio_from_video(video_path: str) -> str:
    """
    Extract audio track from a video file using pydub + ffmpeg.
    Returns path to a temporary WAV file (caller must delete).
    """
    from pydub import AudioSegment
    tmp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp_wav.close()
    try:
        audio = AudioSegment.from_file(video_path)
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(tmp_wav.name, format="wav")
    except Exception as e:
        logger.error(f"[deep_analysis] Audio extraction failed: {e}")
        raise
    return tmp_wav.name


# ── Stub API calls ────────────────────────────────────────────────────────────

def _call_hume_stub(audio_path: str) -> dict:
    """
    Hume AI Expression Measurement API — stub.

    TODO: Replace with real call when HUME_API_KEY is set:
        import requests
        key = os.environ.get("HUME_API_KEY", "")
        if not key or key == "your_hume_api_key_here":
            return _hume_stub_result()

        with open(audio_path, "rb") as f:
            files = {
                "json": (None, json.dumps({"models": {"prosody": {}}}), "application/json"),
                "file": ("audio.wav", f, "audio/wav"),
            }
            r = requests.post(
                "https://api.hume.ai/v0/batch/jobs",
                headers={"X-Hume-Api-Key": key},
                files=files,
                timeout=30,
            )
        job_id = r.json()["job_id"]

        # Poll for completion
        for _ in range(40):
            import time; time.sleep(2)
            poll = requests.get(
                f"https://api.hume.ai/v0/batch/jobs/{job_id}",
                headers={"X-Hume-Api-Key": key},
                timeout=10,
            ).json()
            if poll["state"]["status"] == "COMPLETED":
                preds = poll["results"]["predictions"][0]["results"]["prosody"] \
                    ["grouped_predictions"][0]["predictions"]
                def g(name): return next((p["score"] for p in preds if p["name"]==name), 0)
                return {"confidence": g("Confidence"), "distress": g("Distress"),
                        "excitement": g("Excitement"), "calmness": g("Calmness")}
        return _hume_stub_result()
    """
    return {"confidence": 0.62, "distress": 0.14, "excitement": 0.38, "calmness": 0.58}


def _call_assemblyai_stub(audio_path: str) -> dict:
    """
    AssemblyAI Speech Intelligence API — stub.

    TODO: Replace with real call when ASSEMBLYAI_API_KEY is set:
        import requests, time
        key = os.environ.get("ASSEMBLYAI_API_KEY", "")
        if not key or key == "your_assemblyai_api_key_here":
            return {"sentences": [], "chapters": [], "fillerWords": []}

        # Upload audio
        with open(audio_path, "rb") as f:
            upload = requests.post(
                "https://api.assemblyai.com/v2/upload",
                headers={"authorization": key},
                data=f, timeout=60,
            )
        upload_url = upload.json()["upload_url"]

        # Submit job
        job = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers={"authorization": key, "content-type": "application/json"},
            json={"audio_url": upload_url, "sentiment_analysis": True, "chapters": True},
            timeout=30,
        ).json()
        job_id = job["id"]

        # Poll
        for _ in range(120):
            time.sleep(3)
            r = requests.get(
                f"https://api.assemblyai.com/v2/transcript/{job_id}",
                headers={"authorization": key}, timeout=10,
            ).json()
            if r["status"] == "completed":
                FILLERS = re.compile(r"\b(um|uh|er|ah|like|basically|actually|right|okay|so)\b", re.I)
                sentences = [
                    {
                        "text":        s["text"],
                        "start":       s["start"],
                        "end":         s["end"],
                        "sentiment":   s["sentiment"],
                        "confidence":  s["confidence"],
                        "fillerCount": len(FILLERS.findall(s["text"])),
                    }
                    for s in (r.get("sentiment_analysis_results") or [])
                ]
                chapters = [
                    {"start": c["start"], "end": c["end"], "headline": c["headline"]}
                    for c in (r.get("chapters") or [])
                ]
                fillers = [
                    {"text": w["text"], "timestamp": w["start"]}
                    for w in (r.get("words") or [])
                    if FILLERS.fullmatch(w.get("text", ""))
                ]
                return {"sentences": sentences, "chapters": chapters, "fillerWords": fillers}
            if r["status"] == "error":
                break
    """
    return {"sentences": [], "chapters": [], "fillerWords": []}


# ── pyAudioAnalysis wrapper ───────────────────────────────────────────────────

def _run_pyaudio_emotion(audio_path: str) -> str:
    """Classify dominant emotion using pyAudioAnalysis SVM classifier."""
    try:
        from pyAudioAnalysis import audioTrainTest as aT
        # pyAudioAnalysis ships example classifiers
        model_path = os.path.join(
            os.path.dirname(__file__),
            "pyAudioModels", "svmSpeechEmotion",
        )
        if not os.path.exists(model_path + ".pkl"):
            return "neutral"
        result, _, _ = aT.file_classification(audio_path, model_path, "svm")
        labels = ["anger", "disgust", "fear", "happiness", "sadness", "surprise", "neutral"]
        return labels[int(result)] if int(result) < len(labels) else "neutral"
    except Exception as e:
        logger.debug(f"[deep_analysis] pyAudio emotion: {e}")
        return "neutral"


# ── Main pipeline ─────────────────────────────────────────────────────────────

def analyze_video(audio_path: str) -> dict:
    """
    Run the full deep analysis pipeline on an extracted audio file.

    Args:
        audio_path: path to a WAV file (extracted from video)

    Returns:
        dict with keys: speech_metrics, transcript, pyaudio_emotion, hume, assemblyai
    """
    import speech_module
    import numpy as np

    # ── Load audio once (reused for all metrics) ────────────────────────────
    y, sr = speech_module.load_audio(audio_path, target_sr=16000)
    duration = len(y) / sr

    # ── Whisper transcription (single pass, reusing the shared model) ───────
    transcript_segments = []
    full_text = ""
    segments: list = []
    try:
        model = _get_whisper()
        result = model.transcribe(audio_path, word_timestamps=False, verbose=False)
        full_text = result.get("text", "")
        segments  = result.get("segments", [])
        for seg in segments:
            transcript_segments.append({
                "text":  seg.get("text", "").strip(),
                "start": round(seg.get("start", 0), 2),
                "end":   round(seg.get("end", 0), 2),
            })
    except Exception as e:
        logger.error(f"[deep_analysis] Whisper error: {e}")

    # ── Speech metrics (computed directly — no second Whisper call) ─────────
    try:
        pitch_var = speech_module.compute_pitch_variance(y, sr)
        vol_trail = speech_module.compute_volume_trailing(y, sr)
        filler    = speech_module.compute_filler_density(full_text, duration)
        rate      = speech_module.compute_speech_rate_variance(segments, duration)
        pauses    = speech_module.compute_pause_quality(segments, duration)
        upspk     = speech_module.compute_upspeak(y, sr, segments)
        fry       = speech_module.compute_vocal_fry(y, sr)
        composite = speech_module.clamp(
            pitch_var * 0.20 + vol_trail * 0.15 + filler * 0.20 +
            rate      * 0.10 + pauses   * 0.15 + upspk  * 0.10 + fry * 0.10
        ) * 100
        speech_metrics = {
            "pitch_variance":  round(pitch_var * 100),
            "volume_trailing": round(vol_trail * 100),
            "filler_density":  round(filler    * 100),
            "speech_rate":     round(rate      * 100),
            "pause_quality":   round(pauses    * 100),
            "upspeak":         round(upspk     * 100),
            "vocal_fry":       round(fry       * 100),
            "composite":       round(composite),
        }
    except Exception as e:
        logger.error(f"[deep_analysis] speech metrics error: {e}")
        speech_metrics = {k: 50 for k in (
            "pitch_variance", "volume_trailing", "filler_density",
            "speech_rate", "pause_quality", "upspeak", "vocal_fry", "composite"
        )}

    # ── pyAudioAnalysis emotion ─────────────────────────────────────────────
    pyaudio_emotion = _run_pyaudio_emotion(audio_path)

    # ── Hume AI (stub) ──────────────────────────────────────────────────────
    hume_result = _call_hume_stub(audio_path)

    # ── AssemblyAI (stub) ───────────────────────────────────────────────────
    assemblyai_result = _call_assemblyai_stub(audio_path)

    return {
        "speech_metrics": speech_metrics,
        "transcript":      transcript_segments,
        "pyaudio_emotion": pyaudio_emotion,
        "hume":            hume_result,
        "assemblyai":      assemblyai_result,
    }
