"use client";

/**
 * SpeechAnalysis — Real-time audio pipeline component
 *
 * Captures microphone audio in 3-second chunks via MediaRecorder,
 * ships each chunk to the Python speech engine at localhost:8000/analyze,
 * and displays the 7 speech-confidence sub-scores.
 *
 * Stays mounted even when the tab is hidden so cross-validation is always live.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { RollingBuffer } from "@/lib/rollingAverage";

const FONT         = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const PYTHON_URL   = (process.env.NEXT_PUBLIC_PYTHON_URL ?? "http://localhost:8000").replace(/\/$/, "");
const CHUNK_MS     = 3000;  // 3-second audio chunks

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpeechScores {
  pitch_variance:  number;
  volume_trailing: number;
  filler_density:  number;
  speech_rate:     number;
  pause_quality:   number;
  upspeak:         number;
  vocal_fry:       number;
  composite:       number;
  transcript:      string;
}

const DEFAULT_SCORES: SpeechScores = {
  pitch_variance:  50,
  volume_trailing: 50,
  filler_density:  50,
  speech_rate:     50,
  pause_quality:   50,
  upspeak:         50,
  vocal_fry:       50,
  composite:       50,
  transcript:      "",
};

export interface SpeechAnalysisProps {
  onSpeechScore?: (composite: number, cyclesCompleted: number) => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpeechMetricBar({
  label, score, invert = false, isLoading,
}: {
  label: string; score: number; invert?: boolean; isLoading: boolean;
}) {
  const pct  = score;
  const good = invert ? pct < 45 : pct >= 55;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 300,
        color: "#999999", minWidth: 130, flexShrink: 0, letterSpacing: "0.01em",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, borderRadius: 100,
        background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: isLoading ? "0%" : `${pct}%`,
          borderRadius: 100,
          background: good ? "rgba(255,255,255,0.42)" : "#FF4D4D",
          boxShadow: good ? "none" : "0 0 5px rgba(255,77,77,0.35)",
          transition: "width 0.5s ease",
        }} />
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
        color: isLoading ? "#232323" : (good ? "#FFFFFF" : "#FF4D4D"),
        minWidth: 28, textAlign: "right", flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}>
        {isLoading ? "—" : pct}
      </span>
    </div>
  );
}

function WaveformViz({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buf = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser!.getByteTimeDomainData(buf);

      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);
      ctx!.strokeStyle = "rgba(255, 77, 77, 0.6)";
      ctx!.lineWidth   = 1.5;
      ctx!.beginPath();

      const sliceW = w / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else         ctx!.lineTo(x, y);
        x += sliceW;
      }
      ctx!.stroke();
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={48}
      style={{ width: "100%", height: 48, borderRadius: 6 }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SpeechAnalysis({ onSpeechScore }: SpeechAnalysisProps) {
  const [serverOnline,    setServerOnline]    = useState<boolean | null>(null);
  const [recording,      setRecording]       = useState(false);
  const [scores,         setScores]          = useState<SpeechScores>(DEFAULT_SCORES);
  const [isAnalyzing,    setIsAnalyzing]     = useState(false);
  const [transcript,     setTranscript]      = useState("");
  const [cyclesCompleted,setCyclesCompleted] = useState(0);
  const [analyser,       setAnalyser]        = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const compRollRef      = useRef(new RollingBuffer(3));
  const onSpeechRef      = useRef(onSpeechScore);
  const cyclesRef        = useRef(0);

  useEffect(() => { onSpeechRef.current = onSpeechScore; }, [onSpeechScore]);

  // ── Server health check ────────────────────────────────────────────────────
  const checkServer = useCallback(async () => {
    try {
      const r = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(2000) });
      setServerOnline(r.ok);
    } catch {
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    checkServer();
    const id = setInterval(checkServer, 8000);
    return () => clearInterval(id);
  }, [checkServer]);

  // ── Send audio chunk to Python backend ────────────────────────────────────
  const sendChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;  // skip near-empty chunks
    setIsAnalyzing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "chunk.webm");
      const res = await fetch(`${PYTHON_URL}/analyze`, {
        method: "POST",
        body:   form,
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SpeechScores = await res.json();

      compRollRef.current.push(data.composite);
      const rollingComposite = Math.round(compRollRef.current.average());

      const smoothed: SpeechScores = { ...data, composite: rollingComposite };
      setScores(smoothed);
      if (data.transcript) setTranscript(data.transcript);

      cyclesRef.current += 1;
      setCyclesCompleted(cyclesRef.current);
      onSpeechRef.current?.(rollingComposite, cyclesRef.current);
    } catch (err) {
      console.warn("[SpeechAnalysis] analyze error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Waveform visualizer
      const actx     = new AudioContext();
      const source   = actx.createMediaStreamSource(stream);
      const anlsr    = actx.createAnalyser();
      anlsr.fftSize  = 2048;
      source.connect(anlsr);
      audioCtxRef.current = actx;
      setAnalyser(anlsr);

      // MediaRecorder — prefer webm/opus
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // Every CHUNK_MS: stop → flush → send → restart
      intervalRef.current = setInterval(() => {
        if (mr.state === "recording") {
          mr.requestData();
          // Give ondataavailable a tick, then ship chunks
          setTimeout(() => {
            if (chunks.length > 0) {
              const blob = new Blob(chunks.splice(0), { type: mimeType });
              sendChunk(blob);
            }
          }, 80);
        }
      }, CHUNK_MS);

      mr.start();
      setRecording(true);
    } catch (err) {
      console.error("[SpeechAnalysis] getUserMedia failed:", err);
    }
  }, [recording, sendChunk]);

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    mediaRecorderRef.current = null;
    streamRef.current        = null;
    audioCtxRef.current      = null;
    setAnalyser(null);
    setRecording(false);
  }, []);

  // Auto-start when server is confirmed online
  useEffect(() => {
    if (serverOnline === true && !recording) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverOnline]);

  useEffect(() => {
    return () => { stopRecording(); };
  }, [stopRecording]);

  const METRIC_DEFS: Array<{ key: keyof SpeechScores; label: string; invert?: boolean }> = [
    { key: "upspeak",         label: "Decisive Intonation" },
    { key: "filler_density",  label: "Filler Words" },
    { key: "pause_quality",   label: "Strategic Pauses" },
    { key: "pitch_variance",  label: "Grounded Pitch" },
    { key: "volume_trailing", label: "Volume Firmness" },
    { key: "speech_rate",     label: "Pace & Flow" },
    { key: "vocal_fry",       label: "Voice Clarity" },
  ];

  const isLoading = cyclesCompleted === 0;

  return (
    <div style={{ display: "flex", height: "100%", background: "#000", overflow: "hidden" }}>

      {/* ── Left — composite ring + waveform ──────────────────────────────── */}
      <div style={{
        flex: "0 0 38%", display: "flex", flexDirection: "column",
        padding: "32px 24px 32px 32px", gap: 24,
      }}>

        {/* Server status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: serverOnline === null ? "#444"
                      : serverOnline         ? "#10B981" : "#F43F5E",
            boxShadow: serverOnline
              ? "0 0 6px rgba(16,185,129,0.8)"
              : serverOnline === false ? "0 0 6px rgba(244,63,94,0.6)" : "none",
          }} />
          <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888",
            letterSpacing: "0.10em", textTransform: "uppercase" }}>
            {serverOnline === null  ? "Checking engine…"
           : serverOnline           ? "Speech Engine Online"
                                    : "Engine offline — run python/server.py"}
          </span>
        </div>

        {/* Large composite ring */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          {(() => {
            const size  = 200;
            const r     = size * 0.42;
            const cx    = size / 2;
            const cy    = size / 2;
            const circ  = 2 * Math.PI * r;
            const pct   = scores.composite;
            const fill  = circ * Math.min(pct / 100, 1);
            const accent = "#3B82F6";
            return (
              <div style={{ position: "relative", width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
                  style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={cx} cy={cy} r={r} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  {!isLoading && (
                    <circle cx={cx} cy={cy} r={r} fill="none"
                      stroke={accent} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${fill} ${circ - fill}`}
                      style={{
                        transition: "stroke-dasharray 0.5s ease",
                        filter: `drop-shadow(0 0 10px ${accent}80)`,
                      }} />
                  )}
                </svg>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: FONT, fontSize: 60, fontWeight: 900,
                    lineHeight: 1, letterSpacing: "-3px",
                    color: isLoading ? "#232323" : "#FFFFFF",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {isLoading ? "—" : scores.composite}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 300,
                    color: "#999999", marginTop: 6, letterSpacing: "0.04em" }}>
                    speech confidence
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Waveform */}
        <div style={{
          borderRadius: 10, overflow: "hidden",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 12px",
        }}>
          <WaveformViz analyser={analyser} />
          {!analyser && (
            <div style={{ height: 48, display: "flex", alignItems: "center",
              justifyContent: "center" }}>
              <span style={{ fontFamily: FONT, fontSize: 11, color: "#777777" }}>
                {serverOnline === false ? "Start the Python server first" : "Mic idle"}
              </span>
            </div>
          )}
        </div>

        {/* Mic control */}
        <div style={{ display: "flex", gap: 10 }}>
          {recording ? (
            <button onClick={stopRecording} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: FONT, fontSize: 12, fontWeight: 600,
              color: "#FFFFFF", background: "rgba(244,63,94,0.15)",
              border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10,
              padding: "10px 18px", cursor: "pointer",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%",
                background: "#F43F5E", boxShadow: "0 0 6px rgba(244,63,94,0.8)",
                flexShrink: 0 }}
                className="animate-pulse"
              />
              Recording
            </button>
          ) : (
            <button onClick={startRecording}
              disabled={serverOnline === false}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: serverOnline === false ? "#666666" : "#FFFFFF",
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 10, padding: "10px 18px",
                cursor: serverOnline === false ? "not-allowed" : "pointer",
              }}>
              Start Recording
            </button>
          )}
        </div>

        {/* Processing indicator */}
        {isAnalyzing && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(59,130,246,0.3)",
              borderTopColor: "#3B82F6",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888",
              letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Analyzing…
            </span>
          </div>
        )}
      </div>

      {/* ── Right — 7 metrics + transcript ────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        padding: "32px 32px 32px 0", gap: 0, overflow: "hidden",
      }}>

        {/* Metrics card */}
        <div style={{
          borderRadius: 20, background: "#141414",
          padding: "24px 22px", marginBottom: 16,
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500,
              color: "#888888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Speech Signals
            </span>
            {cyclesCompleted > 0 && (
              <span style={{ fontFamily: FONT, fontSize: 10, color: "#777777",
                letterSpacing: "0.05em" }}>
                {cyclesCompleted} cycle{cyclesCompleted !== 1 ? "s" : ""} analyzed
              </span>
            )}
          </div>

          {METRIC_DEFS.map(({ key, label, invert }) => (
            <SpeechMetricBar
              key={key}
              label={label}
              score={typeof scores[key] === "number" ? scores[key] as number : 50}
              invert={invert}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Transcript */}
        <div style={{
          borderRadius: 20, background: "#141414",
          padding: "20px 22px", flex: 1, overflow: "hidden",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500,
              color: "#888888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Latest Transcript
            </span>
            {isAnalyzing && (
              <span style={{ fontFamily: FONT, fontSize: 9, color: "#3B82F6",
                letterSpacing: "0.06em" }}>
                updating…
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {transcript ? (
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300,
                color: "#BBBBBB", lineHeight: 1.6, margin: 0 }}>
                {transcript}
              </p>
            ) : (
              <p style={{ fontFamily: FONT, fontSize: 12, color: "#777777",
                fontStyle: "italic", margin: 0 }}>
                {serverOnline === false
                  ? "Start the Python server: cd python && python server.py"
                  : recording
                  ? "Speak — analysis updates every 3 seconds…"
                  : "Press Start Recording to begin"}
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
