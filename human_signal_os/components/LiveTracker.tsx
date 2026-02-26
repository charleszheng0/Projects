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
 */
function scoreConfident(
  face: FaceLandmark[],
  history: FaceLandmark[][],
  pose?: PoseLandmark[],
): ScoreResult {
  const signals: Signal[] = [];

  // Head Stability — variance of nose-tip Y over last 10 frames
  const slice10 = history.slice(-10);
  const noseTipYs = slice10.map(f => f[F.NOSE_TIP]?.y ?? 0);
  const jitter = variance(noseTipYs);
  // jitter < 5e-6 = very stable; > 4e-5 = noticeably moving
  const stabilityScore = norm(jitter, 4e-5, 4e-7) ; // inverted
  signals.push({ label: "Head Stability", score: stabilityScore, passing: stabilityScore > 0.6 });

  // Shoulder Level — |left.y − right.y| from pose
  let shoulderScore = 0.5;
  if (pose?.[11] && pose?.[12]) {
    const yDiff = Math.abs(pose[11].y - pose[12].y);
    // < 0.015 = level; > 0.06 = clearly uneven
    shoulderScore = norm(yDiff, 0.06, 0.015);
  }
  signals.push({ label: "Shoulder Level", score: shoulderScore, passing: shoulderScore > 0.6 });

  // Chin Position — nose should sit ~35% of face-height below the eyes
  const eyeCY = mean([face[F.L_EYE_TOP]?.y ?? 0.38, face[F.R_EYE_TOP]?.y ?? 0.38]);
  const nosY  = face[F.NOSE_TIP]?.y ?? 0.55;
  const chinY = face[F.CHIN]?.y ?? 0.75;
  const fhd   = (face[F.FOREHEAD_TOP]?.y ?? 0.20);
  const faceH = chinY - fhd;
  const ratio = faceH > 0.01 ? (nosY - eyeCY) / faceH : 0.35;
  // ideal 0.28–0.46; tucked < 0.25; craned > 0.50
  const chinScore =
    ratio >= 0.28 && ratio <= 0.46 ? 1 :
    ratio < 0.28  ? norm(ratio, 0.14, 0.28) :
                    norm(ratio, 0.58, 0.46);
  signals.push({ label: "Chin Position", score: chinScore, passing: chinScore > 0.6 });

  return { total: mean(signals.map(s => s.score)), signals };
}

/**
 * FRIENDLY
 * Measures: smile lift (mouth corners), brow raise, slight head tilt.
 */
function scoreFriendly(face: FaceLandmark[]): ScoreResult {
  const signals: Signal[] = [];

  // Smile — mouth corners Y vs mouth centre Y
  // In image coords y=0 is top; smiling lifts corners (smaller y than centre)
  const cornerY  = mean([face[F.MOUTH_L]?.y ?? 0.65, face[F.MOUTH_R]?.y ?? 0.65]);
  const centreY  = mean([face[F.MOUTH_TOP]?.y ?? 0.63, face[F.MOUTH_BOT]?.y ?? 0.67]);
  const smileLift = centreY - cornerY; // positive = corners above centre = smile
  // neutral ≈ −0.005..+0.005; smile ≈ +0.01..+0.03
  const smileScore = norm(smileLift, -0.005, 0.025);
  signals.push({ label: "Smile", score: smileScore, passing: smileScore > 0.5 });

  // Eyebrow Raise — gap between inner brow and eye top
  const lBrowGap = (face[F.L_EYE_TOP]?.y ?? 0.38) - (face[F.L_BROW_INNER]?.y ?? 0.33);
  const rBrowGap = (face[F.R_EYE_TOP]?.y ?? 0.38) - (face[F.R_BROW_INNER]?.y ?? 0.33);
  const avgGap   = mean([lBrowGap, rBrowGap]);
  // neutral ≈ 0.025; raised ≈ 0.045+
  const browScore = norm(avgGap, 0.018, 0.050);
  signals.push({ label: "Open Brows", score: browScore, passing: browScore > 0.45 });

  // Head Tilt — asymmetry in eye heights (slight tilt = warmer)
  const eyeAsym = Math.abs((face[F.L_EYE_TOP]?.y ?? 0) - (face[F.R_EYE_TOP]?.y ?? 0));
  // 0.005–0.035 is "warm tilt"; 0 = neutral; >0.05 = too much
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
function scoreCharismatic(face: FaceLandmark[], history: FaceLandmark[][]): ScoreResult {
  const signals: Signal[] = [];

  // Expressiveness — total XY variance across key landmarks over last 30 frames
  const KEY = [F.NOSE_TIP, F.MOUTH_L, F.MOUTH_R, F.L_EYE_OUTER, F.R_EYE_OUTER, F.L_BROW_INNER, F.R_BROW_INNER];
  let totalVar = 0;
  if (history.length >= 3) {
    for (const idx of KEY) {
      const xs = history.map(f => f[idx]?.x ?? 0);
      const ys = history.map(f => f[idx]?.y ?? 0);
      totalVar += variance(xs) + variance(ys);
    }
    totalVar /= KEY.length * 2;
  }
  // still ≈ 1e-6; lively ≈ 8e-5+
  const expressScore = norm(totalVar, 1e-6, 8e-5);
  signals.push({ label: "Expressiveness", score: expressScore, passing: expressScore > 0.35 });

  // Nodding — standard deviation of nose-tip Y (oscillation)
  const noseTipYs = history.map(f => f[F.NOSE_TIP]?.y ?? 0);
  const yStd = Math.sqrt(variance(noseTipYs));
  // < 0.003 = still; > 0.015 = active nod
  const noddingScore = norm(yStd, 0.003, 0.018);
  signals.push({ label: "Head Movement", score: noddingScore, passing: noddingScore > 0.3 });

  // Eye Openness — height/width ratio per eye
  const lH = Math.abs((face[F.L_EYE_TOP]?.y ?? 0) - (face[F.L_EYE_BOT]?.y ?? 0));
  const lW = Math.abs((face[F.L_EYE_OUTER]?.x ?? 0) - (face[F.L_EYE_INNER]?.x ?? 0));
  const rH = Math.abs((face[F.R_EYE_TOP]?.y ?? 0) - (face[F.R_EYE_BOT]?.y ?? 0));
  const rW = Math.abs((face[F.R_EYE_OUTER]?.x ?? 0) - (face[F.R_EYE_INNER]?.x ?? 0));
  const openness = lW > 0.01 && rW > 0.01 ? mean([lH / lW, rH / rW]) : 0.25;
  // squinting < 0.15; neutral ≈ 0.20–0.30; wide ≈ 0.32+
  const eyeScore = norm(openness, 0.12, 0.34);
  signals.push({ label: "Eye Openness", score: eyeScore, passing: eyeScore > 0.5 });

  return { total: mean(signals.map(s => s.score)), signals };
}

/**
 * OPEN
 * Measures: shoulder width (pose), both shoulders visible, chin not tucked.
 */
function scoreOpen(
  face: FaceLandmark[],
  _history: FaceLandmark[][],
  pose?: PoseLandmark[],
): ScoreResult {
  const signals: Signal[] = [];

  // Shoulder Width — wider = more open/expansive
  let widthScore = 0.5;
  if (pose?.[11] && pose?.[12]) {
    const xSpan = Math.abs(pose[11].x - pose[12].x);
    // < 0.12 = narrow; > 0.28 = wide
    widthScore = norm(xSpan, 0.12, 0.28);
  }
  signals.push({ label: "Shoulder Width", score: widthScore, passing: widthScore > 0.55 });

  // Facing Forward — both shoulder landmarks visible to the camera
  let facingScore = 0.5;
  if (pose?.[11] && pose?.[12]) {
    facingScore = mean([pose[11].visibility ?? 0.5, pose[12].visibility ?? 0.5]);
  }
  signals.push({ label: "Facing Forward", score: facingScore, passing: facingScore > 0.65 });

  // Chin Up — same geometry as Confident but we reward any positive value
  const eyeCY  = mean([face[F.L_EYE_TOP]?.y ?? 0.38, face[F.R_EYE_TOP]?.y ?? 0.38]);
  const nosY   = face[F.NOSE_TIP]?.y ?? 0.55;
  const chinY  = face[F.CHIN]?.y ?? 0.75;
  const fhd    = face[F.FOREHEAD_TOP]?.y ?? 0.20;
  const faceH  = chinY - fhd;
  const ratio  = faceH > 0.01 ? (nosY - eyeCY) / faceH : 0.35;
  // chin up = ratio in range; tucked < 0.25
  const chinScore = norm(ratio, 0.20, 0.42);
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

const MODES: ModeConfig[] = [
  { id: "confident",   label: "Confident",   color: "#3b82f6", description: "Posture · head stability",  tooltip: "Head stability, shoulder level, chin position" },
  { id: "friendly",    label: "Friendly",    color: "#10b981", description: "Smile · eye contact",       tooltip: "Smile lift, eyebrow raise, head tilt" },
  { id: "charismatic", label: "Charismatic", color: "#8b5cf6", description: "Expression range",          tooltip: "Expressiveness variance, head nods, eye openness" },
  { id: "open",        label: "Open",        color: "#f59e0b", description: "Body position",             tooltip: "Shoulder width, facing forward, chin angle" },
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
          className="px-2.5 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)" }}
        >
          {text}
        </div>
        {/* caret */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
          style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--border-strong)" }} />
      </div>
    </div>
  );
}

function CornerBrackets() {
  const corners: React.CSSProperties[] = [
    { top: 16, left: 16, transform: "rotate(0deg)" },
    { top: 16, right: 16, transform: "rotate(90deg)" },
    { bottom: 16, right: 16, transform: "rotate(180deg)" },
    { bottom: 16, left: 16, transform: "rotate(270deg)" },
  ];
  return (
    <>
      {corners.map((s, i) => (
        <div key={i} className="absolute pointer-events-none z-10" style={s}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 7V2H7" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </>
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

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r    = 42;
  const circ = 2 * Math.PI * r;
  const pct  = Math.round(score * 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[108px] h-[108px]">
        <svg className="w-full h-full" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circ * score} ${circ}`}
            style={{ transition: "stroke-dasharray 0.3s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
            {pct}
          </span>
          <span className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>/ 100</span>
        </div>
      </div>
    </div>
  );
}

function SignalRow({ label, score, passing }: Signal) {
  const pct   = Math.round(score * 100);
  const color = passing ? "var(--green)" : "var(--red)";
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs w-3 shrink-0 mt-0.5 font-mono" style={{ color }}>
        {passing ? "✓" : "✗"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span className="text-xs font-mono tabular-nums ml-2" style={{ color: "var(--text-muted)" }}>
            {pct}%
          </span>
        </div>
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: color, transition: "width 0.3s ease" }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusDot() {
  return (
    <span className="w-1 h-1 rounded-full shrink-0 inline-block" style={{ background: "var(--green)" }} />
  );
}

function Sep() {
  return <span style={{ color: "var(--border-default)" }}>·</span>;
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LiveTracker() {
  const [mode, setMode]       = useState<Mode>("confident");
  const [score, setScore]     = useState(0);
  const [signals, setSignals] = useState<Signal[]>([]);

  // History buffers — refs avoid triggering renders on every frame
  const faceHistoryRef = useRef<FaceLandmark[][]>([]);
  const poseDataRef    = useRef<PoseLandmark[] | undefined>(undefined);
  const smoothRef      = useRef(0);
  const modeRef        = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Called from FaceMeshCamera every frame a face is detected
  const handleFaceLandmarks = useCallback((landmarks: FaceLandmark[]) => {
    // Update rolling buffer
    faceHistoryRef.current.push(landmarks);
    if (faceHistoryRef.current.length > HISTORY_FRAMES) {
      faceHistoryRef.current.shift();
    }

    // Score current mode
    const face    = landmarks;
    const history = faceHistoryRef.current;
    const pose    = poseDataRef.current;

    let result: ScoreResult;
    switch (modeRef.current) {
      case "confident":   result = scoreConfident(face, history, pose);   break;
      case "friendly":    result = scoreFriendly(face);                   break;
      case "charismatic": result = scoreCharismatic(face, history);       break;
      case "open":        result = scoreOpen(face, history, pose);        break;
      default:            result = { total: 0, signals: [] };
    }

    // Exponential moving average for smooth animation
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

  const current     = MODES.find(m => m.id === mode)!;
  const passingCount = signals.filter(s => s.passing).length;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Camera panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ background: "var(--bg-app)" }}>
        <div className="flex-1 relative overflow-hidden">
          <FaceMeshCamera
            confidenceScore={score}
            onFaceLandmarks={handleFaceLandmarks}
            onPoseLandmarks={handlePoseLandmarks}
          />
          <CornerBrackets />
        </div>

        {/* Status bar */}
        <div
          className="flex items-center gap-3 px-4 shrink-0 text-xs font-mono"
          style={{
            height: 32,
            background: "var(--bg-panel)",
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          <StatusDot /><span>FaceMesh 468 pts</span>
          <Sep />
          <StatusDot /><span>Pose 33 pts</span>
          <Sep />
          <span>WASM · SIMD</span>
          <Sep />
          <span>720p</span>
          <div className="flex-1" />
          <span style={{ color: signals.length ? "var(--text-secondary)" : "var(--text-muted)" }}>
            {signals.length
              ? `${passingCount}/${signals.length} signals passing`
              : "awaiting face…"}
          </span>
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col overflow-y-auto shrink-0"
        style={{
          width: 296,
          background: "var(--bg-panel)",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex flex-col gap-5 p-5">

          {/* Mode selector */}
          <div>
            <SectionLabel>Analysis Mode</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {MODES.map(m => {
                const active = mode === m.id;
                return (
                  <ModeTooltip key={m.id} text={m.tooltip}>
                    <button
                      onClick={() => handleModeChange(m.id)}
                      className="w-full flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg text-left"
                      style={{
                        background: active ? `${m.color}12` : "var(--bg-elevated)",
                        border:     `1px solid ${active ? `${m.color}40` : "var(--border-subtle)"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <span className="text-sm font-medium leading-none" style={{ color: active ? m.color : "var(--text-secondary)" }}>
                        {m.label}
                      </span>
                      <span className="text-xs leading-none mt-1" style={{ color: "var(--text-muted)" }}>
                        {m.description}
                      </span>
                      {/* Active signal dots — green/red per passing signal */}
                      {active && signals.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {signals.map(s => (
                            <div
                              key={s.label}
                              className="w-1.5 h-1.5 rounded-full"
                              title={`${s.label}: ${s.passing ? "passing" : "failing"}`}
                              style={{
                                background: s.passing ? "#10b981" : "#f43f5e",
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
            <div className="flex justify-center mt-3">
              {signals.length > 0 ? (
                <ScoreRing score={score} color={current.color} />
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-full"
                  style={{ width: 108, height: 108, border: "4px solid var(--border-subtle)" }}
                >
                  <span className="text-3xl font-bold" style={{ color: "var(--text-muted)" }}>—</span>
                  <span className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>/ 100</span>
                </div>
              )}
            </div>
          </div>

          {/* Signal breakdown */}
          <div>
            <SectionLabel>Signal Breakdown</SectionLabel>
            <div className="flex flex-col gap-3 mt-3">
              {signals.length > 0 ? (
                signals.map(s => <SignalRow key={s.label} {...s} />)
              ) : (
                <div
                  className="flex items-center justify-center py-5 rounded-lg"
                  style={{ background: "var(--bg-elevated)", border: "1px dashed var(--border-subtle)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Waiting for face detection…
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mode description */}
          <div>
            <SectionLabel>What We Measure</SectionLabel>
            <div
              className="mt-3 rounded-lg px-3 py-3"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <ModeDescription mode={mode} color={current.color} />
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}

function ModeDescription({ mode, color }: { mode: Mode; color: string }) {
  const descriptions: Record<Mode, { bullets: string[] }> = {
    confident: {
      bullets: [
        "Nose-tip jitter < 2px over 10 frames",
        "Shoulder height difference < 6% of frame",
        "Nose-to-eye ratio in natural range",
      ],
    },
    friendly: {
      bullets: [
        "Mouth corners elevated above lip centre",
        "Brow-to-eye gap > neutral baseline",
        "Slight eye-height asymmetry (warm tilt)",
      ],
    },
    charismatic: {
      bullets: [
        "Landmark XY variance across 30 frames",
        "Nose-tip Y oscillation (nod detection)",
        "Eye height/width ratio",
      ],
    },
    open: {
      bullets: [
        "Shoulder span > 20% of frame width",
        "Both shoulders visible to camera",
        "Nose-to-eye face ratio (chin angle)",
      ],
    },
  };
  return (
    <ul className="flex flex-col gap-1.5">
      {descriptions[mode].bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span style={{ color, marginTop: 1 }}>›</span>
          {b}
        </li>
      ))}
    </ul>
  );
}
