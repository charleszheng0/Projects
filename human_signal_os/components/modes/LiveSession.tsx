"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import FaceMeshCamera from "@/components/FaceMeshCamera";
import type { FaceLandmark, PoseLandmark, OverlayMode } from "@/components/FaceMeshCamera";
import {
  computeVisionScores,
  loadVisionBaseline,
  saveVisionBaseline,
  clearVisionBaseline,
  buildBaseline,
  extractCalibFrame,
  type VisionBaseline,
  type VisionBreakdown,
  type Pt,
} from "@/lib/visionScoring";
import {
  crossValidate,
  visionComposite,
  type CrossValidationResult,
} from "@/lib/crossValidation";
import { RollingBuffer } from "@/lib/rollingAverage";
import { analyzeAudioChunkHume, type HumeEmotionResult } from "@/lib/humeApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT          = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const ACCENT        = "#FF4D4D";
const PYTHON_URL    = "http://localhost:8000";
const CHUNK_MS      = 3000;
const CALIB_MS      = 3500;
const CALIB_NEEDED  = 30;
const GRAPH_MAX_PTS = 60;

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

interface GraphPoint { t: number; v: number }

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({
  score, label, hasData, size = 110, accent = ACCENT,
}: { score: number; label: string; hasData: boolean; size?: number; accent?: string }) {
  const r    = size * 0.42;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(score / 100, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          {hasData && (
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={accent} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${fill} ${circ - fill}`}
              style={{ transition: "stroke-dasharray 0.45s ease", filter: `drop-shadow(0 0 8px ${accent}80)` }} />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{
            fontFamily: FONT, fontSize: size * 0.28, fontWeight: 900,
            lineHeight: 1, letterSpacing: "-1.5px",
            color: hasData ? "#FFFFFF" : "#232323",
            fontVariantNumeric: "tabular-nums",
          }}>
            {hasData ? Math.round(score) : "—"}
          </span>
        </div>
      </div>
      <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 400,
        color: "#999999", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function MetricBar({ label, score, hasData }: { label: string; score: number; hasData: boolean }) {
  const pct  = Math.round(score * 100);
  const good = pct >= 55;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 300,
        color: "#999999", minWidth: 100, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 2, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: hasData ? `${pct}%` : "0%", borderRadius: 100,
          background: good ? "rgba(255,255,255,0.38)" : ACCENT,
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 700,
        color: hasData ? (good ? "#FFFFFF" : ACCENT) : "#2A2A2A",
        minWidth: 22, textAlign: "right", flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}>
        {hasData ? pct : "—"}
      </span>
    </div>
  );
}

const EMOTION_COLORS: Record<HumeEmotionResult["label"], string> = {
  Calm:       "#10B981",
  Tense:      "#F59E0B",
  Energized:  "#3B82F6",
  Distracted: "#8B5CF6",
};

function EmotionTag({ emotion }: { emotion: HumeEmotionResult | null }) {
  if (!emotion) return null;
  const color = EMOTION_COLORS[emotion.label];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%",
        background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0, display: "inline-block" }} />
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600,
        color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {emotion.label}
      </span>
    </div>
  );
}

function InsightCard({ insight }: { insight: CrossValidationResult }) {
  const isCalib = insight.insight === "Calibrating";
  return (
    <div style={{ borderRadius: 10, padding: "12px 14px",
      background: `${insight.color}12`, border: `1px solid ${insight.color}28` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: isCalib ? "#444" : insight.color,
          flexShrink: 0, display: "inline-block",
          boxShadow: isCalib ? "none" : `0 0 5px ${insight.color}`,
        }} />
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700,
          color: isCalib ? "#888" : insight.color,
          letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {insight.headline}
        </span>
      </div>
      <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 300,
        color: "#AAAAAA", lineHeight: 1.5, margin: 0 }}>
        {insight.description}
      </p>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function LiveSession() {
  // Vision state
  const [confidence,   setConfidence]   = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [breakdown,    setBreakdown]    = useState<VisionBreakdown | null>(null);
  const [hasVision,    setHasVision]    = useState(false);
  const [overlayMode,  setOverlay]      = useState<OverlayMode>("contour");
  const [calibState,   setCalibState]   = useState<"calibrating" | "done">("calibrating");
  const [calibProg,    setCalibProg]    = useState(0);
  const [toast,        setToast]        = useState<string | null>(null);

  // Speech state
  const [serverOnline,    setServerOnline]    = useState<boolean | null>(null);
  const [recording,      setRecording]       = useState(false);
  const [speechScores,   setSpeechScores]    = useState<SpeechScores | null>(null);
  const [transcript,     setTranscript]      = useState("");
  const [speechCycles,   setSpeechCycles]    = useState(0);
  const [isAnalyzing,    setIsAnalyzing]     = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Hume + graph state
  const [emotion,       setEmotion]      = useState<HumeEmotionResult | null>(null);
  const [graphData,     setGraphData]    = useState<GraphPoint[]>([]);

  // Vision refs
  const baselineRef      = useRef<VisionBaseline | null>(null);
  const calibStateRef    = useRef<"calibrating" | "done">("calibrating");
  const calibStartRef    = useRef<number | null>(null);
  const calibFramesRef   = useRef<Partial<VisionBaseline>[]>([]);
  const noseTipYsRef     = useRef<number[]>([]);
  const irisDevsRef      = useRef<number[]>([]);
  const hist3sRef        = useRef<Pt[][]>([]);
  const hist5sRef        = useRef<Pt[][]>([]);
  const confRollRef      = useRef(new RollingBuffer(3));
  const friendRollRef    = useRef(new RollingBuffer(3));
  const confValueRef     = useRef(0);

  // Speech refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const chunkIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const humeIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const graphIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const compRollRef       = useRef(new RollingBuffer(3));
  const speechCyclesRef   = useRef(0);
  const humeBufferRef     = useRef<Blob[]>([]);
  const graphPtRef        = useRef(0);

  // ── Load saved baseline ──────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadVisionBaseline();
    if (saved) {
      baselineRef.current   = saved;
      calibStateRef.current = "done";
      setCalibState("done");
      showToast("Using saved calibration");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  // ── Cross-validation (derived from latest scores) ────────────────────────
  const speechComposite = speechScores ? speechScores.composite : 0;
  const vComp = visionComposite(confidence, friendliness);
  const insight: CrossValidationResult = crossValidate(vComp, speechComposite, speechCycles);

  // ── Server health check ──────────────────────────────────────────────────
  const checkServer = useCallback(async () => {
    try {
      const r = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(2000) });
      setServerOnline(r.ok);
    } catch { setServerOnline(false); }
  }, []);

  useEffect(() => {
    checkServer();
    const id = setInterval(checkServer, 8000);
    return () => clearInterval(id);
  }, [checkServer]);

  // ── Rolling line graph — push confidence every 1s ────────────────────────
  useEffect(() => {
    graphIntervalRef.current = setInterval(() => {
      const val = confValueRef.current;
      setGraphData(prev => {
        const next = [...prev, { t: graphPtRef.current++, v: val }];
        return next.length > GRAPH_MAX_PTS ? next.slice(-GRAPH_MAX_PTS) : next;
      });
    }, 1000);
    return () => { if (graphIntervalRef.current) clearInterval(graphIntervalRef.current); };
  }, []);

  // ── Vision landmarks handler ─────────────────────────────────────────────
  const handleFaceLandmarks = useCallback((landmarks: FaceLandmark[]) => {
    const face = landmarks as Pt[];
    hist3sRef.current.push(face);
    hist5sRef.current.push(face);
    if (hist3sRef.current.length > 90) hist3sRef.current.shift();
    if (hist5sRef.current.length > 150) hist5sRef.current.shift();

    // Calibration
    if (calibStateRef.current === "calibrating") {
      calibFramesRef.current.push(extractCalibFrame(face));
      if (calibFramesRef.current.length > 60) calibFramesRef.current.shift();
      const noseTip = face[4];
      if (noseTip) { noseTipYsRef.current.push(noseTip.y); if (noseTipYsRef.current.length > 90) noseTipYsRef.current.shift(); }
      const lIris = face[468], rIris = face[473], lOut = face[33], lIn = face[133], rOut = face[263], rIn = face[362];
      if (lIris && rIris && lOut && lIn && rOut && rIn) {
        const lW = Math.abs(lOut.x - lIn.x) || 0.01, rW = Math.abs(rOut.x - rIn.x) || 0.01;
        const lDx = (lIris.x - Math.min(lOut.x, lIn.x)) / lW - 0.5;
        const rDx = (rIris.x - Math.min(rOut.x, rIn.x)) / rW - 0.5;
        irisDevsRef.current.push((Math.abs(lDx) + Math.abs(rDx)) / 2);
        if (irisDevsRef.current.length > 90) irisDevsRef.current.shift();
      }
      if (calibFramesRef.current.length >= CALIB_NEEDED) {
        const nys = noseTipYsRef.current;
        const nMean = nys.reduce((a, b) => a + b, 0) / (nys.length || 1);
        const nVar  = nys.reduce((a, b) => a + (b - nMean) ** 2, 0) / (nys.length || 1);
        if (nVar < 2.5e-5) {
          if (!calibStartRef.current) calibStartRef.current = Date.now();
          const elapsed = Date.now() - calibStartRef.current;
          setCalibProg(Math.min(elapsed / CALIB_MS, 1));
          if (elapsed >= CALIB_MS) {
            const irisAvg = irisDevsRef.current.reduce((a, b) => a + b, 0) / (irisDevsRef.current.length || 1);
            const bl = buildBaseline(calibFramesRef.current, nVar, irisAvg);
            baselineRef.current = bl; calibStateRef.current = "done";
            setCalibState("done"); saveVisionBaseline(bl); setCalibProg(1);
            showToast("Calibrated");
          }
        } else { calibStartRef.current = null; setCalibProg(0); }
      }
    }

    const scores = computeVisionScores(face, hist3sRef.current, hist5sRef.current, baselineRef.current);
    confRollRef.current.push(scores.confidence);
    friendRollRef.current.push(scores.friendliness);
    const sConf = confRollRef.current.average();
    const sFriend = friendRollRef.current.average();
    confValueRef.current = sConf;
    setConfidence(sConf);
    setFriendliness(sFriend);
    setBreakdown(scores.breakdown);
    setHasVision(true);
  }, []);

  const handlePoseLandmarks = useCallback((_: PoseLandmark[]) => {}, []);

  // ── Audio chunk → Python ────────────────────────────────────────────────
  const sendChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    setIsAnalyzing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "chunk.webm");
      const res = await fetch(`${PYTHON_URL}/analyze`, {
        method: "POST", body: form, signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SpeechScores = await res.json();
      compRollRef.current.push(data.composite);
      const rolling = Math.round(compRollRef.current.average());
      setSpeechScores({ ...data, composite: rolling });
      if (data.transcript) setTranscript(data.transcript);
      speechCyclesRef.current++;
      setSpeechCycles(speechCyclesRef.current);
    } catch (err) {
      console.warn("[LiveSession] analyze error:", err);
    } finally { setIsAnalyzing(false); }
  }, []);

  // ── Hume AI — send 2-second audio chunks ────────────────────────────────
  const sendHumeChunk = useCallback(async () => {
    const chunks = humeBufferRef.current.splice(0);
    if (chunks.length === 0) return;
    const blob = new Blob(chunks, { type: "audio/webm" });
    const result = await analyzeAudioChunkHume(blob);
    setEmotion(result);
  }, []);

  // ── Start/stop recording ─────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const actx   = new AudioContext();
      const source = actx.createMediaStreamSource(stream);
      const anlsr  = actx.createAnalyser();
      anlsr.fftSize = 2048;
      source.connect(anlsr);
      audioCtxRef.current = actx;
      analyserRef.current = anlsr;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      const speechChunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          speechChunks.push(e.data);
          humeBufferRef.current.push(e.data);
        }
      };

      // 3-second chunks → Python Whisper
      chunkIntervalRef.current = setInterval(() => {
        if (mr.state === "recording") {
          mr.requestData();
          setTimeout(() => {
            if (speechChunks.length > 0) {
              const blob = new Blob(speechChunks.splice(0), { type: mimeType });
              sendChunk(blob);
            }
          }, 80);
        }
      }, CHUNK_MS);

      // 2-second cadence → Hume AI
      humeIntervalRef.current = setInterval(sendHumeChunk, 2000);

      mr.start();
      setRecording(true);
    } catch (err) { console.error("[LiveSession] getUserMedia:", err); }
  }, [recording, sendChunk, sendHumeChunk]);

  const stopRecording = useCallback(() => {
    if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
    if (humeIntervalRef.current)  clearInterval(humeIntervalRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    if (serverOnline === true && !recording) startRecording();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverOnline]);

  useEffect(() => () => { stopRecording(); }, [stopRecording]);

  function resetCalibration() {
    clearVisionBaseline();
    baselineRef.current = null; calibStateRef.current = "calibrating";
    calibStartRef.current = null; calibFramesRef.current = [];
    noseTipYsRef.current = []; irisDevsRef.current = [];
    hist3sRef.current = []; hist5sRef.current = [];
    confRollRef.current.clear(); friendRollRef.current.clear();
    setCalibState("calibrating"); setCalibProg(0);
    setHasVision(false); setConfidence(0); setFriendliness(0); setBreakdown(null);
  }

  const METRIC_LABELS: Array<[keyof VisionBreakdown, string]> = [
    ["gaze",           "Gaze"],
    ["microExpr",      "Expression"],
    ["browTension",    "Brow"],
    ["lipCompression", "Lip"],
    ["fidget",         "Stillness"],
    ["headPosition",   "Head"],
    ["duchenneSmile",  "Smile"],
  ];

  const SPEECH_LABELS: Array<{ key: keyof SpeechScores; label: string; invert?: boolean }> = [
    { key: "pitch_variance",  label: "Pitch" },
    { key: "volume_trailing", label: "Volume" },
    { key: "filler_density",  label: "Fillers" },
    { key: "speech_rate",     label: "Rate" },
    { key: "pause_quality",   label: "Pauses" },
    { key: "upspeak",         label: "Upspeak" },
    { key: "vocal_fry",       label: "Vocal Fry" },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#000" }}>

      {/* ── Video panel ───────────────────────────────────────────────────── */}
      <div style={{ flex: "0 0 70%", position: "relative", overflow: "hidden" }}>
        <FaceMeshCamera
          confidenceScore={confidence}
          overlayMode={overlayMode}
          onFaceLandmarks={handleFaceLandmarks}
          onPoseLandmarks={handlePoseLandmarks}
        />

        {/* Overlay toggle */}
        <div style={{
          position: "absolute", top: 14, right: 16, zIndex: 20,
          display: "flex", gap: 2,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
          borderRadius: 10, padding: "4px",
        }}>
          {(["contour", "dots", "skeleton", "none"] as OverlayMode[]).map(om => {
            const labels: Record<OverlayMode, string> = { contour: "Contour", dots: "Dots", skeleton: "Pose", ghost: "Ghost", none: "Off" };
            const active = overlayMode === om;
            return (
              <button key={om} onClick={() => setOverlay(om)} style={{
                fontFamily: FONT, fontSize: 10, letterSpacing: "0.06em",
                textTransform: "uppercase", fontWeight: active ? 600 : 400,
                color: active ? "#FFFFFF" : "#666666",
                background: active ? "rgba(255,255,255,0.10)" : "transparent",
                border: "none", borderRadius: 7, padding: "4px 10px",
                cursor: "pointer",
              }}>
                {labels[om]}
              </button>
            );
          })}
        </div>

        {/* Calibration overlay */}
        {calibState === "calibrating" && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
            padding: "60px 28px 28px",
            background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.40) 55%, transparent 100%)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 7px ${ACCENT}`, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: "#FFFFFF" }}>Sit naturally — look at the camera</span>
              </div>
              <div style={{ height: 2, borderRadius: 100, background: "rgba(255,255,255,0.08)", marginLeft: 14 }}>
                <div style={{
                  height: "100%", borderRadius: 100, width: `${calibProg * 100}%`,
                  background: ACCENT, transition: calibProg > 0 ? "width 0.25s linear" : "none",
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: "absolute", top: 16, left: "50%", zIndex: 30,
            transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 20px", borderRadius: 100, whiteSpace: "nowrap",
            background: "rgba(16,16,16,0.9)", backdropFilter: "blur(14px)",
            animation: "hsosToastFade 2.4s ease forwards",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: 10, color: "#AAAAAA", letterSpacing: "0.09em", textTransform: "uppercase" }}>{toast}</span>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 22px",
          background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
          pointerEvents: "none",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 6px rgba(255,77,77,0.8)`, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888", letterSpacing: "0.1em", textTransform: "uppercase" }}>Live Session</span>
          <div style={{ flex: 1 }} />
          {recording && (
            <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888", letterSpacing: "0.06em" }}>
              {isAnalyzing ? "Analyzing…" : "Recording"}
            </span>
          )}
        </div>

        {/* Recalibrate */}
        {calibState === "done" && (
          <div style={{ position: "absolute", bottom: 52, left: 22, zIndex: 25 }}>
            <button onClick={resetCalibration} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: FONT, fontSize: 13, fontWeight: 500, letterSpacing: "0.03em",
              color: "#BBBBBB", background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.14)", borderRadius: 100,
              padding: "10px 22px", cursor: "pointer",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#555", flexShrink: 0, display: "inline-block" }} />
              Recalibrate
            </button>
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, width: "30%", padding: "12px 14px 12px 0", display: "flex" }}>
        <div style={{
          flex: 1, borderRadius: 20, background: "#141414",
          display: "flex", flexDirection: "column",
          padding: "16px 16px 14px",
          overflow: "hidden",
          gap: 14,
        }}>

          {/* Score rings + emotion tag */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
              <ScoreRing score={confidence}   label="Confidence"   hasData={hasVision} size={100} accent={ACCENT} />
              <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.05)" }} />
              <ScoreRing score={friendliness} label="Friendliness" hasData={hasVision} size={100} accent="#3B82F6" />
            </div>
            <EmotionTag emotion={emotion} />
          </div>

          {/* 60-second confidence graph */}
          <div style={{
            borderRadius: 10, background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.05)",
            padding: "8px 4px 4px",
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: FONT, fontSize: 9, color: "#666666",
              letterSpacing: "0.08em", textTransform: "uppercase", paddingLeft: 8, display: "block", marginBottom: 4 }}>
              60s Confidence
            </span>
            <ResponsiveContainer width="100%" height={44}>
              <LineChart data={graphData}>
                <YAxis domain={[0, 100]} hide />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#3B82F6"
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Vision metric bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500,
              color: "#777777", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Vision
            </span>
            {METRIC_LABELS.map(([key, label]) => (
              <MetricBar key={key} label={label}
                score={breakdown ? breakdown[key] : 0} hasData={hasVision} />
            ))}
          </div>

          {/* Speech metric bars */}
          {speechScores && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500,
                color: "#777777", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Speech
              </span>
              {SPEECH_LABELS.map(({ key, label }) => (
                <MetricBar key={key} label={label}
                  score={(speechScores[key] as number) / 100}
                  hasData={speechCycles > 0} />
              ))}
            </div>
          )}

          {/* Server status / mic control */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: serverOnline === null ? "#444" : serverOnline ? "#10B981" : "#F43F5E",
              boxShadow: serverOnline ? "0 0 5px rgba(16,185,129,0.7)" : "none",
            }} />
            <span style={{ fontFamily: FONT, fontSize: 9, color: "#777777",
              letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {serverOnline === null ? "Checking…"
                : serverOnline ? (recording ? "Recording" : "Ready")
                : "Python server offline"}
            </span>
            {serverOnline && !recording && (
              <button onClick={startRecording} style={{
                marginLeft: "auto", fontFamily: FONT, fontSize: 9, fontWeight: 600,
                color: "#3B82F6", background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6,
                padding: "3px 8px", cursor: "pointer",
              }}>
                Start Mic
              </button>
            )}
            {recording && (
              <button onClick={stopRecording} style={{
                marginLeft: "auto", fontFamily: FONT, fontSize: 9, fontWeight: 600,
                color: "#F43F5E", background: "rgba(244,63,94,0.12)",
                border: "1px solid rgba(244,63,94,0.25)", borderRadius: 6,
                padding: "3px 8px", cursor: "pointer",
              }}>
                Stop
              </button>
            )}
          </div>

          {/* Live transcript */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500,
              color: "#777777", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>
              Transcript
            </span>
            <div style={{ flex: 1, overflow: "auto" }}>
              {transcript ? (
                <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 300,
                  color: speechScores && speechScores.composite >= 55 ? "#AAAAAA" : "#FF6B6B",
                  lineHeight: 1.55, margin: 0 }}>
                  {transcript}
                </p>
              ) : (
                <p style={{ fontFamily: FONT, fontSize: 10, color: "#666666", fontStyle: "italic", margin: 0 }}>
                  {serverOnline === false
                    ? "Start python server: cd python && python server.py"
                    : recording ? "Speak — updates every 3 s…"
                    : "Waiting for mic…"}
                </p>
              )}
            </div>
          </div>

          {/* Cross-validation insight */}
          <InsightCard insight={insight} />

        </div>
      </div>
    </div>
  );
}
