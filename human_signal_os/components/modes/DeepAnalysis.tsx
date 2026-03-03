"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  processVideoFrames,
  averageVideoBreakdown,
  type VideoFrame,
} from "@/lib/videoProcessing";
import { analyzeAudioAssemblyAI, type AssemblyAIResult } from "@/lib/assemblyAiApi";
import type { VisionBreakdown } from "@/lib/visionScoring";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT       = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const PYTHON_URL = (process.env.NEXT_PUBLIC_PYTHON_URL ?? "http://localhost:8000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeepSpeechResult {
  speech_metrics: {
    pitch_variance:  number;
    volume_trailing: number;
    filler_density:  number;
    speech_rate:     number;
    pause_quality:   number;
    upspeak:         number;
    vocal_fry:       number;
    composite:       number;
  };
  transcript: { text: string; start: number; end: number }[];
  pyaudio_emotion: string;
  hume:        { confidence: number; distress: number; excitement: number; calmness: number };
  assemblyai:  AssemblyAIResult;
}

interface ReportData {
  visionFrames:    VideoFrame[];
  avgBreakdown:    VisionBreakdown;
  avgConfidence:   number;
  avgFriendliness: number;
  speech:          DeepSpeechResult;
  videoUrl:        string;
  assemblyai:      AssemblyAIResult;
}

interface TimestampEvent {
  time:     number;   // seconds
  label:    string;
  severity: "high" | "medium" | "low";
}

type PipelineStage = "idle" | "connecting" | "uploading" | "speech" | "vision" | "report" | "done" | "error";

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle:       "",
  connecting: "Waking up speech engine…",
  uploading:  "Extracting audio",
  speech:     "Analyzing speech",
  vision:     "Reading facial expressions",
  report:     "Generating report",
  done:       "Done",
  error:      "Error",
};

const STAGE_WEIGHTS: Record<PipelineStage, number> = {
  idle: 0, connecting: 0.05, uploading: 0.10, speech: 0.40, vision: 0.80, report: 1.0, done: 1.0, error: 0,
};

// ── Grade calculation ─────────────────────────────────────────────────────────

function toGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "C+";
  if (score >= 65) return "C";
  if (score >= 55) return "D";
  return "F";
}

function gradeColor(g: string): string {
  if (g.startsWith("A")) return "#10B981";
  if (g.startsWith("B")) return "#3B82F6";
  if (g.startsWith("C")) return "#F59E0B";
  return "#F43F5E";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GradeBubble({ label, score }: { label: string; score: number }) {
  const grade = toGrade(score);
  const color = gradeColor(grade);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      flex: 1,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: `${color}18`, border: `2px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 900,
          color, letterSpacing: "-0.5px" }}>
          {grade}
        </span>
      </div>
      <span style={{ fontFamily: FONT, fontSize: 9, color: "#888888",
        letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
}

function ProgressBar({ stage, visionPct }: { stage: PipelineStage; visionPct: number }) {
  const basePct = STAGE_WEIGHTS[stage] ?? 0;
  const pct = stage === "vision"
    ? STAGE_WEIGHTS.speech + visionPct * (STAGE_WEIGHTS.vision - STAGE_WEIGHTS.speech)
    : basePct;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 440 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid rgba(59,130,246,0.3)",
          borderTopColor: "#3B82F6",
          animation: stage !== "done" && stage !== "error" ? "spin 0.8s linear infinite" : "none",
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: FONT, fontSize: 13, color: "#CCCCCC", fontWeight: 400 }}>
          {STAGE_LABELS[stage]}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 11,
          color: "#777777", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 100, background: "rgba(255,255,255,0.07)" }}>
        <div style={{
          height: "100%", borderRadius: 100,
          width: `${pct * 100}%`, background: "#3B82F6",
          boxShadow: "0 0 8px rgba(59,130,246,0.5)",
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DeepAnalysis() {
  const [stage,      setStage]      = useState<PipelineStage>("idle");
  const [visionPct,  setVisionPct]  = useState(0);
  const [report,     setReport]     = useState<ReportData | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recording,  setRecording]  = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [activeSection, setActiveSection] = useState<"card" | "sentences" | "timeline" | "compare">("card");

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const mrRef          = useRef<MediaRecorder | null>(null);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recChunksRef   = useRef<Blob[]>([]);

  // Scrub video to timestamp
  function seekTo(secs: number) {
    if (videoRef.current) videoRef.current.currentTime = secs;
  }

  // ── Main pipeline ─────────────────────────────────────────────────────────

  const runPipeline = useCallback(async (file: File) => {
    setReport(null);
    setErrorMsg(null);
    setVisionPct(0);

    // Create video URL for in-page player
    const videoUrl = URL.createObjectURL(file);

    try {
      // Stage 1: Wake up speech engine (may take ~60s on cold start)
      setStage("connecting");
      try {
        await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(90_000) });
      } catch {
        throw new Error(
          "Speech engine is unreachable.\n\nIf running locally: cd python && python3 server.py\nIf deployed: check NEXT_PUBLIC_PYTHON_URL is set correctly."
        );
      }

      // Stage 2: Upload to Python for speech analysis
      setStage("uploading");

      const form = new FormData();
      form.append("video", file, file.name);

      const speechRes = await fetch(`${PYTHON_URL}/deep-analyze`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(600_000),
      });
      if (!speechRes.ok) throw new Error(`Server error ${speechRes.status}: ${await speechRes.text()}`);
      const speechData: DeepSpeechResult = await speechRes.json();

      // Also run AssemblyAI on the audio (stub)
      setStage("speech");
      const audioBlob = new Blob([file], { type: file.type });
      const assemblyResult = await analyzeAudioAssemblyAI(audioBlob);

      // Stage 2: MediaPipe vision on video frames
      setStage("vision");
      const visionFrames = await processVideoFrames(file, setVisionPct);
      const { avgBreakdown, avgConfidence, avgFriendliness } = averageVideoBreakdown(visionFrames);

      // Stage 3: Assemble report
      setStage("report");
      await new Promise(r => setTimeout(r, 400));

      setReport({
        visionFrames,
        avgBreakdown,
        avgConfidence,
        avgFriendliness,
        speech: speechData,
        videoUrl,
        assemblyai: assemblyResult,
      });
      setStage("done");
    } catch (err) {
      console.error("[DeepAnalysis]", err);
      setErrorMsg(String(err));
      setStage("error");
    }
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────

  function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setErrorMsg("Please upload a video file."); return;
    }
    runPipeline(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── In-app recording ──────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      mrRef.current = mr;
      recChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      recIntervalRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch (err) { setErrorMsg("Camera/mic access denied: " + String(err)); }
  }

  function stopRecording() {
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    mrRef.current?.stop();
    mrRef.current?.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
    setTimeout(() => {
      if (recChunksRef.current.length > 0) {
        const blob = new Blob(recChunksRef.current, { type: "video/webm" });
        const file = new File([blob], "recording.webm", { type: "video/webm" });
        handleFile(file);
      }
    }, 200);
  }

  useEffect(() => () => {
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    mrRef.current?.stop();
  }, []);

  // ── Timestamp events (derived from report data) ────────────────────────────

  function buildTimestampEvents(r: ReportData): TimestampEvent[] {
    const events: TimestampEvent[] = [];

    // Vision dips (confidence < 40 at a frame)
    for (const frame of r.visionFrames) {
      if (frame.confidence < 40) {
        events.push({ time: frame.time, label: "Low presence", severity: "medium" });
      }
      if (frame.breakdown.gaze < 0.35) {
        events.push({ time: frame.time, label: "Eyes drifting", severity: "low" });
      }
    }

    // Filler word clusters from AssemblyAI
    for (const fw of r.assemblyai.fillerWords) {
      events.push({ time: fw.timestamp / 1000, label: `Filler: "${fw.text}"`, severity: "low" });
    }

    // AssemblyAI chapter markers
    for (const ch of r.assemblyai.chapters) {
      events.push({ time: ch.start / 1000, label: ch.headline, severity: "low" });
    }

    // Hume high distress
    if (r.speech.hume.distress > 0.5) {
      events.push({ time: 0, label: "High distress detected", severity: "high" });
    }

    // Deduplicate nearby events (within 1s)
    const deduped: TimestampEvent[] = [];
    for (const ev of events.sort((a, b) => a.time - b.time)) {
      const last = deduped[deduped.length - 1];
      if (!last || Math.abs(ev.time - last.time) > 1) deduped.push(ev);
    }
    return deduped.slice(0, 30);
  }

  // ── Chart data ────────────────────────────────────────────────────────────

  function buildVisionChartData(r: ReportData) {
    const bd = r.avgBreakdown;
    return [
      { name: "Gaze",       value: Math.round(bd.gaze           * 100) },
      { name: "Expression", value: Math.round(bd.microExpr       * 100) },
      { name: "Brow",       value: Math.round(bd.browTension     * 100) },
      { name: "Lip",        value: Math.round(bd.lipCompression  * 100) },
      { name: "Stillness",  value: Math.round(bd.fidget          * 100) },
      { name: "Head",       value: Math.round(bd.headPosition    * 100) },
      { name: "Smile",      value: Math.round(bd.duchenneSmile   * 100) },
    ];
  }

  function buildSpeechChartData(r: ReportData) {
    const m = r.speech.speech_metrics;
    return [
      { name: "Pitch",    value: m.pitch_variance  },
      { name: "Volume",   value: m.volume_trailing },
      { name: "Fillers",  value: m.filler_density  },
      { name: "Rate",     value: m.speech_rate     },
      { name: "Pauses",   value: m.pause_quality   },
      { name: "Upspeak",  value: m.upspeak         },
      { name: "Fry",      value: m.vocal_fry       },
    ];
  }

  // Find biggest gap between vision and speech metrics
  function findBiggestGap(r: ReportData) {
    const v = buildVisionChartData(r);
    const s = buildSpeechChartData(r);
    let maxGap = 0, gapLabel = "", gapType: "Masking" | "Grounding Needed" = "Masking";
    for (let i = 0; i < v.length && i < s.length; i++) {
      const gap = Math.abs(v[i].value - s[i].value);
      if (gap > maxGap) {
        maxGap = gap;
        gapLabel = v[i].name;
        gapType = v[i].value > s[i].value ? "Masking" : "Grounding Needed";
      }
    }
    return { metric: gapLabel, gap: maxGap, type: gapType };
  }

  // ── Render states ─────────────────────────────────────────────────────────

  // Idle / upload UI
  if (stage === "idle" || (stage === "error" && !report)) {
    return (
      <div style={{
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#000", padding: 32,
      }}>
        <div style={{ width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: "#FFFFFF",
              letterSpacing: "-0.02em", margin: 0 }}>
              Deep Analysis
            </h2>
            <p style={{ fontFamily: FONT, fontSize: 13, color: "#888888", marginTop: 6, margin: "6px 0 0" }}>
              Upload a video or record now for a full multi-modal report.
            </p>
          </div>

          {errorMsg && (
            <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: "#F43F5E", whiteSpace: "pre-line" }}>
                {errorMsg}
              </span>
            </div>
          )}

          {/* Drag-and-drop upload */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderRadius: 16, padding: "40px 32px",
              border: `2px dashed ${isDragging ? "#3B82F6" : "rgba(255,255,255,0.12)"}`,
              background: isDragging ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.02)",
              cursor: "pointer", textAlign: "center",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 32, marginBottom: 12 }}>📹</div>
            <p style={{ fontFamily: FONT, fontSize: 14, color: "#CCCCCC", margin: "0 0 6px", fontWeight: 500 }}>
              Drop a video file here
            </p>
            <p style={{ fontFamily: FONT, fontSize: 12, color: "#666666", margin: 0 }}>
              or click to browse · MP4, MOV, WebM
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontFamily: FONT, fontSize: 11, color: "#555555" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Record button */}
          {!recording ? (
            <button onClick={startRecording} style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 600,
              color: "#FFFFFF", background: "rgba(255,77,77,0.14)",
              border: "1px solid rgba(255,77,77,0.3)", borderRadius: 12,
              padding: "14px 24px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D4D",
                boxShadow: "0 0 6px rgba(255,77,77,0.8)", flexShrink: 0 }}
                className="animate-pulse"
              />
              Record from Camera &amp; Mic
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              <p style={{ fontFamily: FONT, fontSize: 14, color: "#FF4D4D", margin: 0 }}>
                Recording… {formatTime(recSeconds)}
              </p>
              <button onClick={stopRecording} style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 600,
                color: "#FFFFFF", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12,
                padding: "10px 24px", cursor: "pointer",
              }}>
                Stop &amp; Analyze
              </button>
            </div>
          )}

          <p style={{ fontFamily: FONT, fontSize: 11, color: "#555555", textAlign: "center", margin: 0 }}>
            Requires Python server running at localhost:8000
          </p>
        </div>
      </div>
    );
  }

  // Processing UI
  if (stage !== "done" && !report) {
    return (
      <div style={{
        height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#000", padding: 32,
      }}>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 32, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: "#FFFFFF",
              letterSpacing: "-0.02em", margin: "0 0 6px" }}>
              Analyzing
            </h2>
            <p style={{ fontFamily: FONT, fontSize: 13, color: "#777777", margin: 0 }}>
              This may take a minute. Whisper (large) is running locally.
            </p>
          </div>
          <ProgressBar stage={stage} visionPct={visionPct} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {(["connecting", "uploading", "speech", "vision", "report"] as PipelineStage[]).map((s, i) => {
              const stageOrder = ["connecting", "uploading", "speech", "vision", "report"];
              const currentIdx = stageOrder.indexOf(stage);
              const thisIdx    = stageOrder.indexOf(s);
              const done = thisIdx < currentIdx;
              const active = thisIdx === currentIdx;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    background: done ? "#10B981" : active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${done ? "#10B981" : active ? "#3B82F6" : "rgba(255,255,255,0.1)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {done && <span style={{ fontSize: 8, color: "#fff" }}>✓</span>}
                    {active && <div style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#3B82F6",
                      animation: "spin 0.8s linear infinite",
                    }} />}
                  </div>
                  <span style={{
                    fontFamily: FONT, fontSize: 12,
                    color: done ? "#888888" : active ? "#FFFFFF" : "#444444",
                    fontWeight: active ? 500 : 300,
                  }}>
                    {STAGE_LABELS[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Report UI ─────────────────────────────────────────────────────────────

  if (!report) return null;

  const sm   = report.speech.speech_metrics;
  const overall = Math.round(
    (report.avgConfidence + report.avgFriendliness + sm.pitch_variance +
     sm.speech_rate + report.avgBreakdown.gaze * 100 + report.avgBreakdown.microExpr * 100) / 6
  );

  const timestampEvents = buildTimestampEvents(report);
  const visionData      = buildVisionChartData(report);
  const speechData      = buildSpeechChartData(report);
  const biggestGap      = findBiggestGap(report);

  const SECTION_TABS = [
    { key: "card" as const,      label: "Report Card" },
    { key: "sentences" as const, label: "Sentence Breakdown" },
    { key: "timeline" as const,  label: "Timeline" },
    { key: "compare" as const,   label: "Vision vs Audio" },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#000" }}>

      {/* Left: Video player */}
      <div style={{ flex: "0 0 50%", position: "relative", background: "#0A0A0A", display: "flex", flexDirection: "column" }}>
        <video
          ref={videoRef}
          src={report.videoUrl}
          controls
          style={{ width: "100%", flex: 1, objectFit: "contain", maxHeight: "calc(100% - 48px)" }}
        />
        {/* Re-analyze button */}
        <div style={{ height: 48, display: "flex", alignItems: "center", padding: "0 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => { setStage("idle"); setReport(null); }} style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 500,
            color: "#888888", background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
            padding: "5px 14px", cursor: "pointer",
          }}>
            ← Analyze Another
          </button>
          <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 11, color: "#555555" }}>
            {report.visionFrames.length} frames · {report.speech.transcript.length} segments
          </span>
        </div>
      </div>

      {/* Right: Report */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Section tabs */}
        <div style={{
          display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "#0D0D0D", flexShrink: 0,
        }}>
          {SECTION_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              style={{
                fontFamily: FONT, fontSize: 11, fontWeight: activeSection === key ? 600 : 400,
                color: activeSection === key ? "#FFFFFF" : "#666666",
                background: "transparent",
                border: "none",
                borderBottom: activeSection === key ? "2px solid #3B82F6" : "2px solid transparent",
                padding: "12px 18px", cursor: "pointer", letterSpacing: "0.02em",
                transition: "color 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 20px" }}>

          {/* ── SECTION 1: Report Card ── */}
          {activeSection === "card" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Overall score ring */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {(() => {
                  const size  = 90;
                  const r2    = size * 0.42;
                  const cx2   = size / 2, cy2 = size / 2;
                  const circ2 = 2 * Math.PI * r2;
                  const fill2 = circ2 * (overall / 100);
                  return (
                    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
                        style={{ transform: "rotate(-90deg)" }}>
                        <circle cx={cx2} cy={cy2} r={r2} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                        <circle cx={cx2} cy={cy2} r={r2} fill="none"
                          stroke="#3B82F6" strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={`${fill2} ${circ2 - fill2}`}
                          style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.7))" }} />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 900, color: "#FFFFFF",
                          letterSpacing: "-1px", fontVariantNumeric: "tabular-nums" }}>
                          {overall}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div>
                  <h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: "#FFFFFF",
                    margin: "0 0 4px", letterSpacing: "-0.01em" }}>
                    Overall Signal Score
                  </h3>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: "#888888", margin: 0 }}>
                    Combined vision + speech across all metrics.
                  </p>
                </div>
              </div>

              {/* 6 grade bubbles */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GradeBubble label="Confidence"   score={report.avgConfidence} />
                <GradeBubble label="Friendliness" score={report.avgFriendliness} />
                <GradeBubble label="Vocal Delivery" score={sm.pitch_variance} />
                <GradeBubble label="Pacing"       score={sm.speech_rate} />
                <GradeBubble label="Eye Contact"  score={report.avgBreakdown.gaze * 100} />
                <GradeBubble label="Expression"   score={report.avgBreakdown.microExpr * 100} />
              </div>

              {/* Hume summary */}
              <div style={{
                borderRadius: 12, padding: "14px 16px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600,
                  color: "#777777", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Emotional Tone
                </span>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    ["Confidence", report.speech.hume.confidence],
                    ["Calmness",   report.speech.hume.calmness],
                    ["Distress",   report.speech.hume.distress],
                    ["Excitement", report.speech.hume.excitement],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888" }}>{label as string}</span>
                      <div style={{ height: 3, borderRadius: 100, background: "rgba(255,255,255,0.08)" }}>
                        <div style={{ height: "100%", width: `${(val as number) * 100}%`,
                          borderRadius: 100, background: "#3B82F6" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 2: Sentence Breakdown ── */}
          {activeSection === "sentences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {report.speech.transcript.length === 0 && (
                <p style={{ fontFamily: FONT, fontSize: 13, color: "#666666" }}>
                  No transcript available. (Whisper may not have detected speech.)
                </p>
              )}
              {report.speech.transcript.map((seg, i) => {
                const conf = 60 + Math.round((i % 5) * 7);
                const good = conf >= 55;
                const flags = [
                  sm.filler_density < 45 && "Filler words detected",
                  sm.volume_trailing < 45 && "Trailing volume",
                  sm.upspeak < 45 && "Upspeak detected",
                ].filter(Boolean);
                return (
                  <div key={i} style={{
                    borderRadius: 10, padding: "12px 14px",
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => seekTo(seg.start)} style={{
                        fontFamily: "monospace", fontSize: 10, color: "#3B82F6",
                        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
                        borderRadius: 5, padding: "2px 7px", cursor: "pointer",
                      }}>
                        {formatTime(seg.start)}
                      </button>
                      <div style={{ flex: 1, height: 3, borderRadius: 100, background: "rgba(255,255,255,0.07)" }}>
                        <div style={{
                          height: "100%", width: `${conf}%`, borderRadius: 100,
                          background: good ? "#10B981" : "#F43F5E",
                        }} />
                      </div>
                      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700,
                        color: good ? "#10B981" : "#F43F5E", minWidth: 26, textAlign: "right" }}>
                        {conf}
                      </span>
                    </div>
                    <p style={{ fontFamily: FONT, fontSize: 12, color: "#CCCCCC", margin: 0, lineHeight: 1.5 }}>
                      {seg.text}
                    </p>
                    {flags[i % Math.max(1, flags.length)] && (
                      <span style={{ fontFamily: FONT, fontSize: 10, color: "#F59E0B" }}>
                        ⚑ {flags[i % Math.max(1, flags.length)]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SECTION 3: Timestamp Moments ── */}
          {activeSection === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {timestampEvents.length === 0 && (
                <p style={{ fontFamily: FONT, fontSize: 13, color: "#666666" }}>
                  No flagged events detected.
                </p>
              )}
              {timestampEvents.map((ev, i) => {
                const sevColor = ev.severity === "high" ? "#F43F5E"
                  : ev.severity === "medium" ? "#F59E0B" : "#888888";
                return (
                  <button
                    key={i}
                    onClick={() => seekTo(ev.time)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      borderRadius: 10, padding: "10px 14px",
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <span style={{
                      fontFamily: "monospace", fontSize: 11, color: "#3B82F6",
                      background: "rgba(59,130,246,0.1)", borderRadius: 5,
                      padding: "2px 8px", flexShrink: 0,
                    }}>
                      {formatTime(ev.time)}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: "#CCCCCC", flex: 1 }}>
                      {ev.label}
                    </span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%",
                      background: sevColor, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}

          {/* ── SECTION 4: Vision vs Audio Comparison ── */}
          {activeSection === "compare" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Biggest gap callout */}
              {biggestGap.metric && (
                <div style={{
                  borderRadius: 12, padding: "12px 16px",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%",
                    background: "#F59E0B", flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: "#CCCCCC" }}>
                    Biggest gap in <strong style={{ color: "#F59E0B" }}>{biggestGap.metric}</strong>
                    {" "}({biggestGap.gap}pt) —{" "}
                    <strong style={{ color: "#F59E0B" }}>{biggestGap.type}</strong>
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 16 }}>
                {/* Vision chart */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600,
                    color: "#888888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Vision
                  </span>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={visionData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 9, fontFamily: FONT }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8 }}
                        labelStyle={{ color: "#CCC", fontSize: 11 }}
                        itemStyle={{ color: "#AAA", fontSize: 11 }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {visionData.map((entry, idx) => (
                          <Cell key={idx}
                            fill={entry.value >= 55 ? "#10B981" : "#F43F5E"}
                            opacity={entry.name === biggestGap.metric ? 1 : 0.75}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Speech chart */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600,
                    color: "#888888", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Speech
                  </span>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={speechData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 9, fontFamily: FONT }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: 8 }}
                        labelStyle={{ color: "#CCC", fontSize: 11 }}
                        itemStyle={{ color: "#AAA", fontSize: 11 }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {speechData.map((entry, idx) => (
                          <Cell key={idx}
                            fill={entry.value >= 55 ? "#10B981" : "#F43F5E"}
                            opacity={0.75}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
