"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import FaceMeshCamera from "./FaceMeshCamera";
import type { FaceLandmark, PoseLandmark } from "./FaceMeshCamera";

// ── Landmark index map (MediaPipe FaceMesh 468-point mesh) ───────────────────
const F = {
  NOSE_TIP:         4,
  NOSE_BRIDGE:      6,
  FOREHEAD_TOP:     10,
  CHIN:             152,
  // Left eye (viewer's right)
  L_EYE_OUTER:     33,
  L_EYE_INNER:     133,
  L_EYE_TOP:       159,
  L_EYE_BOT:       145,
  // Right eye (viewer's left)
  R_EYE_OUTER:     263,
  R_EYE_INNER:     362,
  R_EYE_TOP:       386,
  R_EYE_BOT:       374,
  // Brows
  L_BROW_INNER:    105,
  L_BROW_OUTER:    46,
  R_BROW_INNER:    334,
  R_BROW_OUTER:    276,
  // Mouth
  MOUTH_L:         61,
  MOUTH_R:         291,
  MOUTH_TOP:       13,
  MOUTH_BOT:       14,
  // Cheeks (for face-width reference)
  L_CHEEK:         234,
  R_CHEEK:         454,
} as const;

const HISTORY_FRAMES = 30;

// ── Math utils ───────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}
function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}
function norm(v: number, lo: number, hi: number): number {
  return clamp((v - lo) / (hi - lo));
}

// ── Calibration types + localStorage helpers ──────────────────────────────────

interface PersonalBaseline {
  neutralNoseTipVariance: number;
  neutralShoulderYDiff: number;
  neutralMouthCornerDelta: number; // smileLift at neutral face
  neutralBrowGap: number;
  neutralEyeRatio: number;
  neutralLandmarkVariance: number;
  neutralShoulderSpan: number;
  neutralChinRatio: number;
}

interface CalibFrame {
  noseTipY: number;
  smileLift: number;
  landmarkVar: number;
  shoulderYDiff: number; // NaN if pose not available
  browGap: number;
  eyeRatio: number;
  chinRatio: number;
  shoulderSpan: number; // NaN if pose not available
}

const LS_KEY = "hsos_baseline";

function loadBaseline(): PersonalBaseline | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "null"); } catch { return null; }
}
function saveBaseline(b: PersonalBaseline) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch {}
}
function clearBaseline() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ── Scoring types ─────────────────────────────────────────────────────────────

export interface Signal {
  label: string;
  score: number;   // 0–1
  passing: boolean;
}

interface ScoreResult {
  total: number;   // 0–1
  signals: Signal[];
}

// ── Per-mode scoring functions ────────────────────────────────────────────────

/**
 * CONFIDENT
 * Measures: shoulder symmetry (pose), head jitter (face history), chin position.
 * Chin scoring FIXED: lower ratio (chin up) = higher score.
 */
function scoreConfident(
  face: FaceLandmark[],
  history: FaceLandmark[][],
  pose?: PoseLandmark[],
  baseline?: PersonalBaseline | null,
): ScoreResult {
  const signals: Signal[] = [];

  // Head Stability — variance of nose-tip Y over last 10 frames
  const slice10 = history.slice(-10);
  const noseTipYs = slice10.map(f => f[F.NOSE_TIP]?.y ?? 0);
  const jitter = variance(noseTipYs);
  const stabilityScore = baseline
    ? norm(jitter, Math.max(baseline.neutralNoseTipVariance, 5e-8) * 6, 0)
    : norm(jitter, 4e-5, 4e-7);
  signals.push({ label: "Head Stability", score: stabilityScore, passing: stabilityScore > 0.6 });

  // Shoulder Level — |left.y − right.y| from pose (absolute — symmetry is universal)
  let shoulderScore = 0.5;
  if (pose?.[11] && pose?.[12]) {
    const yDiff = Math.abs(pose[11].y - pose[12].y);
    shoulderScore = norm(yDiff, 0.06, 0.015);
  }
  signals.push({ label: "Shoulder Level", score: shoulderScore, passing: shoulderScore > 0.6 });

  // Chin Position — FIXED: lower ratio = chin raised = higher confidence score
  const eyeCY = mean([face[F.L_EYE_TOP]?.y ?? 0.38, face[F.R_EYE_TOP]?.y ?? 0.38]);
  const nosY  = face[F.NOSE_TIP]?.y ?? 0.55;
  const chinY = face[F.CHIN]?.y ?? 0.75;
  const fhd   = face[F.FOREHEAD_TOP]?.y ?? 0.20;
  const faceH = chinY - fhd;
  const ratio = faceH > 0.01 ? (nosY - eyeCY) / faceH : 0.35;
  // With baseline: reward chin above personal neutral
  // Without baseline: inverted norm — lower ratio (chin up) → higher score
  const chinScore = baseline
    ? norm(baseline.neutralChinRatio - ratio, -0.12, 0.10)
    : norm(ratio, 0.55, 0.20);
  signals.push({ label: "Chin Position", score: chinScore, passing: chinScore > 0.6 });

  return { total: mean(signals.map(s => s.score)), signals };
}

/**
 * FRIENDLY
 * Measures: smile lift (mouth corners), brow raise, slight head tilt.
 */
function scoreFriendly(
  face: FaceLandmark[],
  baseline?: PersonalBaseline | null,
): ScoreResult {
  const signals: Signal[] = [];

  // Smile — mouth corners Y vs mouth centre Y
  const cornerY   = mean([face[F.MOUTH_L]?.y ?? 0.65, face[F.MOUTH_R]?.y ?? 0.65]);
  const centreY   = mean([face[F.MOUTH_TOP]?.y ?? 0.63, face[F.MOUTH_BOT]?.y ?? 0.67]);
  const smileLift = centreY - cornerY; // positive = corners above centre = smile
  const smileScore = baseline
    ? norm(smileLift - baseline.neutralMouthCornerDelta, -0.005, 0.020)
    : norm(smileLift, -0.005, 0.025);
  signals.push({ label: "Smile", score: smileScore, passing: smileScore > 0.5 });

  // Eyebrow Raise — gap between inner brow and eye top
  const lBrowGap = (face[F.L_EYE_TOP]?.y ?? 0.38) - (face[F.L_BROW_INNER]?.y ?? 0.33);
  const rBrowGap = (face[F.R_EYE_TOP]?.y ?? 0.38) - (face[F.R_BROW_INNER]?.y ?? 0.33);
  const avgGap   = mean([lBrowGap, rBrowGap]);
  const browScore = baseline
    ? norm(avgGap - baseline.neutralBrowGap, -0.008, 0.022)
    : norm(avgGap, 0.018, 0.050);
  signals.push({ label: "Open Brows", score: browScore, passing: browScore > 0.45 });

  // Head Tilt — asymmetry in eye heights (slight tilt = warmer), kept absolute
  const eyeAsym = Math.abs((face[F.L_EYE_TOP]?.y ?? 0) - (face[F.R_EYE_TOP]?.y ?? 0));
  const tiltScore =
    eyeAsym >= 0.005 && eyeAsym <= 0.035 ? 1 :
    eyeAsym < 0.005  ? norm(eyeAsym, 0, 0.005) :
                       norm(eyeAsym, 0.055, 0.035);
  signals.push({ label: "Head Tilt", score: tiltScore, passing: tiltScore > 0.45 });

  return { total: mean(signals.map(s => s.score)), signals };
}

/**
 * CHARISMATIC
 * Measures: overall expressiveness (landmark variance), nodding (Y oscillation),
 * eye openness.
 */
function scoreCharismatic(
  face: FaceLandmark[],
  history: FaceLandmark[][],
  baseline?: PersonalBaseline | null,
): ScoreResult {
  const signals: Signal[] = [];

  // Expressiveness — total XY variance across key landmarks over last 30 frames
  const KEY_LM = [F.NOSE_TIP, F.MOUTH_L, F.MOUTH_R, F.L_EYE_OUTER, F.R_EYE_OUTER, F.L_BROW_INNER, F.R_BROW_INNER];
  let totalVar = 0;
  if (history.length >= 3) {
    for (const idx of KEY_LM) {
      const xs = history.map(f => f[idx]?.x ?? 0);
      const ys = history.map(f => f[idx]?.y ?? 0);
      totalVar += variance(xs) + variance(ys);
    }
    totalVar /= KEY_LM.length * 2;
  }
  const expressScore = baseline && baseline.neutralLandmarkVariance > 0
    ? norm(totalVar / baseline.neutralLandmarkVariance, 0.3, 3.5)
    : norm(totalVar, 1e-6, 8e-5);
  signals.push({ label: "Expressiveness", score: expressScore, passing: expressScore > 0.35 });

  // Nodding — standard deviation of nose-tip Y (kept absolute)
  const noseTipYsH = history.map(f => f[F.NOSE_TIP]?.y ?? 0);
  const yStd = Math.sqrt(variance(noseTipYsH));
  const noddingScore = norm(yStd, 0.003, 0.018);
  signals.push({ label: "Head Movement", score: noddingScore, passing: noddingScore > 0.3 });

  // Eye Openness — height/width ratio per eye
  const lH = Math.abs((face[F.L_EYE_TOP]?.y ?? 0) - (face[F.L_EYE_BOT]?.y ?? 0));
  const lW = Math.abs((face[F.L_EYE_OUTER]?.x ?? 0) - (face[F.L_EYE_INNER]?.x ?? 0));
  const rH = Math.abs((face[F.R_EYE_TOP]?.y ?? 0) - (face[F.R_EYE_BOT]?.y ?? 0));
  const rW = Math.abs((face[F.R_EYE_OUTER]?.x ?? 0) - (face[F.R_EYE_INNER]?.x ?? 0));
  const openness = lW > 0.01 && rW > 0.01 ? mean([lH / lW, rH / rW]) : 0.25;
  const eyeScore = baseline
    ? norm(openness - baseline.neutralEyeRatio, -0.03, 0.06)
    : norm(openness, 0.12, 0.34);
  signals.push({ label: "Eye Openness", score: eyeScore, passing: eyeScore > 0.5 });

  return { total: mean(signals.map(s => s.score)), signals };
}

/**
 * OPEN
 * Measures: shoulder width (pose), both shoulders visible, chin up.
 * Chin scoring FIXED: lower ratio (chin raised) = higher score.
 */
function scoreOpen(
  face: FaceLandmark[],
  _history: FaceLandmark[][],
  pose?: PoseLandmark[],
  baseline?: PersonalBaseline | null,
): ScoreResult {
  const signals: Signal[] = [];

  // Shoulder Width — wider = more open/expansive
  let widthScore = 0.5;
  if (pose?.[11] && pose?.[12]) {
    const xSpan = Math.abs(pose[11].x - pose[12].x);
    widthScore = baseline
      ? norm(xSpan - baseline.neutralShoulderSpan, -0.06, 0.09)
      : norm(xSpan, 0.12, 0.28);
  }
  signals.push({ label: "Shoulder Width", score: widthScore, passing: widthScore > 0.55 });

  // Facing Forward — both shoulder landmarks visible to the camera (absolute)
  let facingScore = 0.5;
  if (pose?.[11] && pose?.[12]) {
    facingScore = mean([pose[11].visibility ?? 0.5, pose[12].visibility ?? 0.5]);
  }
  signals.push({ label: "Facing Forward", score: facingScore, passing: facingScore > 0.65 });

  // Chin Up — FIXED: lower ratio (chin raised) = higher score
  const eyeCY  = mean([face[F.L_EYE_TOP]?.y ?? 0.38, face[F.R_EYE_TOP]?.y ?? 0.38]);
  const nosY   = face[F.NOSE_TIP]?.y ?? 0.55;
  const chinY  = face[F.CHIN]?.y ?? 0.75;
  const fhd    = face[F.FOREHEAD_TOP]?.y ?? 0.20;
  const faceH  = chinY - fhd;
  const ratio  = faceH > 0.01 ? (nosY - eyeCY) / faceH : 0.35;
  const chinScore = baseline
    ? norm(baseline.neutralChinRatio - ratio, -0.10, 0.10)
    : norm(ratio, 0.55, 0.20); // inverted: lower ratio = chin up = higher score
  signals.push({ label: "Chin Up", score: chinScore, passing: chinScore > 0.55 });

  return { total: mean(signals.map(s => s.score)), signals };
}

// ── Mode config ───────────────────────────────────────────────────────────────

type Mode = "confident" | "friendly" | "charismatic" | "open";

interface ModeConfig {
  id: Mode;
  label: string;
  color: string;
  description: string;
  tooltip: string;
}

const ACCENT = "#FF4757";

const MODES: ModeConfig[] = [
  { id: "confident",   label: "Confident",   color: ACCENT, description: "Posture · stability",   tooltip: "Head stability, shoulder level, chin position" },
  { id: "friendly",    label: "Friendly",    color: ACCENT, description: "Smile · eye contact",   tooltip: "Smile lift, eyebrow raise, head tilt" },
  { id: "charismatic", label: "Charismatic", color: ACCENT, description: "Expression range",      tooltip: "Expressiveness variance, head nods, eye openness" },
  { id: "open",        label: "Open",        color: ACCENT, description: "Body position",         tooltip: "Shoulder width, facing forward, chin angle" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ModeTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="pointer-events-none absolute z-50 left-1/2 bottom-full mb-2 -translate-x-1/2 opacity-0 group-hover/tip:opacity-100"
        style={{ transition: "opacity 0.15s ease", whiteSpace: "nowrap" }}
      >
        <div
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono tracking-wide"
          style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#888888" }}
        >
          {text}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
          style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #2A2A2A" }} />
      </div>
    </div>
  );
}

function CornerBrackets() {
  const corners: React.CSSProperties[] = [
    { top: 14, left: 14, transform: "rotate(0deg)" },
    { top: 14, right: 14, transform: "rotate(90deg)" },
    { bottom: 14, right: 14, transform: "rotate(180deg)" },
    { bottom: 14, left: 14, transform: "rotate(270deg)" },
  ];
  return (
    <>
      {corners.map((s, i) => (
        <div key={i} className="absolute pointer-events-none z-10" style={s}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 6V2H6" stroke="#2A2A2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-mono tracking-widest uppercase shrink-0" style={{ color: "#888888" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "#1A1A1A" }} />
    </div>
  );
}

function ScoreRing({ score, hasData }: { score: number; hasData: boolean }) {
  const r    = 62;
  const circ = 2 * Math.PI * r;
  const pct  = Math.round(score * 100);
  const filled = circ * Math.min(score, 1);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle cx="80" cy="80" r={r} fill="none" stroke="#1A1A1A" strokeWidth="11" />
          {/* Fill */}
          {hasData && (
            <circle
              cx="80" cy="80" r={r}
              fill="none"
              stroke={ACCENT}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circ - filled}`}
              style={{
                transition: "stroke-dasharray 0.35s ease",
                filter: "drop-shadow(0 0 7px rgba(255,71,87,0.5))",
              }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="tabular-nums leading-none font-black"
            style={{ fontSize: 54, color: hasData ? "#FFFFFF" : "#2A2A2A", letterSpacing: "-3px" }}
          >
            {hasData ? pct : "—"}
          </span>
          <span
            className="font-mono tracking-widest uppercase"
            style={{ fontSize: 9, color: "#888888", marginTop: 4 }}
          >
            Score
          </span>
        </div>
      </div>
    </div>
  );
}

function SignalRow({ label, score, passing }: Signal) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-mono tracking-widest uppercase"
          style={{ color: "#888888" }}
        >
          {label}
        </span>
        <span
          className="text-xs font-mono font-bold tabular-nums"
          style={{ color: passing ? "#FFFFFF" : ACCENT }}
        >
          {pct}
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 3, background: "#1A1A1A" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: passing ? "#FFFFFF" : ACCENT,
            transition: "width 0.3s ease",
            boxShadow: passing ? "none" : `0 0 4px rgba(255,71,87,0.4)`,
          }}
        />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LiveTracker() {
  const [mode, setMode]       = useState<Mode>("confident");
  const [score, setScore]     = useState(0);
  const [signals, setSignals] = useState<Signal[]>([]);

  // Calibration state
  const [calibState, setCalibState]       = useState<"calibrating" | "done">("calibrating");
  const [baseline, setBaseline]           = useState<PersonalBaseline | null>(null);
  const [toast, setToast]                 = useState<string | null>(null);
  const [calibProgress, setCalibProgress] = useState(0); // 0–1 for the 3s fill bar

  // History buffers — refs avoid triggering renders on every frame
  const faceHistoryRef = useRef<FaceLandmark[][]>([]);
  const poseDataRef    = useRef<PoseLandmark[] | undefined>(undefined);
  const smoothRef      = useRef(0);
  const modeRef        = useRef(mode);

  // Calibration refs — keep state accessible inside callbacks without dep changes
  const baselineRef         = useRef<PersonalBaseline | null>(null);
  const calibStateRef       = useRef<"calibrating" | "done">("calibrating");
  const calibFramesRef      = useRef<CalibFrame[]>([]);
  const calibStableStartRef = useRef<number | null>(null);

  useEffect(() => { modeRef.current = mode; },             [mode]);
  useEffect(() => { calibStateRef.current = calibState; }, [calibState]);
  useEffect(() => { baselineRef.current   = baseline; },   [baseline]);

  // Load saved baseline on mount
  useEffect(() => {
    const saved = loadBaseline();
    if (saved) {
      setBaseline(saved);
      baselineRef.current   = saved;
      setCalibState("done");
      calibStateRef.current = "done";
      setToast("Using saved calibration");
      setTimeout(() => setToast(null), 2200);
    }
  }, []);

  // Called from FaceMeshCamera every frame a face is detected
  const handleFaceLandmarks = useCallback((landmarks: FaceLandmark[]) => {
    // ① Update rolling history buffer
    faceHistoryRef.current.push(landmarks);
    if (faceHistoryRef.current.length > HISTORY_FRAMES) {
      faceHistoryRef.current.shift();
    }

    // ② Calibration sampling — runs every frame until baseline is locked
    if (calibStateRef.current === "calibrating") {
      const f = landmarks;

      // Per-frame feature extraction
      const noseTipY  = f[F.NOSE_TIP]?.y ?? 0;
      const cornerY   = mean([f[F.MOUTH_L]?.y ?? 0.65, f[F.MOUTH_R]?.y ?? 0.65]);
      const centreY   = mean([f[F.MOUTH_TOP]?.y ?? 0.63, f[F.MOUTH_BOT]?.y ?? 0.67]);
      const smileLift = centreY - cornerY;
      const lBrowGap  = (f[F.L_EYE_TOP]?.y ?? 0.38) - (f[F.L_BROW_INNER]?.y ?? 0.33);
      const rBrowGap  = (f[F.R_EYE_TOP]?.y ?? 0.38) - (f[F.R_BROW_INNER]?.y ?? 0.33);
      const browGap   = mean([lBrowGap, rBrowGap]);
      const lH = Math.abs((f[F.L_EYE_TOP]?.y ?? 0) - (f[F.L_EYE_BOT]?.y ?? 0));
      const lW = Math.abs((f[F.L_EYE_OUTER]?.x ?? 0) - (f[F.L_EYE_INNER]?.x ?? 0));
      const rH = Math.abs((f[F.R_EYE_TOP]?.y ?? 0) - (f[F.R_EYE_BOT]?.y ?? 0));
      const rW = Math.abs((f[F.R_EYE_OUTER]?.x ?? 0) - (f[F.R_EYE_INNER]?.x ?? 0));
      const eyeRatio  = lW > 0.01 && rW > 0.01 ? mean([lH / lW, rH / rW]) : 0.25;
      const eyeCY     = mean([f[F.L_EYE_TOP]?.y ?? 0.38, f[F.R_EYE_TOP]?.y ?? 0.38]);
      const nosY      = f[F.NOSE_TIP]?.y ?? 0.55;
      const cY        = f[F.CHIN]?.y ?? 0.75;
      const fhd       = f[F.FOREHEAD_TOP]?.y ?? 0.20;
      const faceHgt   = cY - fhd;
      const chinRatio = faceHgt > 0.01 ? (nosY - eyeCY) / faceHgt : 0.35;
      const pose      = poseDataRef.current;
      const shoulderYDiff = (pose?.[11] && pose?.[12])
        ? Math.abs(pose[11].y - pose[12].y) : NaN;
      const shoulderSpan  = (pose?.[11] && pose?.[12])
        ? Math.abs(pose[11].x - pose[12].x) : NaN;

      // XY variance across key landmarks using current history
      const CALIB_LM = [F.NOSE_TIP, F.MOUTH_L, F.MOUTH_R, F.L_EYE_OUTER, F.R_EYE_OUTER, F.L_BROW_INNER, F.R_BROW_INNER];
      let landmarkVar = 0;
      const hist = faceHistoryRef.current;
      if (hist.length >= 3) {
        for (const idx of CALIB_LM) {
          landmarkVar += variance(hist.map(hf => hf[idx]?.x ?? 0));
          landmarkVar += variance(hist.map(hf => hf[idx]?.y ?? 0));
        }
        landmarkVar /= CALIB_LM.length * 2;
      }

      // Push frame snapshot to rolling calib buffer
      calibFramesRef.current.push({ noseTipY, smileLift, landmarkVar, shoulderYDiff, browGap, eyeRatio, chinRatio, shoulderSpan });
      if (calibFramesRef.current.length > HISTORY_FRAMES) calibFramesRef.current.shift();

      // Only evaluate stability once buffer is full (30 frames)
      if (calibFramesRef.current.length === HISTORY_FRAMES) {
        const cfs = calibFramesRef.current;

        const noseTipYVar    = variance(cfs.map(cf => cf.noseTipY));
        const avgSmileLift   = mean(cfs.map(cf => cf.smileLift));
        const avgLandmarkVar = mean(cfs.map(cf => cf.landmarkVar));
        const shoulderDiffs  = cfs.map(cf => cf.shoulderYDiff).filter(v => !isNaN(v));
        const shoulderYDiffVar = shoulderDiffs.length > 1 ? variance(shoulderDiffs) : 0;

        // Stability conditions
        const isHeadStill    = noseTipYVar < 2e-5;           // <~3px movement (normalized)
        const isNeutralSmile = Math.abs(avgSmileLift) < 0.007; // not smiling/frowning
        const isRelaxed      = avgLandmarkVar < 3e-5;        // overall low face movement
        const isShoulderOk   = shoulderDiffs.length < 5 || shoulderYDiffVar < 1e-4; // shoulders stable (or pose not loaded yet)

        const allStable = isHeadStill && isNeutralSmile && isRelaxed && isShoulderOk;

        if (allStable) {
          if (calibStableStartRef.current === null) calibStableStartRef.current = Date.now();
          const elapsed = Date.now() - calibStableStartRef.current;
          setCalibProgress(Math.min(elapsed / 3000, 1));

          if (elapsed >= 3000) {
            // ── Lock in baseline ──────────────────────────────────────────
            const spanVals = cfs.map(cf => cf.shoulderSpan).filter(v => !isNaN(v));
            const newBaseline: PersonalBaseline = {
              neutralNoseTipVariance:  Math.max(noseTipYVar, 5e-8),
              neutralShoulderYDiff:    shoulderDiffs.length ? mean(shoulderDiffs) : 0.02,
              neutralMouthCornerDelta: avgSmileLift,
              neutralBrowGap:          mean(cfs.map(cf => cf.browGap)),
              neutralEyeRatio:         mean(cfs.map(cf => cf.eyeRatio)),
              neutralLandmarkVariance: Math.max(avgLandmarkVar, 1e-8),
              neutralShoulderSpan:     spanVals.length ? mean(spanVals) : 0.20,
              neutralChinRatio:        mean(cfs.map(cf => cf.chinRatio)),
            };
            baselineRef.current   = newBaseline;
            setBaseline(newBaseline);
            setCalibState("done");
            calibStateRef.current = "done";
            saveBaseline(newBaseline);
            setCalibProgress(1);
            setToast("Calibrated to your face");
            setTimeout(() => setToast(null), 2200);
          }
        } else {
          // Stability broken — reset timer
          calibStableStartRef.current = null;
          setCalibProgress(0);
        }
      }
    }

    // ③ Score current mode
    const face    = landmarks;
    const history = faceHistoryRef.current;
    const pose    = poseDataRef.current;
    const bl      = baselineRef.current;

    let result: ScoreResult;
    switch (modeRef.current) {
      case "confident":   result = scoreConfident(face, history, pose, bl);   break;
      case "friendly":    result = scoreFriendly(face, bl);                   break;
      case "charismatic": result = scoreCharismatic(face, history, bl);       break;
      case "open":        result = scoreOpen(face, history, pose, bl);        break;
      default:            result = { total: 0, signals: [] };
    }

    // ④ Exponential moving average for smooth animation
    smoothRef.current = smoothRef.current * 0.82 + result.total * 0.18;
    setScore(smoothRef.current);
    setSignals(result.signals);
  }, []);

  const handlePoseLandmarks = useCallback((landmarks: PoseLandmark[]) => {
    poseDataRef.current = landmarks;
  }, []);

  // Reset smooth score when mode changes
  const handleModeChange = (m: Mode) => {
    setMode(m);
    smoothRef.current = 0;
    setScore(0);
    setSignals([]);
  };

  function resetCalibration() {
    clearBaseline();
    setBaseline(null);
    baselineRef.current   = null;
    setCalibState("calibrating");
    calibStateRef.current = "calibrating";
    calibFramesRef.current = [];
    calibStableStartRef.current = null;
    setCalibProgress(0);
    setToast(null);
    smoothRef.current = 0;
    setScore(0);
    setSignals([]);
  }

  const current      = MODES.find(m => m.id === mode)!;
  const passingCount = signals.filter(s => s.passing).length;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#000000" }}>

      {/* ── Camera panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ background: "#000000" }}>
        <div className="flex-1 relative overflow-hidden">
          <FaceMeshCamera
            confidenceScore={score}
            onFaceLandmarks={handleFaceLandmarks}
            onPoseLandmarks={handlePoseLandmarks}
          />
          <CornerBrackets />

          {/* ── Calibration overlay ── */}
          {calibState === "calibrating" && (
            <div
              className="absolute bottom-0 inset-x-0 z-20 px-6 pb-6 pt-12"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 70%, transparent 100%)" }}
            >
              <div className="flex flex-col gap-3 max-w-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ background: ACCENT, boxShadow: `0 0 5px ${ACCENT}` }}
                  />
                  <span className="text-sm font-semibold tracking-tight" style={{ color: "#FFFFFF" }}>
                    Sit naturally — look at the camera
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono tracking-widest uppercase"
                  style={{ color: "#888888", paddingLeft: "16px" }}
                >
                  Calibrating to your face
                </span>
                <div
                  className="rounded-full overflow-hidden"
                  style={{ height: 2, background: "#1A1A1A", marginLeft: "16px" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${calibProgress * 100}%`,
                      background: ACCENT,
                      boxShadow: `0 0 6px rgba(255,71,87,0.5)`,
                      transition: calibProgress > 0 ? "width 0.25s linear" : "none",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Toast ── */}
          {toast && (
            <div
              className="absolute top-3 left-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap"
              style={{
                background: "rgba(0,0,0,0.85)",
                border: "1px solid #2A2A2A",
                backdropFilter: "blur(8px)",
                animation: "hsosToastFade 2.2s ease forwards",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ACCENT, boxShadow: `0 0 4px ${ACCENT}` }} />
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#BBBBBB" }}>{toast}</span>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div
          className="flex items-center gap-3 px-5 shrink-0"
          style={{
            height: 34,
            background: "#000000",
            borderTop: "1px solid #1A1A1A",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: ACCENT, boxShadow: `0 0 4px rgba(255,71,87,0.6)` }}
          />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#888888" }}>Live</span>
          <div className="flex-1" />
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: signals.length ? "#BBBBBB" : "#444444" }}>
            {signals.length
              ? `${passingCount} of ${signals.length} passing`
              : "Awaiting detection"}
          </span>
          <span style={{ color: "#2A2A2A" }}>·</span>
          <button
            onClick={resetCalibration}
            className="text-[10px] font-mono tracking-widest uppercase transition-colors"
            style={{
              color: calibState === "calibrating" ? ACCENT : "#444444",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={e => (e.currentTarget.style.color = calibState === "calibrating" ? ACCENT : "#444444")}
          >
            {calibState === "calibrating" ? "Calibrating" : "Recalibrate"}
          </button>
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col overflow-y-auto shrink-0"
        style={{
          width: 296,
          background: "#000000",
          borderLeft: "1px solid #1A1A1A",
        }}
      >
        <div className="flex flex-col gap-7 p-5">

          {/* Mode selector */}
          <div>
            <SectionLabel>Mode</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {MODES.map(m => {
                const active = mode === m.id;
                return (
                  <ModeTooltip key={m.id} text={m.tooltip}>
                    <button
                      onClick={() => handleModeChange(m.id)}
                      className="w-full flex flex-col items-start gap-1 px-3 py-3 rounded-lg text-left transition-all"
                      style={{
                        background: active ? "rgba(255,71,87,0.08)" : "#111111",
                        border: `1px solid ${active ? ACCENT : "#2A2A2A"}`,
                      }}
                    >
                      <span
                        className="text-xs font-semibold leading-none tracking-tight"
                        style={{ color: active ? "#FFFFFF" : "#888888" }}
                      >
                        {m.label}
                      </span>
                      <span className="text-[10px] leading-none" style={{ color: "#444444" }}>
                        {m.description}
                      </span>
                      {active && signals.length > 0 && (
                        <div className="flex gap-1 mt-1.5 w-full">
                          {signals.map(s => (
                            <div
                              key={s.label}
                              className="h-0.5 flex-1 rounded-full"
                              style={{
                                background: s.passing ? "#FFFFFF" : ACCENT,
                                transition: "background 0.4s ease",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  </ModeTooltip>
                );
              })}
            </div>
          </div>

          {/* Score ring */}
          <div>
            <SectionLabel>Signal Score</SectionLabel>
            <div className="flex justify-center">
              <ScoreRing score={score} hasData={signals.length > 0} />
            </div>
          </div>

          {/* Calibration progress indicator */}
          {calibState === "calibrating" && (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
              style={{ background: "#111111", border: "1px solid #2A2A2A" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                style={{ background: ACCENT }}
              />
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#888888" }}>
                {calibProgress > 0
                  ? `Hold still · ${Math.round(calibProgress * 100)}%`
                  : "Calibrating"}
              </span>
            </div>
          )}

          {/* Signal breakdown */}
          <div>
            <SectionLabel>Signals</SectionLabel>
            <div className="flex flex-col gap-4">
              {signals.length > 0 ? (
                signals.map(s => <SignalRow key={s.label} {...s} />)
              ) : (
                <div
                  className="flex items-center justify-center py-6 rounded-lg"
                  style={{ background: "#111111", border: "1px solid #1A1A1A" }}
                >
                  <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#444444" }}>
                    Awaiting detection
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* What we measure */}
          <div>
            <SectionLabel>Measuring</SectionLabel>
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: "#111111", border: "1px solid #1A1A1A" }}
            >
              <ModeDescription mode={mode} />
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}

function ModeDescription({ mode }: { mode: Mode }) {
  const descriptions: Record<Mode, { bullets: string[] }> = {
    confident: {
      bullets: [
        "Head stillness relative to your calibrated baseline",
        "Shoulder height symmetry",
        "Chin raised above your neutral position",
      ],
    },
    friendly: {
      bullets: [
        "Smile above your neutral mouth position",
        "Brow gap above your resting baseline",
        "Slight eye-height asymmetry (warm tilt)",
      ],
    },
    charismatic: {
      bullets: [
        "Expressiveness above your calibrated variance",
        "Nose-tip Y oscillation (nod detection)",
        "Eye openness above your resting ratio",
      ],
    },
    open: {
      bullets: [
        "Shoulder span wider than your baseline",
        "Both shoulders visible to camera",
        "Chin raised above your neutral position",
      ],
    },
  };
  return (
    <ul className="flex flex-col gap-2">
      {descriptions[mode].bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: "#888888" }}>
          <span style={{ color: ACCENT, marginTop: 1, flexShrink: 0 }}>›</span>
          {b}
        </li>
      ))}
    </ul>
  );
}
