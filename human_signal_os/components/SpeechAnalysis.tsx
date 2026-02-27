"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
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

  const noseTipYs = history.slice(-10).map(fr => fr[F.NOSE_TIP]?.y ?? 0);
  const jitter = _variance(noseTipYs);
  parts.push(_norm(jitter, 4e-5, 4e-7));

  if (pose?.[11] && pose?.[12]) {
    const yDiff = Math.abs(pose[11].y - pose[12].y);
    parts.push(_norm(yDiff, 0.06, 0.015));
  } else {
    parts.push(0.5);
  }

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
          <span key={i} title={`Weak phrase: "${part}"`}
            style={{
              textDecorationLine: "underline",
              textDecorationStyle: "wavy",
              textDecorationColor: "var(--red)",
              textDecorationSkipInk: "none",
              cursor: "help",
            }}>
            {part}
          </span>
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

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 110, H = 32;
  const minV = Math.min(...data), maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - minV) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  const lastV = data[data.length - 1];
  const lastY = H - ((lastV - minV) / range) * (H - 8) - 4;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={lastY} r={3} fill="var(--blue)" />
    </svg>
  );
}

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
      <div className="flex-1 rounded-xl px-4 py-3"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
          {highlightWeakPhrases(sentence.text, sentence.weakPhrases)}
        </p>
      </div>
      <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold mt-0.5"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          color,
        }}>
        {sentence.confidenceScore}
      </div>
    </div>
  );
}

function InsightsCard({ analysis, transcript, elapsed, weakPhraseCards }: {
  analysis: AnalysisResult;
  transcript: string;
  elapsed: number;
  weakPhraseCards: { phrase: string; context: string }[];
}) {
  const [tab, setTab] = useState<"insights" | "phrases" | "stats">("insights");
  const tabs: { id: "insights" | "phrases" | "stats"; label: string; badge?: number }[] = [
    { id: "insights", label: "Insights" },
    { id: "phrases", label: "Phrases", badge: weakPhraseCards.length || undefined },
    { id: "stats", label: "Stats" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
      <div className="flex" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
            style={{
              color: tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: tab === t.id ? "2px solid var(--blue)" : "2px solid transparent",
              background: "none",
            }}>
            {t.label}
            {t.badge ? (
              <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "rgba(244,63,94,0.2)", color: "var(--red)" }}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "insights" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Emotion</span>
              <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full"
                style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
                {analysis.dominantEmotion}
              </span>
            </div>
            {(analysis.biasFlags ?? []).length === 0 ? (
              <div className="flex items-center gap-2 py-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="var(--border-default)" strokeWidth="1.2" />
                  <path d="M3.5 6l1.8 1.8L8.5 4" stroke="var(--green)" strokeWidth="1.2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>No bias flags detected</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {analysis.biasFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg width="12" height="12" viewBox="0 0 13 13" fill="none" className="shrink-0 mt-0.5">
                      <path d="M6.5 2L7.9 5.5H11.5L8.5 7.7 9.7 11.2 6.5 9 3.3 11.2 4.5 7.7 1.5 5.5H5.1L6.5 2Z"
                        fill="var(--amber)" />
                    </svg>
                    <span className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{flag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "phrases" && (
          <div className="flex flex-col gap-2">
            {weakPhraseCards.length === 0 ? (
              <span className="text-xs py-1" style={{ color: "var(--text-muted)" }}>No weak phrases detected</span>
            ) : (
              weakPhraseCards.map((item, i) => (
                <div key={i} className="rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)" }}>
                  <div className="text-xs font-mono font-semibold mb-1" style={{ color: "var(--red)" }}>
                    &ldquo;{item.phrase}&rdquo;
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {item.context.length > 72 ? item.context.slice(0, 72).trimEnd() + "…" : item.context}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "stats" && (
          <div className="flex flex-col gap-2.5">
            {[
              { label: "Words", value: transcript.trim().split(/\s+/).filter(Boolean).length.toString() },
              { label: "Duration", value: formatTime(elapsed) },
              {
                label: "WPM",
                value: elapsed > 0
                  ? Math.round((transcript.trim().split(/\s+/).filter(Boolean).length / elapsed) * 60).toString()
                  : "—",
              },
              { label: "Weak phrases", value: weakPhraseCards.length.toString() },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
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
              style={{
                width: 3, height: h, background: "var(--red)",
                opacity: 0.6 + (i % 3) * 0.13,
                animation: `pulse ${0.6 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
              }} />
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
        <path d="M14 3.5a3.5 3.5 0 0 1 3.5 3.5v7a3.5 3.5 0 0 1-7 0V7a3.5 3.5 0 0 1 3.5-3.5z"
          stroke="var(--text-muted)" strokeWidth="1.5" />
        <path d="M5.5 14a8.5 8.5 0 0 0 17 0" stroke="var(--text-muted)" strokeWidth="1.5"
          strokeLinecap="round" />
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
        {!isLast && (
          <div className="w-px flex-1 mt-1"
            style={{ background: "var(--border-subtle)", minHeight: 20 }} />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold" style={{ color }}>
            {entry.overallConfidenceScore}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{dateStr} {timeStr}</span>
          <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>
            · {entry.dominantEmotion}
          </span>
        </div>
        {entry.transcriptSnippet && (
          <p className="text-xs mt-0.5 leading-relaxed"
            style={{
              color: "var(--text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
            {entry.transcriptSnippet}
          </p>
        )}
      </div>
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
  const [focusMode, setFocusMode]   = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef       = useRef(0);

  const faceHistoryRef        = useRef<FaceLandmark[][]>([]);
  const poseDataRef           = useRef<PoseLandmark[] | undefined>(undefined);
  const liveScoreRef          = useRef(0);
  const isRecordingRef        = useRef(false);
  const historyRef            = useRef<HistoryEntry[]>([]);
  const recordingAbortedRef   = useRef(false);

  useEffect(() => { isRecordingRef.current = status === "recording"; }, [status]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { setHistory(loadHistory()); }, []);

  // ── Live scoring ──────────────────────────────────────────────────────────
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

  // ── sendAudio ─────────────────────────────────────────────────────────────
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
      setMeshScore(result.overallConfidenceScore / 100);
      setStatus("done");

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

  // ── stopRecording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    recordingAbortedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    } else if (!mr) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStatus("idle");
    }
  }, []);

  // ── runDemo ───────────────────────────────────────────────────────────────
  async function runDemo() {
    setError("");
    setAnalysis(null);
    setCopied(false);
    setMeshScore(0.5);
    setIsDemo(true);
    setTranscript(DEMO_TRANSCRIPT);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo analysis failed.");
      setStatus("error");
      setIsDemo(false);
    }
  }

  // ── startRecording ────────────────────────────────────────────────────────
  async function startRecording() {
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

    setStatus("recording");
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_SECS) stopRecording();
    }, 1000);

    if (!navigator.mediaDevices?.getUserMedia) {
      clearInterval(timerRef.current!); timerRef.current = null;
      setError("Microphone API unavailable — page must be served over HTTPS or localhost.");
      setStatus("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (recordingAbortedRef.current) return;
      clearInterval(timerRef.current!); timerRef.current = null;
      const isDenied = err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setError(isDenied
        ? "Microphone access denied — allow mic access in your browser/system settings and try again."
        : `Could not access microphone: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    if (recordingAbortedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
    streamRef.current = stream;

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
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

  const sparklineData = history.map(e => e.overallConfidenceScore);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left: Camera / Annotated transcript ─────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden"
          style={{ borderRight: focusMode ? "none" : "1px solid var(--border-subtle)" }}>

          <div className="relative flex-1 min-h-0">

            {/* Camera */}
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
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                      style={{ background: "var(--red)" }} />
                    <span style={{ color: "var(--red)" }}>REC</span>
                  </div>
                )}
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
                    <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                      {overlayText}
                    </span>
                  </div>
                )}

                {/* Centered CTA overlay */}
                {!showOverlay && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-5 pointer-events-none"
                    style={{ background: isRecording ? "transparent" : "rgba(8,10,15,0.42)" }}
                  >
                    {/* Primary record / stop button */}
                    <button
                      onClick={handleRecordBtn}
                      disabled={!canRecord}
                      className="pointer-events-auto flex items-center gap-3 font-bold text-base transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        padding: "18px 52px",
                        borderRadius: "20px",
                        background: isRecording
                          ? "var(--red)"
                          : "linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)",
                        color: "white",
                        boxShadow: isRecording
                          ? "0 8px 40px rgba(244,63,94,0.35)"
                          : "0 8px 40px rgba(59,130,246,0.28)",
                        animation: isRecording
                          ? "infPulseRec 1.8s ease-in-out infinite"
                          : canRecord
                          ? "infPulseIdle 3s ease-in-out infinite"
                          : "none",
                      }}
                    >
                      {isRecording ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="3.5" y="3.5" width="9" height="9" rx="2" fill="white" />
                          </svg>
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 8 2z" fill="white" />
                            <path d="M3 8a5 5 0 0 0 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M8 13v2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          {status === "done" || status === "error" ? "Record Again" : "Start Recording"}
                        </>
                      )}
                    </button>

                    {/* Timer strip — recording only */}
                    {isRecording && (
                      <div className="pointer-events-auto flex flex-col items-center gap-2 w-60">
                        <div className="w-full h-0.5 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div style={{
                            width: `${progress * 100}%`, height: "100%",
                            background: "var(--red)", transition: "width 1s linear",
                          }} />
                        </div>
                        <span className="text-xs font-mono" style={{ color: "rgba(244,63,94,0.75)" }}>
                          {formatTime(elapsed)} · {formatTime(MAX_SECS)} max
                        </span>
                      </div>
                    )}

                    {/* Demo — idle / done / error */}
                    {!isRecording && canRecord && (
                      <button
                        onClick={runDemo}
                        className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.38)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 1.5l6 3.5-6 3.5V1.5z" fill="currentColor" />
                        </svg>
                        Try Demo
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Annotated transcript */}
            {showAnalysis && (
              <div className="absolute inset-0 overflow-y-auto">
                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SectionLabel>Annotated Transcript</SectionLabel>
                      {isDemo && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                          style={{ background: "rgba(139,92,246,0.15)", color: "var(--purple)", border: "1px solid rgba(139,92,246,0.3)" }}>
                          DEMO
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleRecordBtn}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, var(--blue), var(--purple))",
                        color: "white",
                        boxShadow: "0 2px 12px rgba(59,130,246,0.25)",
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M5.5 1a2 2 0 0 1 2 2v3a2 2 0 0 1-4 0V3a2 2 0 0 1 2-2z" fill="white" />
                        <path d="M2 5.5a3.5 3.5 0 0 0 7 0" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M5.5 9v1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      Record Again
                    </button>
                  </div>
                  <p className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                    Score per sentence —{" "}
                    <span style={{
                      textDecorationLine: "underline",
                      textDecorationStyle: "wavy",
                      textDecorationColor: "var(--red)",
                      textDecorationSkipInk: "none",
                    }}>
                      wavy underlines
                    </span>{" "}signal weak language
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {(analysis!.sentences ?? []).map((s, i) => (
                      <SentenceCard key={i} sentence={s} />
                    ))}
                  </div>

                  {/* Reframed version — glassmorphism */}
                  {analysis!.reframedVersion && (
                    <div className="mt-1 rounded-2xl px-4 py-4"
                      style={{
                        background: "rgba(16,185,129,0.04)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(16,185,129,0.22)",
                        boxShadow: "0 4px 24px rgba(16,185,129,0.07)",
                        animation: "infFadeUp 0.4s ease forwards",
                      }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1l1.5 3.5L11 5l-2.5 2.5L9 11 6 9.5 3 11l.5-3.5L1 5l3.5-.5L6 1z"
                              fill="var(--green)" />
                          </svg>
                          <span className="text-xs font-mono uppercase tracking-wider"
                            style={{ color: "var(--green)" }}>
                            Reframed Version
                          </span>
                        </div>
                        <button onClick={handleCopy}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
                          style={{
                            background: copied ? "rgba(16,185,129,0.15)" : "var(--bg-hover)",
                            border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : "var(--border-default)"}`,
                            color: copied ? "var(--green)" : "var(--text-secondary)",
                          }}>
                          {copied ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                <path d="M2 5.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4"
                                  strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                <rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                                <path d="M3 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8"
                                  stroke="currentColor" strokeWidth="1.2" />
                              </svg>
                              Copy
                            </>
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

          {/* Minimal meta bar */}
          <div className="shrink-0 flex items-center justify-between px-5 py-2"
            style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest">
              {[
                { label: "IDLE",  active: status === "idle" || status === "error",           color: status === "error" ? "var(--red)" : "var(--text-muted)" },
                { label: "REC",   active: status === "recording",                            color: "var(--red)"   },
                { label: "PROC",  active: status === "processing" || status === "analyzing", color: "var(--blue)"  },
                { label: "DONE",  active: status === "done",                                 color: "var(--green)" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-1.5">
                  <span style={{
                    color: step.active ? step.color : "var(--border-default)",
                    fontWeight: step.active ? 700 : 400,
                    transition: "color 0.2s",
                  }}>
                    {step.label}
                  </span>
                  {i < arr.length - 1 && <span style={{ color: "var(--border-default)" }}>→</span>}
                </div>
              ))}
            </div>
            <button
              onClick={() => setFocusMode(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: focusMode ? "rgba(59,130,246,0.12)" : "var(--bg-elevated)",
                border: `1px solid ${focusMode ? "rgba(59,130,246,0.3)" : "var(--border-default)"}`,
                color: focusMode ? "var(--blue)" : "var(--text-secondary)",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="1.5" y="1.5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="3.5" y="3.5" width="4" height="4" rx="0.5" fill="currentColor" />
              </svg>
              {focusMode ? "Exit Focus" : "Focus Mode"}
            </button>
          </div>
        </div>

        {/* ── Right: Analysis sidebar ──────────────────────────────────────── */}
        {!focusMode && (
          <div className="flex flex-col overflow-y-auto shrink-0"
            style={{ width: 300, background: "var(--bg-panel)" }}>

            {(status === "processing" || status === "analyzing") && (
              <RightPanelSpinner label={
                status === "processing" ? "Transcribing with Deepgram…" : "Analyzing with Claude…"
              } />
            )}

            {(status === "idle" || status === "recording") && (
              <div className="flex flex-col gap-5 p-5">
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
                          <span className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Compact history */}
                {history.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono tracking-widest uppercase"
                        style={{ color: "var(--text-muted)" }}>
                        History
                      </span>
                      <Sparkline data={sparklineData} />
                    </div>
                    <div className="flex flex-col">
                      {[...history].reverse().slice(0, 3).map((entry, i, arr) => (
                        <HistoryItem key={entry.id} entry={entry} isLatest={i === 0} isLast={i === arr.length - 1} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-4 p-5">
                <SectionLabel>Error</SectionLabel>
                <div className="rounded-xl px-4 py-4"
                  style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)" }}>
                  <span className="text-sm" style={{ color: "var(--red)" }}>
                    {error || "Something went wrong."}
                  </span>
                </div>
                {transcript && (
                  <div>
                    <SectionLabel>Raw Transcript</SectionLabel>
                    <div className="mt-3 rounded-xl px-4 py-4"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                      <p className="text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
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

                <InsightsCard
                  analysis={analysis!}
                  transcript={transcript}
                  elapsed={elapsed}
                  weakPhraseCards={weakPhraseCards}
                />

                {/* Compact history */}
                {history.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono tracking-widest uppercase"
                        style={{ color: "var(--text-muted)" }}>
                        History
                      </span>
                      <Sparkline data={sparklineData} />
                    </div>
                    <div className="flex flex-col">
                      {[...history].reverse().slice(0, 3).map((entry, i, arr) => (
                        <HistoryItem key={entry.id} entry={entry} isLatest={i === 0} isLast={i === arr.length - 1} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
