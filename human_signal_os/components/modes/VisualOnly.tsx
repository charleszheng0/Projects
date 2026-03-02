"use client";

import { useState, useRef, useCallback, useEffect, useReducer } from "react";
import FaceMeshCamera from "@/components/FaceMeshCamera";
import type { FaceLandmark } from "@/components/FaceMeshCamera";
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
import { RollingBuffer } from "@/lib/rollingAverage";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT         = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const CALIB_MS     = 3500;
const CALIB_NEEDED = 30;

// ── Callout system ────────────────────────────────────────────────────────────

interface Callout {
  id:      string;
  text:    string;
  anchorX: number;
  anchorY: number;
  phase:   "in" | "hold" | "out";
}

interface CalloutState {
  active:    Callout[];
  cooldowns: Record<string, number>;
}

type CalloutAction =
  | { type: "ADD";    callout: Callout }
  | { type: "PHASE";  id: string; phase: "hold" | "out" }
  | { type: "REMOVE"; id: string };

function calloutReducer(state: CalloutState, action: CalloutAction): CalloutState {
  switch (action.type) {
    case "ADD":    return { ...state, active: [...state.active, action.callout] };
    case "PHASE":  return { ...state, active: state.active.map(c => c.id === action.id ? { ...c, phase: action.phase } : c) };
    case "REMOVE": return { ...state, active: state.active.filter(c => c.id !== action.id) };
    default:       return state;
  }
}

interface CalloutRule {
  key:       keyof VisionBreakdown | "presence";
  check:     (val: number) => boolean;
  text:      string;
  positionX: number;
  positionY: number;
}

// Thresholds are deliberately strict — only fire on genuinely notable states
const CALLOUT_RULES: CalloutRule[] = [
  // Gaze
  { key: "gaze",           check: v => v < 0.30,  text: "Eyes drifting",       positionX: 0.50, positionY: 0.32 },
  { key: "gaze",           check: v => v > 0.82,  text: "Great eye contact",    positionX: 0.50, positionY: 0.32 },
  // Brow
  { key: "browTension",    check: v => v < 0.25,  text: "Relax your brow",      positionX: 0.74, positionY: 0.22 },
  { key: "browTension",    check: v => v > 0.78,  text: "Open expression",      positionX: 0.74, positionY: 0.22 },
  // Lip / jaw
  { key: "lipCompression", check: v => v < 0.25,  text: "Unclench your jaw",    positionX: 0.74, positionY: 0.64 },
  // Stillness
  { key: "fidget",         check: v => v < 0.28,  text: "Stay still",           positionX: 0.26, positionY: 0.52 },
  { key: "fidget",         check: v => v > 0.82,  text: "Good stillness",       positionX: 0.26, positionY: 0.52 },
  // Head / chin
  { key: "headPosition",   check: v => v < 0.28,  text: "Lift your chin",       positionX: 0.50, positionY: 0.76 },
  { key: "headPosition",   check: v => v > 0.82,  text: "Strong posture",       positionX: 0.50, positionY: 0.76 },
  // Smile
  { key: "duchenneSmile",  check: v => v > 0.72,  text: "Genuine smile",        positionX: 0.50, positionY: 0.64 },
  // Presence
  { key: "presence",       check: v => v > 82,    text: "Strong presence",      positionX: 0.24, positionY: 0.20 },
  { key: "presence",       check: v => v < 28,    text: "Build your presence",  positionX: 0.24, positionY: 0.20 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function PresenceRing({ score, hasData }: { score: number; hasData: boolean }) {
  const size = 96;
  const r    = size * 0.40;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(score / 100, 1);

  const color = score > 70 ? "#3B82F6" : score > 45 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        {hasData && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${fill} ${circ - fill}`}
            style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.6s ease", filter: `drop-shadow(0 0 6px ${color}80)` }} />
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: FONT, fontSize: size * 0.28, fontWeight: 900,
          lineHeight: 1, letterSpacing: "-1px",
          color: hasData ? "#FFFFFF" : "#333",
          fontVariantNumeric: "tabular-nums",
        }}>
          {hasData ? Math.round(score) : "—"}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500,
          color: "#666", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>
          Presence
        </span>
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: number;   // 0–1
  hasData: boolean;
}

function MetricRow({ label, value, hasData }: MetricRowProps) {
  const pct   = Math.round(value * 100);
  const color = value > 0.65 ? "#3B82F6" : value > 0.40 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 500,
        color: "#777", letterSpacing: "0.02em",
        width: 56, flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 3, borderRadius: 100,
        background: "rgba(255,255,255,0.06)", overflow: "hidden",
      }}>
        {hasData && (
          <div style={{
            height: "100%", borderRadius: 100,
            width: `${pct}%`,
            background: color,
            transition: "width 0.35s ease, background 0.5s ease",
          }} />
        )}
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 600,
        color: hasData ? "#AAAAAA" : "#333",
        letterSpacing: "-0.01em",
        width: 26, textAlign: "right", flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}>
        {hasData ? `${pct}` : "—"}
      </span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function VisualOnly() {
  const [presence,   setPresence]   = useState(0);
  const [hasData,    setHasData]    = useState(false);
  const [calibState, setCalibState] = useState<"calibrating" | "done">("calibrating");
  const [calibProg,  setCalibProg]  = useState(0);
  const [toast,      setToast]      = useState<string | null>(null);
  const [breakdown,  setBreakdown]  = useState<VisionBreakdown | null>(null);

  const baselineRef     = useRef<VisionBaseline | null>(null);
  const calibStateRef   = useRef<"calibrating" | "done">("calibrating");
  const calibStartRef   = useRef<number | null>(null);
  const calibFramesRef  = useRef<Partial<VisionBaseline>[]>([]);
  const noseTipYsRef    = useRef<number[]>([]);
  const irisDevsRef     = useRef<number[]>([]);
  const hist3sRef       = useRef<Pt[][]>([]);
  const hist5sRef       = useRef<Pt[][]>([]);
  const rollRef         = useRef(new RollingBuffer(3));
  const frameCountRef   = useRef(0);
  const breakdownRef    = useRef<VisionBreakdown | null>(null);
  const presenceRef     = useRef(0);

  // Callout system
  const [{ active: callouts }, dispatch] = useReducer(calloutReducer, { active: [], cooldowns: {} });
  const cooldownsRef  = useRef<Record<string, number>>({});
  // Separate hysteresis counters — negative signals require 3 consecutive blocks, positive 2
  const hysteresisRef = useRef<Record<string, number>>({});

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

  const addCallout = useCallback((rule: CalloutRule, anchorX: number, anchorY: number) => {
    const now = Date.now();
    if (cooldownsRef.current[rule.text] && cooldownsRef.current[rule.text] > now) return;
    if (callouts.length >= 2) return;

    const id = `${rule.text}-${now}`;
    dispatch({ type: "ADD", callout: { id, text: rule.text, anchorX, anchorY, phase: "in" } });
    cooldownsRef.current[rule.text] = now + 7000;  // 7s cooldown so same callout doesn't spam

    setTimeout(() => dispatch({ type: "PHASE", id, phase: "hold" }),  200);
    setTimeout(() => dispatch({ type: "PHASE", id, phase: "out" }),   2200);
    setTimeout(() => dispatch({ type: "REMOVE", id }),                 2700);
  }, [callouts.length]);

  const handleFaceLandmarks = useCallback((landmarks: FaceLandmark[]) => {
    const face = landmarks as Pt[];

    hist3sRef.current.push(face);
    hist5sRef.current.push(face);
    if (hist3sRef.current.length > 90)  hist3sRef.current.shift();
    if (hist5sRef.current.length > 150) hist5sRef.current.shift();

    // ── Calibration ──────────────────────────────────────────────────────────
    if (calibStateRef.current === "calibrating") {
      calibFramesRef.current.push(extractCalibFrame(face));
      if (calibFramesRef.current.length > 60) calibFramesRef.current.shift();

      const noseTip = face[4];
      if (noseTip) {
        noseTipYsRef.current.push(noseTip.y);
        if (noseTipYsRef.current.length > 90) noseTipYsRef.current.shift();
      }

      const lIris = face[468], rIris = face[473];
      const lOut = face[33], lIn = face[133], rOut = face[263], rIn = face[362];
      if (lIris && rIris && lOut && lIn && rOut && rIn) {
        const lW  = Math.abs(lOut.x - lIn.x) || 0.01;
        const rW  = Math.abs(rOut.x - rIn.x) || 0.01;
        const lDx = (lIris.x - Math.min(lOut.x, lIn.x)) / lW - 0.5;
        const rDx = (rIris.x - Math.min(rOut.x, rIn.x)) / rW - 0.5;
        irisDevsRef.current.push((Math.abs(lDx) + Math.abs(rDx)) / 2);
        if (irisDevsRef.current.length > 90) irisDevsRef.current.shift();
      }

      if (calibFramesRef.current.length >= CALIB_NEEDED) {
        const nys   = noseTipYsRef.current;
        const nMean = nys.reduce((a, b) => a + b, 0) / (nys.length || 1);
        const nVar  = nys.reduce((a, b) => a + (b - nMean) ** 2, 0) / (nys.length || 1);

        if (nVar < 2.5e-5) {
          if (!calibStartRef.current) calibStartRef.current = Date.now();
          const elapsed = Date.now() - calibStartRef.current;
          setCalibProg(Math.min(elapsed / CALIB_MS, 1));

          if (elapsed >= CALIB_MS) {
            const irisAvg = irisDevsRef.current.reduce((a, b) => a + b, 0) /
                            (irisDevsRef.current.length || 1);
            const bl = buildBaseline(calibFramesRef.current, nVar, irisAvg);
            baselineRef.current   = bl;
            calibStateRef.current = "done";
            setCalibState("done");
            saveVisionBaseline(bl);
            setCalibProg(1);
            showToast("Calibrated");
          }
        } else {
          calibStartRef.current = null;
          setCalibProg(0);
        }
      }
    }

    // ── Scoring ──────────────────────────────────────────────────────────────
    const scores = computeVisionScores(face, hist3sRef.current, hist5sRef.current, baselineRef.current);
    rollRef.current.push(scores.confidence);

    const bd = scores.breakdown;
    const pres = Math.min(100, Math.max(0,
      (bd.gaze          * 0.30 +
       bd.duchenneSmile * 0.20 +
       bd.fidget        * 0.20 +
       bd.browTension   * 0.15 +
       bd.headPosition  * 0.15) * 100
    ));

    setPresence(pres);
    setHasData(true);
    breakdownRef.current = bd;
    presenceRef.current  = pres;

    // Update breakdown state every 5 frames for smooth but not-every-frame React renders
    frameCountRef.current++;
    if (frameCountRef.current % 5 === 0) {
      setBreakdown({ ...bd });
    }

    // ── Callout evaluation (every ~30 frames ≈ 1s at 30fps) ─────────────────
    if (frameCountRef.current % 30 !== 0) return;

    for (const rule of CALLOUT_RULES) {
      const val = rule.key === "presence"
        ? pres
        : bd[rule.key as keyof VisionBreakdown] ?? 0;

      // Negative callouts need 3 consecutive hits; positive only need 2
      const isPositive = rule.text.startsWith("Great") ||
                         rule.text.startsWith("Good")  ||
                         rule.text.startsWith("Strong") ||
                         rule.text.startsWith("Genuine") ||
                         rule.text.startsWith("Open");
      const threshold = isPositive ? 2 : 3;

      if (rule.check(val)) {
        hysteresisRef.current[rule.text] = (hysteresisRef.current[rule.text] ?? 0) + 1;
        if (hysteresisRef.current[rule.text] >= threshold) {
          const mirroredX = 1 - rule.positionX;
          addCallout(rule, mirroredX, rule.positionY);
          hysteresisRef.current[rule.text] = 0;
        }
      } else {
        hysteresisRef.current[rule.text] = 0;
      }
    }
  }, [addCallout]);

  function resetCalibration() {
    clearVisionBaseline();
    baselineRef.current    = null;
    calibStateRef.current  = "calibrating";
    calibStartRef.current  = null;
    calibFramesRef.current = [];
    noseTipYsRef.current   = [];
    irisDevsRef.current    = [];
    hist3sRef.current      = [];
    hist5sRef.current      = [];
    rollRef.current.clear();
    setCalibState("calibrating");
    setCalibProg(0);
    setHasData(false);
    setPresence(0);
    setBreakdown(null);
    breakdownRef.current = null;
  }

  return (
    <>
      <style>{`
        @keyframes voCalloutIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes voCalloutOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-4px); } }
      `}</style>

      <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
        {/* Camera — ghost outline */}
        <FaceMeshCamera
          confidenceScore={presence}
          overlayMode="ghost"
          onFaceLandmarks={handleFaceLandmarks}
        />

        {/* Live panel — top right */}
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 20,
          background: "rgba(0,0,0,0.60)", backdropFilter: "blur(14px)",
          borderRadius: 14, padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column", gap: 12,
          minWidth: 172,
        }}>
          {/* Presence ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <PresenceRing score={presence} hasData={hasData} />
            <span style={{
              fontFamily: FONT, fontSize: 9, color: "#555",
              letterSpacing: "0.04em", textAlign: "center", lineHeight: 1.4,
            }}>
              gaze · stillness · expression
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 -4px" }} />

          {/* Live metric bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MetricRow label="Gaze"      value={breakdown?.gaze          ?? 0} hasData={hasData} />
            <MetricRow label="Stillness" value={breakdown?.fidget        ?? 0} hasData={hasData} />
            <MetricRow label="Posture"   value={breakdown?.headPosition  ?? 0} hasData={hasData} />
            <MetricRow label="Brow"      value={breakdown?.browTension   ?? 0} hasData={hasData} />
            <MetricRow label="Smile"     value={breakdown?.duchenneSmile ?? 0} hasData={hasData} />
          </div>
        </div>

        {/* Floating callout labels */}
        {callouts.map(callout => (
          <div
            key={callout.id}
            style={{
              position: "absolute",
              left:      `${callout.anchorX * 100}%`,
              top:       `${callout.anchorY * 100}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 30,
              pointerEvents: "none",
              animation: callout.phase === "in"
                ? "voCalloutIn 0.2s ease forwards"
                : callout.phase === "out"
                ? "voCalloutOut 0.5s ease forwards"
                : undefined,
              opacity: callout.phase === "hold" ? 1 : undefined,
            }}
          >
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 600,
              color: "#FFFFFF", letterSpacing: "0.04em",
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
              padding: "5px 12px", borderRadius: 100,
              border: "1px solid rgba(255,255,255,0.14)",
              whiteSpace: "nowrap",
            }}>
              {callout.text}
            </div>
          </div>
        ))}

        {/* Calibration overlay */}
        {calibState === "calibrating" && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
            padding: "60px 28px 28px",
            background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.40) 55%, transparent 100%)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="animate-pulse" style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: "#3B82F6", boxShadow: "0 0 6px #3B82F6",
                  display: "inline-block",
                }} />
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500,
                  color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                  Sit naturally — look at the camera
                </span>
              </div>
              <div style={{ height: 2, borderRadius: 100,
                background: "rgba(255,255,255,0.08)", marginLeft: 13 }}>
                <div style={{
                  height: "100%", borderRadius: 100,
                  width: `${calibProg * 100}%`, background: "#3B82F6",
                  boxShadow: "0 0 8px rgba(59,130,246,0.6)",
                  transition: calibProg > 0 ? "width 0.25s linear" : "none",
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Recalibrate button */}
        {calibState === "done" && (
          <div style={{ position: "absolute", bottom: 20, left: 20, zIndex: 25 }}>
            <button onClick={resetCalibration} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: FONT, fontSize: 12, fontWeight: 500,
              color: "#BBBBBB", background: "rgba(0,0,0,0.70)",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.14)", borderRadius: 100,
              padding: "9px 18px", cursor: "pointer",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%",
                background: "#555", flexShrink: 0, display: "inline-block" }} />
              Recalibrate
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: "absolute", top: 14, left: "50%", zIndex: 30,
            transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 18px", borderRadius: 100, whiteSpace: "nowrap",
            background: "rgba(16,16,16,0.9)", backdropFilter: "blur(14px)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%",
              background: "#3B82F6", flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: 10, color: "#AAAAAA",
              letterSpacing: "0.09em", textTransform: "uppercase" }}>
              {toast}
            </span>
          </div>
        )}

        {/* Mode label */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 40, display: "flex", alignItems: "center", padding: "0 20px",
          background: "linear-gradient(to top, rgba(0,0,0,0.60), transparent)",
          pointerEvents: "none",
        }}>
          <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888",
            letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Visual Mode
          </span>
        </div>
      </div>
    </>
  );
}
