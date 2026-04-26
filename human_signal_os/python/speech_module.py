"""
Inflect — Speech Module
=======================
Analyzes raw audio waveforms to produce 7 confidence sub-scores aligned with
evidence-based vocal authority dimensions.

Metrics:
  1. pitch_variance     — librosa.pyin() → grounded register (60%) + natural
                          pitch movement (40%); lower, resonant pitch scores higher
  2. volume_trailing    — RMS envelope   → overall volume firmness (50%) +
                          non-trailing at sentence ends (50%)
  3. filler_density     — Whisper + regex → low filler rate = confident
  4. speech_rate        — Whisper segments → optimal WPM 120-160 (50%) +
                          rate consistency (50%); rushing/slowing both penalized
  5. pause_quality      — Whisper timing → strategic clause pauses > anxious
                          mid-phrase silences
  6. upspeak            — pitch curve on statement endings; falling intonation
                          = decisive; rising = question-like = penalized
  7. vocal_fry          — sub-70 Hz energy ratio; heavy fry = penalized

All sub-scores are 0–100 (higher = more confident/better).
`composite` is the weighted aggregate (upspeak + fillers weighted highest
per user-defined priorities).
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

# ── Metric 1: Pitch — grounded register + natural movement ────────────────────

def compute_pitch_variance(y: np.ndarray, sr: int) -> float:
    """
    Two-component score reflecting vocal authority:

    Groundedness (60%): speaker uses a low-to-mid register relative to their
    own voiced range. A resonant, chest-voice delivery scores high; a thin,
    nasal, or head-voice delivery scores low. Speaker-normalized so it works
    for any voice type.

    Variance (40%): natural pitch movement over the utterance — not monotone,
    not erratic. Moderate variation signals engagement and conviction.
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

        # ── Groundedness: is the speaker using their lower register? ──────────
        f0_lo  = float(np.percentile(voiced, 10))   # low-end anchor
        f0_hi  = float(np.percentile(voiced, 90))   # high-end anchor
        f0_med = float(np.median(voiced))

        if f0_hi - f0_lo < 10:                      # too little range to judge
            groundedness = 0.50
        else:
            # 1.0 = speaking near their low end (grounded)
            # 0.0 = speaking near their high end (thin/nasal)
            groundedness = clamp(1.0 - (f0_med - f0_lo) / (f0_hi - f0_lo))

        # ── Variance: natural pitch movement in semitones ─────────────────────
        semitones = 12.0 * np.log2(voiced / (f0_med + 1e-6))
        var_st    = float(np.var(semitones))
        # Optimal natural variance: 15–70 semitone²
        variance  = norm(var_st, 5.0, 70.0)

        return clamp(0.60 * groundedness + 0.40 * variance)

    except Exception as e:
        logger.warning(f"[pitch_variance] {e}")
        return 0.50


# ── Metric 2: Volume — firmness + non-trailing ────────────────────────────────

def compute_volume_trailing(y: np.ndarray, sr: int) -> float:
    """
    Two-component score reflecting vocal projection:

    Firmness (50%): overall RMS level relative to a well-projected voice.
    Whispering or very quiet speech (suggesting insecurity) scores low.
    Moderate-to-loud, assured volume scores high.

    Non-trailing (50%): volume does not drop off at sentence ends — confident
    speakers sustain energy through the final word rather than trailing off.
    """
    try:
        frame_length = int(sr * 0.05)   # 50 ms
        hop_length   = frame_length // 2
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]

        n = len(rms)
        if n < 8:
            return 0.50

        mean_rms = float(np.mean(rms))
        mid_rms  = float(np.mean(rms[n // 4 : 3 * n // 4]))
        end_rms  = float(np.mean(rms[3 * n // 4 :]))

        # ── Firmness: is the speaker projecting enough? ───────────────────────
        # Typical browser MediaRecorder audio: confident ~0.04–0.14 RMS,
        # quiet/insecure < 0.015, very loud > 0.20
        firmness = norm(mean_rms, 0.010, 0.110)

        # ── Non-trailing: end volume vs mid-utterance volume ──────────────────
        if mid_rms < 1e-4:
            trailing = 0.50
        else:
            ratio    = end_rms / (mid_rms + 1e-8)
            trailing = norm(ratio, 0.40, 1.05)

        return clamp(0.50 * firmness + 0.50 * trailing)

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


# ── Metric 4: Pace — optimal WPM + consistency ────────────────────────────────

def compute_speech_rate_variance(segments: list, duration: float) -> float:
    """
    Two-component score reflecting delivery pace:

    Optimal WPM (50%): 120–160 words per minute is the authoritative sweet
    spot — measured, deliberate, easy to follow. Rushing (>195 WPM) signals
    anxiety; speaking too slowly (<90 WPM) can feel hesitant or flat.

    Consistency (50%): steady rate across segments — confident speakers don't
    lurch between rushing and crawling. Coefficient of variation (CV) measures
    this; low CV = consistent = high score.
    """
    try:
        rates       = []
        total_words = 0

        for seg in segments:
            words   = len(seg.get("text", "").split())
            seg_dur = seg.get("end", 0) - seg.get("start", 0)
            if seg_dur > 0.15 and words > 0:
                rates.append(words / seg_dur)
                total_words += words

        # ── Optimal WPM ───────────────────────────────────────────────────────
        if duration > 1.0 and total_words > 0:
            wpm = (total_words / duration) * 60.0
            if wpm < 120:
                wpm_score = norm(wpm, 75.0, 120.0)       # ramp up to optimal floor
            elif wpm <= 160:
                wpm_score = 1.0                           # ideal zone
            else:
                wpm_score = norm(wpm, 210.0, 160.0)      # ramp down from optimal ceiling
        else:
            wpm_score = 0.55

        # ── Consistency ───────────────────────────────────────────────────────
        if len(rates) < 2:
            consistency = 0.55
        else:
            mean_r      = float(np.mean(rates))
            std_r       = float(np.std(rates))
            cv          = std_r / (mean_r + 1e-6)
            consistency = norm(cv, 0.90, 0.10)

        return clamp(0.50 * wpm_score + 0.50 * consistency)

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

        # ── Weighted composite (priority order per vocal authority research) ────
        # Decisive intonation + filler words carry the most weight because they
        # are the most perceptible signals of authority/nervousness to listeners.
        composite = clamp(
            upspk     * 0.22 +   # decisive intonation (falling vs. rising)
            filler    * 0.20 +   # filler word density
            pauses    * 0.16 +   # strategic vs. anxious pauses
            pitch_var * 0.15 +   # grounded, resonant register
            vol_trail * 0.14 +   # firm, sustained volume
            rate      * 0.08 +   # measured pace (WPM + consistency)
            fry       * 0.05,    # voice clarity (no vocal fry)
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
