"""
Inflect — Speech Module
=======================
Analyzes raw audio waveforms to produce 7 confidence sub-scores.

Metrics:
  1. pitch_variance     — librosa.pyin()  →  dynamic pitch = confident
  2. volume_trailing    — RMS envelope     →  not trailing off = confident
  3. filler_density     — Whisper + regex  →  low filler rate = confident
  4. speech_rate        — Whisper segments →  consistent rate = confident
  5. pause_quality      — Whisper timing   →  strategic > anxious pauses
  6. upspeak            — pitch curve on sentence endings
  7. vocal_fry          — sub-70 Hz energy ratio

Also uses pyAudioAnalysis for supplementary emotion feature extraction.

All sub-scores are 0–100 (higher = more confident/better).
`composite` is the weighted aggregate.
"""

import os
import re
import io
import tempfile
import logging
from typing import Optional

import numpy as np
import librosa
import soundfile as sf

logger = logging.getLogger(__name__)

# ── Whisper model singleton ───────────────────────────────────────────────────

_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        logger.info("[Inflect] Loading Whisper 'base' model…")
        _whisper_model = whisper.load_model("base")
        logger.info("[Inflect] Whisper ready.")
    return _whisper_model

# ── Filler words (English) ─────────────────────────────────────────────────────

FILLERS = {
    "um", "uh", "er", "ah", "like", "basically", "literally",
    "actually", "right", "okay", "so", "you", "know",
}

# ── Utilities ─────────────────────────────────────────────────────────────────

def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))

def norm(v: float, lo: float, hi: float) -> float:
    """Linear normalize v from [lo, hi] to [0, 1]."""
    if hi == lo:
        return 0.5
    return clamp((v - lo) / (hi - lo))

def load_audio(path: str, target_sr: int = 16000) -> tuple[np.ndarray, int]:
    """
    Load audio from any format supported by ffmpeg (WebM, OGG, WAV, MP3).
    Falls back through multiple loaders.
    """
    # Primary: pydub (handles WebM/Opus from browser MediaRecorder)
    try:
        from pydub import AudioSegment
        seg = AudioSegment.from_file(path)
        seg = seg.set_frame_rate(target_sr).set_channels(1)
        samples = np.array(seg.get_array_of_samples(), dtype=np.float32)
        # pydub returns int16 range; normalize to [-1, 1]
        samples = samples / (2 ** (seg.sample_width * 8 - 1))
        return samples, target_sr
    except Exception as e:
        logger.warning(f"[pydub] failed: {e}. Trying soundfile…")

    # Fallback: soundfile (handles WAV, FLAC, OGG)
    try:
        y, sr = sf.read(path, always_2d=False)
        if y.ndim > 1:
            y = y.mean(axis=1)
        y = y.astype(np.float32)
        if sr != target_sr:
            y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
        return y, target_sr
    except Exception as e:
        logger.warning(f"[soundfile] failed: {e}. Trying librosa…")

    # Last resort: librosa (slower but very robust)
    y, sr = librosa.load(path, sr=target_sr, mono=True)
    return y, target_sr

# ── Metric 1: Pitch variance via pyin ─────────────────────────────────────────

def compute_pitch_variance(y: np.ndarray, sr: int) -> float:
    """
    Higher pitch variance (in semitones) = more dynamic delivery = confident.
    Very monotone speakers score low; natural variation scores high.
    """
    try:
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=float(librosa.note_to_hz("C2")),
            fmax=float(librosa.note_to_hz("C7")),
            sr=sr,
            frame_length=2048,
            hop_length=512,
        )
        voiced = f0[voiced_flag & ~np.isnan(f0)]
        if len(voiced) < 10:
            return 0.50

        # Convert to semitone scale (log)
        semitones = 12.0 * np.log2(voiced / (np.median(voiced) + 1e-6))
        var_st = float(np.var(semitones))

        # Good natural variance: 20–80 semitone²
        # Monotone: < 5 st²;  very expressive: > 100 st²
        return norm(var_st, 5.0, 80.0)

    except Exception as e:
        logger.warning(f"[pitch_variance] {e}")
        return 0.50


# ── Metric 2: Volume trailing at sentence ends ───────────────────────────────

def compute_volume_trailing(y: np.ndarray, sr: int) -> float:
    """
    Confident speakers sustain volume to the end of utterances.
    Trailing off (getting quieter at the end) signals low confidence.
    """
    try:
        frame_length = int(sr * 0.05)   # 50 ms
        hop_length   = frame_length // 2
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]

        n = len(rms)
        if n < 8:
            return 0.50

        mid_rms = float(np.mean(rms[n // 4 : 3 * n // 4]))
        end_rms = float(np.mean(rms[3 * n // 4 :]))

        if mid_rms < 1e-4:
            return 0.50

        # ratio > 1 = getting louder at end; ratio < 0.6 = severe trailing
        ratio = end_rms / (mid_rms + 1e-8)
        return norm(ratio, 0.45, 1.05)

    except Exception as e:
        logger.warning(f"[volume_trailing] {e}")
        return 0.50


# ── Metric 3: Filler word density from Whisper transcript ────────────────────

def compute_filler_density(transcript: str, duration: float) -> float:
    """
    Low filler density → high confidence score.
    'You know' counts as 2 words but is treated as one filler instance.
    """
    try:
        text = transcript.lower()
        # Multi-word fillers first
        text = re.sub(r"\byou\s+know\b", "FILLER", text)
        words = re.findall(r"\b\w+\b", text)
        total = len(words)
        if total == 0 or duration < 0.5:
            return 0.65  # neutral when nothing to analyze

        filler_count = sum(1 for w in words if w in FILLERS or w == "filler")
        rate = filler_count / total

        # Good: < 2 % fillers → 1.0;  bad: > 15 % → 0.0
        return norm(rate, 0.15, 0.02)

    except Exception as e:
        logger.warning(f"[filler_density] {e}")
        return 0.50


# ── Metric 4: Speech rate variance ───────────────────────────────────────────

def compute_speech_rate_variance(segments: list, duration: float) -> float:
    """
    Consistent speech rate → confident.
    Coefficient of variation (CV) measures rate consistency.
    """
    try:
        rates = []
        for seg in segments:
            words   = len(seg.get("text", "").split())
            seg_dur = seg.get("end", 0) - seg.get("start", 0)
            if seg_dur > 0.15 and words > 0:
                rates.append(words / seg_dur)

        if len(rates) < 2:
            return 0.55

        mean_r = float(np.mean(rates))
        std_r  = float(np.std(rates))
        cv     = std_r / (mean_r + 1e-6)

        # Low CV = consistent = good. High CV = erratic.
        # Comfortable range: CV < 0.35 (score approaches 1)
        return norm(cv, 0.90, 0.10)

    except Exception as e:
        logger.warning(f"[speech_rate] {e}")
        return 0.50


# ── Metric 5: Strategic vs. anxious pause detection ──────────────────────────

def compute_pause_quality(segments: list, duration: float) -> float:
    """
    Strategic pauses = at sentence boundaries (clause-final, after key points).
    Anxious pauses = long mid-phrase silences.
    Score = strategic / (strategic + anxious), normalized.
    """
    try:
        if len(segments) < 2:
            return 0.55

        strategic = 0.0
        anxious   = 0.0

        for i in range(len(segments) - 1):
            curr = segments[i]
            nxt  = segments[i + 1]
            pause = nxt.get("start", 0) - curr.get("end", 0)

            if pause < 0.15:
                continue  # not a real pause

            curr_text = curr.get("text", "").strip()
            at_boundary = bool(re.search(r"[.!?,;:]$", curr_text))

            if at_boundary:
                strategic += 1.0
            elif pause > 0.55:
                anxious += 1.0          # long mid-phrase = anxious
            elif pause > 0.25:
                strategic += 0.3        # short clause pause = mildly strategic

        total = strategic + anxious
        if total == 0:
            return 0.60  # no significant pauses → neutral

        quality = strategic / total
        return norm(quality, 0.25, 0.90)

    except Exception as e:
        logger.warning(f"[pause_quality] {e}")
        return 0.50


# ── Metric 6: Upspeak detection ───────────────────────────────────────────────

def compute_upspeak(y: np.ndarray, sr: int, segments: list) -> float:
    """
    Upspeak = pitch rising at the end of declarative statements.
    Score: 1.0 = no upspeak, 0.0 = always upspeaking.
    """
    try:
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=float(librosa.note_to_hz("C2")),
            fmax=float(librosa.note_to_hz("C7")),
            sr=sr,
            frame_length=2048,
            hop_length=512,
        )
        if np.sum(voiced_flag) < 10:
            return 0.50

        hop_length = 512
        times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=hop_length)

        upspeak_count = 0
        total_stmts   = 0

        for seg in segments:
            text = seg.get("text", "").strip()
            if not text or text.endswith("?"):
                continue  # skip questions — upspeak is expected

            seg_end = seg.get("end", 0.0)
            total_stmts += 1

            # Pitch in last 500 ms of segment
            win_start = max(0.0, seg_end - 0.50)
            mask = (times >= win_start) & (times <= seg_end) & voiced_flag

            if np.sum(mask) < 4:
                continue

            end_f0 = f0[mask]
            mid    = len(end_f0) // 2
            fh_1   = float(np.nanmean(end_f0[:mid]))
            fh_2   = float(np.nanmean(end_f0[mid:]))

            if fh_1 > 0 and fh_2 > fh_1 * 1.06:
                upspeak_count += 1

        if total_stmts == 0:
            return 0.55

        ratio = upspeak_count / total_stmts
        # Low upspeak ratio = high score
        return norm(ratio, 0.65, 0.05)

    except Exception as e:
        logger.warning(f"[upspeak] {e}")
        return 0.50


# ── Metric 7: Vocal fry (low-frequency energy ratio) ─────────────────────────

def compute_vocal_fry(y: np.ndarray, sr: int) -> float:
    """
    Vocal fry = irregular low-frequency glottal pulses below ~70 Hz.
    High sub-70 Hz energy relative to speech band signals vocal fry.
    Score: 1.0 = no fry, 0.0 = heavy fry.
    """
    try:
        n    = len(y)
        fft  = np.fft.rfft(y)
        mag  = np.abs(fft) ** 2
        freq = np.fft.rfftfreq(n, d=1.0 / sr)

        fry_mask    = freq < 70
        speech_mask = (freq >= 70) & (freq < 3000)

        fry_e    = float(np.mean(mag[fry_mask]))    if fry_mask.any()    else 0.0
        speech_e = float(np.mean(mag[speech_mask])) if speech_mask.any() else 1e-10

        if speech_e < 1e-12:
            return 0.50

        ratio = fry_e / (fry_e + speech_e)
        # Low ratio = less fry; high = more fry
        return norm(ratio, 0.35, 0.04)

    except Exception as e:
        logger.warning(f"[vocal_fry] {e}")
        return 0.50


# ── pyAudioAnalysis supplementary features ────────────────────────────────────

def extract_paa_features(y: np.ndarray, sr: int) -> dict:
    """
    Use pyAudioAnalysis to extract mid-term features for supplementary emotion
    classification. Returns an empty dict on failure (non-blocking).
    """
    try:
        from pyAudioAnalysis import MidTermFeatures as mF

        mt_feats, _, _ = mF.mid_feature_extraction(
            y, sr,
            round(sr * 1.0),   # 1 s mid-term window
            round(sr * 0.5),   # 0.5 s step
            round(sr * 0.025), # 25 ms short-term window
            round(sr * 0.010), # 10 ms short-term step
        )
        feat_mean = np.mean(mt_feats, axis=1)
        return {
            "zcr":    float(feat_mean[0]),   # zero crossing rate
            "energy": float(feat_mean[1]),   # energy
        }
    except Exception as e:
        logger.debug(f"[pyAudioAnalysis] {e}")
        return {}


# ── Main entry point ──────────────────────────────────────────────────────────

def analyze_audio(audio_path: str) -> dict:
    """
    Analyze an audio file and return speech confidence scores.

    Returns:
        {
          "pitch_variance":  int,   # 0–100
          "volume_trailing": int,   # 0–100
          "filler_density":  int,   # 0–100
          "speech_rate":     int,   # 0–100
          "pause_quality":   int,   # 0–100
          "upspeak":         int,   # 0–100
          "vocal_fry":       int,   # 0–100
          "composite":       int,   # 0–100  (weighted average)
          "transcript":      str,
          "paa_features":    dict,  # supplementary features
        }
    """
    try:
        y, sr = load_audio(audio_path, target_sr=16000)
        duration = len(y) / sr

        if duration < 0.4:
            return _default_scores("Audio too short")

        # ── Whisper transcription (blocking; use 'base' model) ────────────────
        model = get_whisper_model()
        result = model.transcribe(audio_path, word_timestamps=False)
        transcript: str = result.get("text", "")
        segments: list  = result.get("segments", [])

        # ── 7 metrics ─────────────────────────────────────────────────────────
        pitch_var  = compute_pitch_variance(y, sr)
        vol_trail  = compute_volume_trailing(y, sr)
        filler     = compute_filler_density(transcript, duration)
        rate       = compute_speech_rate_variance(segments, duration)
        pauses     = compute_pause_quality(segments, duration)
        upspk      = compute_upspeak(y, sr, segments)
        fry        = compute_vocal_fry(y, sr)

        # ── pyAudioAnalysis supplementary ─────────────────────────────────────
        paa = extract_paa_features(y, sr)

        # ── Weighted composite ─────────────────────────────────────────────────
        composite = clamp(
            pitch_var * 0.20 +
            vol_trail * 0.15 +
            filler    * 0.20 +
            rate      * 0.10 +
            pauses    * 0.15 +
            upspk     * 0.10 +
            fry       * 0.10,
        ) * 100

        return {
            "pitch_variance":  round(pitch_var  * 100),
            "volume_trailing": round(vol_trail  * 100),
            "filler_density":  round(filler     * 100),
            "speech_rate":     round(rate       * 100),
            "pause_quality":   round(pauses     * 100),
            "upspeak":         round(upspk      * 100),
            "vocal_fry":       round(fry        * 100),
            "composite":       round(composite),
            "transcript":      transcript.strip(),
            "paa_features":    paa,
        }

    except Exception as e:
        logger.error(f"[analyze_audio] Fatal: {e}", exc_info=True)
        return _default_scores(str(e))


def _default_scores(reason: str = "") -> dict:
    return {
        "pitch_variance":  50,
        "volume_trailing": 50,
        "filler_density":  50,
        "speech_rate":     50,
        "pause_quality":   50,
        "upspeak":         50,
        "vocal_fry":       50,
        "composite":       50,
        "transcript":      "",
        "paa_features":    {},
        "error":           reason,
    }
