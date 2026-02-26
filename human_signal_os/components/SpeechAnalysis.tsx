"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { FaceLandmark, PoseLandmark } from "./FaceMeshCamera";

const FaceMeshCamera = dynamic(() => import("@/components/FaceMeshCamera"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#050709" }}>
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--border-default)", borderTopColor: "var(--blue)" }} />
    </div>
  ),
});

// ── Confident-mode scoring (mirrors LiveTracker) ───────────────────────────────

const F = {
  NOSE_TIP: 4, FOREHEAD_TOP: 10, CHIN: 152,
  L_EYE_TOP: 159, R_EYE_TOP: 386,
} as const;

const HISTORY_FRAMES = 30;

function _mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function _variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = _mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}
function _clamp(v: number, lo = 0, hi = 1): number { return Math.max(lo, Math.min(hi, v)); }
function _norm(v: number, lo: number, hi: number): number { return _clamp((v - lo) / (hi - lo)); }

function scoreConfident(
  face: FaceLandmark[],
  history: FaceLandmark[][],
  pose?: PoseLandmark[],
): number {
  const parts: number[] = [];

  // Head stability
  const noseTipYs = history.slice(-10).map(fr => fr[F.NOSE_TIP]?.y ?? 0);
  const jitter = _variance(noseTipYs);
  parts.push(_norm(jitter, 4e-5, 4e-7));

  // Shoulder level
  if (pose?.[11] && pose?.[12]) {
    const yDiff = Math.abs(pose[11].y - pose[12].y);
    parts.push(_norm(yDiff, 0.06, 0.015));
  } else {
    parts.push(0.5);
  }

  // Chin position
  const eyeCY = _mean([face[F.L_EYE_TOP]?.y ?? 0.38, face[F.R_EYE_TOP]?.y ?? 0.38]);
  const nosY  = face[F.NOSE_TIP]?.y ?? 0.55;
  const chinY = face[F.CHIN]?.y ?? 0.75;
  const fhd   = face[F.FOREHEAD_TOP]?.y ?? 0.20;
  const faceH = chinY - fhd;
  const ratio = faceH > 0.01 ? (nosY - eyeCY) / faceH : 0.35;
  const chinScore =
    ratio >= 0.28 && ratio <= 0.46 ? 1 :
    ratio < 0.28 ? _norm(ratio, 0.14, 0.28) :
                   _norm(ratio, 0.58, 0.46);
  parts.push(chinScore);

  return _mean(parts);
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Status = "idle" | "recording" | "processing" | "analyzing" | "done" | "error";

type AnalysisSentence = {
  text: string;
  confidenceScore: number;
  weakPhrases: string[];
};

type AnalysisResult = {
  overallConfidenceScore: number;
  sentences: AnalysisSentence[];
  biasFlags: string[];
  dominantEmotion: string;
  reframedVersion: string;
};

type HistoryEntry = {
  id: string;
  timestamp: number;
  overallConfidenceScore: number;
  biasFlags: string[];
  dominantEmotion: string;
  transcriptSnippet: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_SECS    = 60;
const HISTORY_KEY = "human-signal-speech-history";
const MAX_HISTORY = 5;
const WAVE_HEIGHTS = [28, 40, 20, 44, 16, 36, 24, 48, 18, 38, 22, 42, 14, 34, 26];

const DEMO_TRANSCRIPT =
  "I think maybe I should mention that, you know, I kind of believe we should possibly consider a different approach. " +
  "I'm not sure if it's quite right but I guess what I'm trying to say is that we sort of need to rethink this. " +
  "It might work, I hope, if we try to implement something new. I just feel like, perhaps, there's a better way.";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAudioMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green)";
  if (score >= 40) return "var(--amber)";
  return "var(--red)";
}

function highlightWeakPhrases(text: string, weakPhrases: string[]): React.ReactNode {
  if (!weakPhrases.length) return <>{text}</>;
  const escaped = weakPhrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        const isWeak = weakPhrases.some((wp) => wp.toLowerCase() === part.toLowerCase());
        return isWeak ? (
          <mark key={i} style={{ background: "rgba(244,63,94,0.18)", color: "var(--red)", borderRadius: 3, padding: "1px 3px", fontWeight: 500 }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
  catch { return []; }
}

function saveHistory(entries: HistoryEntry[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY))); }
  catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono tracking-widest uppercase shrink-0" style={{ color: "var(--text-muted)" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);

  // Animate the displayed number toward the target
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    let raf: number;
    let current = displayScore;
    const step = () => {
      const diff = score - current;
      if (Math.abs(diff) < 0.5) { setDisplayScore(score); return; }
      current += diff * 0.15;
      setDisplayScore(Math.round(current));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
        />
        <text x="48" y="48" textAnchor="middle" dy="0.35em" fill={color} fontSize="20"
          fontFamily="monospace" fontWeight="bold"
          style={{ transition: "fill 0.4s ease" }}>
          {displayScore}
        </text>
      </svg>
      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Confidence Score</span>
    </div>
  );
}

function SentenceCard({ sentence }: { sentence: AnalysisSentence }) {
  const color = scoreColor(sentence.confidenceScore);
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 rounded-lg px-4 py-3"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {highlightWeakPhrases(sentence.text, sentence.weakPhrases)}
        </p>
      </div>
      <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold mt-0.5"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, color }}>
        {sentence.confidenceScore}
      </div>
    </div>
  );
}

function WeakPhraseCard({ phrase, context }: { phrase: string; context: string }) {
  const trimmed = context.length > 72 ? context.slice(0, 72).trimEnd() + "…" : context;
  return (
    <div className="rounded-lg px-3 py-2.5"
      style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)" }}>
      <div className="text-xs font-mono font-semibold mb-1" style={{ color: "var(--red)" }}>
        &ldquo;{phrase}&rdquo;
      </div>
      <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{trimmed}</div>
    </div>
  );
}

function RightPanelSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full py-16">
      <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--border-default)", borderTopColor: "var(--blue)" }} />
      <span className="text-xs font-mono text-center" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

function RightPanelIdle({ status, elapsed }: { status: Status; elapsed: number }) {
  if (status === "recording") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="flex items-end gap-1" style={{ height: 48 }}>
          {WAVE_HEIGHTS.map((h, i) => (
            <div key={i} className="rounded-full"
              style={{ width: 3, height: h, background: "var(--red)", opacity: 0.6 + (i % 3) * 0.13,
                animation: `pulse ${0.6 + (i % 5) * 0.1}s ease-in-out infinite alternate` }} />
          ))}
        </div>
        <span className="text-xs font-mono" style={{ color: "var(--red)" }}>
          REC • {formatTime(elapsed)} / {formatTime(MAX_SECS)}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3.5a3.5 3.5 0 0 1 3.5 3.5v7a3.5 3.5 0 0 1-7 0V7a3.5 3.5 0 0 1 3.5-3.5z" stroke="var(--text-muted)" strokeWidth="1.5" />
        <path d="M5.5 14a8.5 8.5 0 0 0 17 0" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 22.5V26" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        Press record to start capturing your speech
      </span>
    </div>
  );
}

function HistoryItem({ entry, isLatest, isLast }: { entry: HistoryEntry; isLatest: boolean; isLast: boolean }) {
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const color = scoreColor(entry.overallConfidenceScore);
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-2 h-2 rounded-full mt-0.5 shrink-0"
          style={{ background: isLatest ? color : "#2a3d5a" }} />
        {!isLast && <div className="w-px flex-1 mt-1" style={{ background: "var(--border-subtle)", minHeight: 20 }} />}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold" style={{ color }}>{entry.overallConfidenceScore}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{dateStr} {timeStr}</span>
          <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>· {entry.dominantEmotion}</span>
        </div>
        {entry.transcriptSnippet && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {entry.transcriptSnippet}
          </p>
        )}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
      <div style={{ color: "var(--text-muted)" }}>{label} · {payload[0]?.payload?.date}</div>
      <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: 13 }}>{payload[0]?.value}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SpeechAnalysis() {
  const [status, setStatus]         = useState<Status>("idle");
  const [elapsed, setElapsed]       = useState(0);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis]     = useState<AnalysisResult | null>(null);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [meshScore, setMeshScore]   = useState(0.5);
  const [history, setHistory]       = useState<HistoryEntry[]>([]);
  const [isDemo, setIsDemo]         = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef       = useRef(0);

  // Live scoring refs
  const faceHistoryRef   = useRef<FaceLandmark[][]>([]);
  const poseDataRef      = useRef<PoseLandmark[] | undefined>(undefined);
  const liveScoreRef     = useRef(0);
  const isRecordingRef        = useRef(false);
  const historyRef            = useRef<HistoryEntry[]>([]);
  const recordingAbortedRef   = useRef(false);

  // Keep refs in sync
  useEffect(() => { isRecordingRef.current = status === "recording"; }, [status]);
  useEffect(() => { historyRef.current = history; }, [history]);

  // Load history from localStorage on mount
  useEffect(() => { setHistory(loadHistory()); }, []);

  // ── Live Confident scoring during recording ────────────────────────────────
  const handleFaceLandmarks = useCallback((landmarks: FaceLandmark[]) => {
    if (!isRecordingRef.current) return;
    faceHistoryRef.current.push(landmarks);
    if (faceHistoryRef.current.length > HISTORY_FRAMES) faceHistoryRef.current.shift();
    const raw = scoreConfident(landmarks, faceHistoryRef.current, poseDataRef.current);
    liveScoreRef.current = liveScoreRef.current * 0.82 + raw * 0.18;
    setMeshScore(liveScoreRef.current);
  }, []);

  const handlePoseLandmarks = useCallback((landmarks: PoseLandmark[]) => {
    poseDataRef.current = landmarks;
  }, []);

  // ── sendAudio: Deepgram → Claude ──────────────────────────────────────────
  async function sendAudio(blob: Blob, mimeType: string) {
    setStatus("processing");

    let text: string;
    try {
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `recording.${ext}`, { type: mimeType || "audio/webm" });
      const form = new FormData();
      form.append("audio", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error(`Transcription error ${res.status}`);
      const data = await res.json();
      text = (data.transcript ?? "").trim();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed.");
      setStatus("error");
      return;
    }

    if (!text) {
      setError("No speech detected. Try speaking louder or for longer.");
      setStatus("error");
      return;
    }

    setTranscript(text);
    setStatus("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      if (!res.ok) throw new Error(`Analysis error ${res.status}`);
      const data = await res.json();
      const result = data.analysis as AnalysisResult;
      setAnalysis(result);
      // Update mesh color to reflect overall speech confidence
      setMeshScore(result.overallConfidenceScore / 100);
      setStatus("done");

      // Save to localStorage history
      const newEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        overallConfidenceScore: result.overallConfidenceScore,
        biasFlags: result.biasFlags ?? [],
        dominantEmotion: result.dominantEmotion ?? "",
        transcriptSnippet: text.slice(0, 100),
      };
      const updated = [...historyRef.current, newEntry].slice(-MAX_HISTORY);
      setHistory(updated);
      saveHistory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStatus("error");
    }
  }

  // ── stopRecording ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    recordingAbortedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop(); // fires onstop → sendAudio
    } else if (!mr) {
      // Recorder never created (stop clicked while getUserMedia was pending)
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStatus("idle");
    }
  }, []);

  // ── runDemo: analyze hardcoded transcript without recording ───────────────
  async function runDemo() {
    setError("");
    setAnalysis(null);
    setCopied(false);
    setMeshScore(0.5);
    setIsDemo(true);
    setTranscript(DEMO_TRANSCRIPT);
    // Estimate ~120 wpm for elapsed display
    setElapsed(Math.round((DEMO_TRANSCRIPT.split(/\s+/).length / 120) * 60));
    setStatus("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: DEMO_TRANSCRIPT }),
      });
      if (!res.ok) throw new Error(`Analysis error ${res.status}`);
      const data = await res.json();
      const result = data.analysis as AnalysisResult;
      setAnalysis(result);
      setMeshScore(result.overallConfidenceScore / 100);
      setStatus("done");
      // Demo runs are not saved to history
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo analysis failed.");
      setStatus("error");
      setIsDemo(false);
    }
  }

  // ── startRecording ─────────────────────────────────────────────────────────
  async function startRecording() {
    // ① Reset
    setError("");
    setTranscript("");
    setAnalysis(null);
    setCopied(false);
    setIsDemo(false);
    setElapsed(0);
    elapsedRef.current = 0;
    liveScoreRef.current = 0;
    faceHistoryRef.current = [];
    setMeshScore(0.5);
    recordingAbortedRef.current = false;

    // ② IMMEDIATE visual feedback — button turns red + countdown starts NOW,
    //    before any async work so the UI never feels unresponsive on click.
    setStatus("recording");
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_SECS) stopRecording();
    }, 1000);

    // ③ Guard: getUserMedia requires a secure context (HTTPS or localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      clearInterval(timerRef.current!); timerRef.current = null;
      setError("Microphone API unavailable — page must be served over HTTPS or localhost.");
      setStatus("error");
      return;
    }

    // ④ Request mic (shows the browser permission prompt)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (recordingAbortedRef.current) return; // user clicked Stop while waiting for permission
      clearInterval(timerRef.current!); timerRef.current = null;
      const isDenied = err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setError(isDenied
        ? "Microphone access denied — allow mic access in your browser/system settings and try again."
        : `Could not access microphone: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    // If user clicked Stop while the permission prompt was showing, clean up and bail
    if (recordingAbortedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
    streamRef.current = stream;

    // ⑤ Create MediaRecorder — try preferred MIME, fall back to browser default
    //    (some browsers report isTypeSupported=true but reject the MIME in the constructor)
    const mimeType = getAudioMime();
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      try {
        mr = new MediaRecorder(stream);
      } catch (err2) {
        clearInterval(timerRef.current!); timerRef.current = null;
        stream.getTracks().forEach((t) => t.stop()); streamRef.current = null;
        setError(`Cannot create recorder: ${err2 instanceof Error ? err2.message : String(err2)}`);
        setStatus("error"); return;
      }
    }
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    const actualMime = mr.mimeType || mimeType || "audio/webm";

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onerror = () => { setError("Recording error — please try again."); setStatus("error"); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: actualMime });
      sendAudio(blob, actualMime);
    };

    // ⑥ Start recording
    try {
      mr.start(250);
    } catch (err) {
      clearInterval(timerRef.current!); timerRef.current = null;
      stream.getTracks().forEach((t) => t.stop()); streamRef.current = null; mediaRecorderRef.current = null;
      setError(`Could not start recording: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
    }
  }

  function handleRecordBtn() {
    if (status === "recording") { stopRecording(); }
    else if (canRecord) { startRecording(); }
  }

  async function handleCopy() {
    if (!analysis?.reframedVersion) return;
    await navigator.clipboard.writeText(analysis.reframedVersion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isRecording  = status === "recording";
  const showOverlay  = status === "processing" || status === "analyzing";
  const overlayText  = status === "processing" ? "Transcribing…" : "Analyzing with Claude…";
  const showAnalysis = status === "done" && analysis !== null;
  const showCamera   = !showAnalysis;
  const canRecord    = status !== "processing" && status !== "analyzing";
  const progress     = Math.min(elapsed / MAX_SECS, 1);

  const weakPhraseCards = showAnalysis
    ? (() => {
        const seen = new Set<string>();
        return (analysis!.sentences ?? [])
          .flatMap((s) => s.weakPhrases.map((phrase) => ({ phrase, context: s.text })))
          .filter(({ phrase }) => {
            const k = phrase.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
      })()
    : [];

  const chartData = history.map((entry, i) => ({
    session: `S${i + 1}`,
    score: entry.overallConfidenceScore,
    date: new Date(entry.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Main row: camera/transcript + sidebar ─────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left: Camera / Annotated transcript ───────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden"
          style={{ borderRight: "1px solid var(--border-subtle)" }}>

          {/* Content area */}
          <div className="relative flex-1 min-h-0">

            {/* Camera (shown when not displaying analysis results) */}
            {showCamera && (
              <>
                <FaceMeshCamera
                  confidenceScore={meshScore}
                  onFaceLandmarks={handleFaceLandmarks}
                  onPoseLandmarks={handlePoseLandmarks}
                />
                {isRecording && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono z-10"
                    style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)", backdropFilter: "blur(4px)" }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "var(--red)" }} />
                    <span style={{ color: "var(--red)" }}>REC</span>
                  </div>
                )}
                {/* DEMO badge */}
                {isDemo && status === "analyzing" && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono z-10"
                    style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.4)", backdropFilter: "blur(4px)" }}>
                    <span style={{ color: "var(--purple)" }}>DEMO</span>
                  </div>
                )}
                {showOverlay && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20"
                    style={{ background: "rgba(8,10,15,0.78)", backdropFilter: "blur(6px)" }}>
                    <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "var(--border-default)", borderTopColor: "var(--blue)" }} />
                    <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{overlayText}</span>
                  </div>
                )}
              </>
            )}

            {/* Annotated transcript (replaces camera after analysis) */}
            {showAnalysis && (
              <div className="absolute inset-0 overflow-y-auto">
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <SectionLabel>Annotated Transcript</SectionLabel>
                    {isDemo && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                        style={{ background: "rgba(139,92,246,0.15)", color: "var(--purple)", border: "1px solid rgba(139,92,246,0.3)" }}>
                        DEMO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                    Score per sentence —{" "}
                    <mark style={{ background: "rgba(244,63,94,0.18)", color: "var(--red)", borderRadius: 3, padding: "1px 3px" }}>
                      highlighted phrases
                    </mark>{" "}signal weak language
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {(analysis!.sentences ?? []).map((s, i) => (
                      <SentenceCard key={i} sentence={s} />
                    ))}
                  </div>

                  {/* Reframed version — green box */}
                  {analysis!.reframedVersion && (
                    <div className="mt-1 rounded-xl px-4 py-4"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.22)" }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1l1.5 3.5L11 5l-2.5 2.5L9 11 6 9.5 3 11l.5-3.5L1 5l3.5-.5L6 1z" fill="var(--green)" />
                          </svg>
                          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: "var(--green)" }}>
                            Reframed Version
                          </span>
                        </div>
                        <button onClick={handleCopy}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all active:scale-95"
                          style={{ background: copied ? "rgba(16,185,129,0.15)" : "var(--bg-hover)",
                            border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : "var(--border-default)"}`,
                            color: copied ? "var(--green)" : "var(--text-secondary)" }}>
                          {copied ? (
                            <><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>Copied</>
                          ) : (
                            <><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M3 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2" /></svg>Copy</>
                          )}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                        {analysis!.reframedVersion}
                      </p>
                    </div>
                  )}
                  <div className="h-2" />
                </div>
              </div>
            )}
          </div>

          {/* Controls strip */}
          <div className="shrink-0 flex flex-col gap-2.5 px-6 py-4"
            style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)" }}>

            {/* ── Status pipeline ── */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest">
              {[
                { label: "IDLE",       active: status === "idle" || status === "error",             color: status === "error" ? "var(--red)" : "var(--text-muted)" },
                { label: "RECORDING",  active: status === "recording",                              color: "var(--red)"   },
                { label: "PROCESSING", active: status === "processing" || status === "analyzing",   color: "var(--blue)"  },
                { label: "DONE",       active: status === "done",                                   color: "var(--green)" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-2">
                  <span style={{
                    color: step.active ? step.color : "var(--border-default)",
                    fontWeight: step.active ? 700 : 400,
                    transition: "color 0.2s, font-weight 0.1s",
                  }}>
                    {step.label}
                  </span>
                  {i < arr.length - 1 && (
                    <span style={{ color: "var(--border-default)" }}>→</span>
                  )}
                </div>
              ))}
            </div>

            {/* ── Progress bar + countdown ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: isRecording ? "var(--red)" : "var(--border-default)",
                    transition: isRecording ? "width 1s linear" : "none",
                  }} />
              </div>
              <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: isRecording ? "var(--red)" : "var(--text-muted)", minWidth: 36 }}>
                {isRecording ? formatTime(MAX_SECS - elapsed) : formatTime(MAX_SECS)}
              </span>
            </div>

            {/* ── Buttons ── */}
            <div className="flex items-center justify-center gap-3">
              {!isRecording && (
                <button
                  onClick={runDemo}
                  disabled={!canRecord}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 2l7 3.5L2 9V2z" fill="currentColor" />
                  </svg>
                  Demo
                </button>
              )}

              <button
                onClick={handleRecordBtn}
                disabled={!canRecord}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isRecording ? "var(--red)" : "linear-gradient(135deg, var(--blue), var(--purple))",
                  color: "white",
                  boxShadow: isRecording ? "0 0 0 6px rgba(244,63,94,0.12)" : "0 0 0 6px rgba(59,130,246,0.1)",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
              >
                {isRecording ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" />
                    </svg>
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1.5a2 2 0 0 1 2 2v4a2 2 0 0 1-4 0v-4a2 2 0 0 1 2-2z" fill="white" />
                      <path d="M2.5 6.5a4.5 4.5 0 0 0 9 0" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                      <path d="M7 11v2" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {status === "done" || status === "error" ? "Record Again" : "Start Recording"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Analysis sidebar ──────────────────────────────────────── */}
        <div className="flex flex-col overflow-y-auto shrink-0"
          style={{ width: 300, background: "var(--bg-panel)" }}>

          {(status === "processing" || status === "analyzing") && (
            <RightPanelSpinner label={status === "processing" ? "Transcribing with Deepgram…" : "Analyzing with Claude…"} />
          )}

          {(status === "idle" || status === "recording") && (
            <div className="flex flex-col gap-5 p-5 h-full">
              <RightPanelIdle status={status} elapsed={elapsed} />
              <div>
                <SectionLabel>How it works</SectionLabel>
                <div className="mt-3 rounded-xl px-4 py-4"
                  style={{ background: "var(--bg-elevated)", border: "1px dashed var(--border-subtle)" }}>
                  <ol className="flex flex-col gap-2.5 list-none">
                    {[
                      "Press record — mic opens, camera continues",
                      "Confident scoring runs live on the mesh",
                      "Audio transcribed via Deepgram",
                      "Claude scores each sentence & flags weak language",
                      "Mesh updates to reflect overall confidence score",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5"
                          style={{ background: "var(--bg-hover)", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}>
                          {i + 1}
                        </span>
                        <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col gap-4 p-5">
              <SectionLabel>Error</SectionLabel>
              <div className="rounded-xl px-4 py-4"
                style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)" }}>
                <span className="text-sm" style={{ color: "var(--red)" }}>{error || "Something went wrong."}</span>
              </div>
              {transcript && (
                <div>
                  <SectionLabel>Raw Transcript</SectionLabel>
                  <div className="mt-3 rounded-xl px-4 py-4"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {transcript}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAnalysis && (
            <div className="flex flex-col gap-5 p-5">
              <div>
                <SectionLabel>Overall Score</SectionLabel>
                <div className="mt-4 flex justify-center">
                  <ScoreRing score={analysis!.overallConfidenceScore} />
                </div>
              </div>

              <div>
                <SectionLabel>Dominant Emotion</SectionLabel>
                <div className="mt-2.5">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
                    {analysis!.dominantEmotion}
                  </span>
                </div>
              </div>

              {(analysis!.biasFlags ?? []).length > 0 && (
                <div>
                  <SectionLabel>Bias Flags</SectionLabel>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {analysis!.biasFlags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0 mt-0.5">
                          <path d="M6.5 2L7.9 5.5H11.5L8.5 7.7 9.7 11.2 6.5 9 3.3 11.2 4.5 7.7 1.5 5.5H5.1L6.5 2Z" fill="var(--amber)" />
                        </svg>
                        <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {weakPhraseCards.length > 0 && (
                <div>
                  <SectionLabel>Weak Phrases</SectionLabel>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {weakPhraseCards.map((item, i) => (
                      <WeakPhraseCard key={i} phrase={item.phrase} context={item.context} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <SectionLabel>Stats</SectionLabel>
                <div className="mt-2.5 rounded-xl px-4 py-3 flex flex-col gap-2"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <StatRow label="Words" value={transcript.trim().split(/\s+/).filter(Boolean).length.toString()} />
                  <StatRow label="Duration" value={formatTime(elapsed)} />
                  <StatRow label="WPM"
                    value={elapsed > 0 ? Math.round((transcript.trim().split(/\s+/).filter(Boolean).length / elapsed) * 60).toString() : "—"} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── History section (hidden during recording/processing for max camera height) */}
      {history.length > 0 && (status === "idle" || status === "done" || status === "error") && (
        <div className="shrink-0 flex overflow-hidden"
          style={{ height: 196, borderTop: "1px solid var(--border-subtle)", background: "var(--bg-panel)" }}>

          {/* Recharts line chart */}
          <div className="flex flex-col flex-1 px-5 py-3 min-w-0">
            <span className="text-xs font-mono tracking-widest uppercase mb-2 shrink-0" style={{ color: "var(--text-muted)" }}>
              Confidence Over Time
            </span>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" vertical={false} />
                  <XAxis dataKey="session" tick={{ fontSize: 10, fill: "#3d5070" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#3d5070" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#1f2d45", strokeWidth: 1 }} />
                  <Line
                    type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col shrink-0 py-3 px-4 overflow-y-auto"
            style={{ width: 320, borderLeft: "1px solid var(--border-subtle)" }}>
            <span className="text-xs font-mono tracking-widest uppercase mb-3 shrink-0" style={{ color: "var(--text-muted)" }}>
              Session History
            </span>
            {[...history].reverse().slice(0, MAX_HISTORY).map((entry, i, arr) => (
              <HistoryItem key={entry.id} entry={entry} isLatest={i === 0} isLast={i === arr.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
