"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import FaceMeshCamera from "./FaceMeshCamera";
import type { FaceLandmark, PoseLandmark, OverlayMode } from "./FaceMeshCamera";
import type { CrossValidationResult } from "@/lib/crossValidation";
import {
  computeVisionScores,
  extractCalibFrame,
  buildBaseline,
  loadVisionBaseline,
  saveVisionBaseline,
  clearVisionBaseline,
  type VisionBaseline,
  type VisionBreakdown,
  type Pt,
} from "@/lib/visionScoring";
import { RollingBuffer } from "@/lib/rollingAverage";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT   = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const ACCENT = "#FF4D4D";

const CALIB_DURATION_MS   = 3500;
const CALIB_FRAMES_NEEDED = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveTrackerProps {
  insight?: CrossValidationResult | null;
  onVisionScores?: (confidence: number, friendliness: number) => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({
  score, label, hasData, size = 130, accent = ACCENT,
}: {
  score: number; label: string; hasData: boolean; size?: number; accent?: string;
}) {
  const r    = size * 0.42;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.round(score);
  const fill = circ * Math.min(score / 100, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          {hasData && (
            <circle cx={cx} cy={cy} r={r} fill="none"
              stroke={accent} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${fill} ${circ - fill}`}
              style={{
                transition: "stroke-dasharray 0.45s ease",
                filter: `drop-shadow(0 0 8px ${accent}80)`,
              }} />
          )}
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: FONT,
            fontSize: size * 0.30,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-2px",
            color: hasData ? "#FFFFFF" : "#232323",
            fontVariantNumeric: "tabular-nums",
          }}>
            {hasData ? pct : "—"}
          </span>
        </div>
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 400,
        color: "#999999", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}

function MetricBar({ label, score, hasData }: { label: string; score: number; hasData: boolean }) {
  const pct  = Math.round(score * 100);
  const good = pct >= 55;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 300,
        color: "#999999", minWidth: 108, flexShrink: 0, letterSpacing: "0.01em",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, borderRadius: 100,
        background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: hasData ? `${pct}%` : "0%",
          borderRadius: 100,
          background: good ? "rgba(255,255,255,0.42)" : ACCENT,
          boxShadow: good ? "none" : `0 0 5px rgba(255,77,77,0.35)`,
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
        color: hasData ? (good ? "#FFFFFF" : ACCENT) : "#232323",
        minWidth: 26, textAlign: "right", flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}>
        {hasData ? pct : "—"}
      </span>
    </div>
  );
}

function InsightCard({ insight }: { insight: CrossValidationResult }) {
  const { headline, description, color, visionScore, speechScore } = insight;
  const isCalibrating = insight.insight === "Calibrating";
  return (
    <div style={{
      borderRadius: 12, padding: "14px 16px",
      background: `${color}12`, border: `1px solid ${color}28`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: isCalibrating ? "#444" : color,
          flexShrink: 0, display: "inline-block",
          boxShadow: isCalibrating ? "none" : `0 0 6px ${color}`,
        }} />
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
          color: isCalibrating ? "#999" : color,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          {headline}
        </span>
        {!isCalibrating && (
          <span style={{
            marginLeft: "auto", fontFamily: FONT, fontSize: 10,
            color: "#888888", letterSpacing: "0.04em",
          }}>
            V{Math.round(visionScore)} · S{Math.round(speechScore)}
          </span>
        )}
      </div>
      <p style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 300,
        color: "#AAAAAA", lineHeight: 1.55, margin: 0,
      }}>
        {description}
      </p>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function LiveTracker({ insight, onVisionScores }: LiveTrackerProps) {
  const [confidence,   setConfidence]   = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [breakdown,    setBreakdown]    = useState<VisionBreakdown | null>(null);
  const [hasData,      setHasData]      = useState(false);
  const [overlayMode,  setOverlay]      = useState<OverlayMode>("contour");
  const [calibState,   setCalibState]   = useState<"calibrating" | "done">("calibrating");
  const [calibProgress,setCalibProgress]= useState(0);
  const [toast,        setToast]        = useState<string | null>(null);

  // Refs (avoid stale closures in MediaPipe callbacks)
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
  const onVisionRef      = useRef(onVisionScores);

  useEffect(() => { onVisionRef.current = onVisionScores; }, [onVisionScores]);

  // Load saved baseline on mount
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

  function trimHistory(ref: React.MutableRefObject<Pt[][]>, max: number) {
    if (ref.current.length > max) ref.current = ref.current.slice(-max);
  }

  const handleFaceLandmarks = useCallback((landmarks: FaceLandmark[]) => {
    const face = landmarks as Pt[];

    // Maintain rolling histories
    hist3sRef.current.push(face);
    hist5sRef.current.push(face);
    trimHistory(hist3sRef, 90);   // ~3 s @ 30 fps
    trimHistory(hist5sRef, 150);  // ~5 s @ 30 fps

    // ── Calibration ─────────────────────────────────────────────────────────
    if (calibStateRef.current === "calibrating") {
      calibFramesRef.current.push(extractCalibFrame(face));
      if (calibFramesRef.current.length > 60) calibFramesRef.current.shift();

      const noseTip = face[4];
      if (noseTip) {
        noseTipYsRef.current.push(noseTip.y);
        if (noseTipYsRef.current.length > 90) noseTipYsRef.current.shift();
      }

      // Iris gaze deviation
      const lIris = face[468], rIris = face[473];
      const lOut  = face[33],  lIn   = face[133];
      const rOut  = face[263], rIn   = face[362];
      if (lIris && rIris && lOut && lIn && rOut && rIn) {
        const lW  = Math.abs(lOut.x - lIn.x)  || 0.01;
        const rW  = Math.abs(rOut.x - rIn.x)  || 0.01;
        const lDx = (lIris.x - Math.min(lOut.x, lIn.x)) / lW - 0.5;
        const rDx = (rIris.x - Math.min(rOut.x, rIn.x)) / rW - 0.5;
        irisDevsRef.current.push((Math.abs(lDx) + Math.abs(rDx)) / 2);
        if (irisDevsRef.current.length > 90) irisDevsRef.current.shift();
      }

      if (calibFramesRef.current.length >= CALIB_FRAMES_NEEDED) {
        const nys   = noseTipYsRef.current;
        const nMean = nys.reduce((a, b) => a + b, 0) / (nys.length || 1);
        const nVar  = nys.reduce((a, b) => a + (b - nMean) ** 2, 0) / (nys.length || 1);

        if (nVar < 2.5e-5) {
          if (!calibStartRef.current) calibStartRef.current = Date.now();
          const elapsed = Date.now() - calibStartRef.current;
          setCalibProgress(Math.min(elapsed / CALIB_DURATION_MS, 1));

          if (elapsed >= CALIB_DURATION_MS) {
            const irisAvg = irisDevsRef.current.reduce((a, b) => a + b, 0) /
                            (irisDevsRef.current.length || 1);
            const bl = buildBaseline(calibFramesRef.current, nVar, irisAvg);
            baselineRef.current   = bl;
            calibStateRef.current = "done";
            setCalibState("done");
            saveVisionBaseline(bl);
            setCalibProgress(1);
            showToast("Calibrated to your face");
          }
        } else {
          calibStartRef.current = null;
          setCalibProgress(0);
        }
      }
    }

    // ── Vision scoring (runs every frame, displayed as 3-second rolling avg) ─
    const scores = computeVisionScores(
      face,
      hist3sRef.current,
      hist5sRef.current,
      baselineRef.current,
    );

    confRollRef.current.push(scores.confidence);
    friendRollRef.current.push(scores.friendliness);

    const smoothConf   = confRollRef.current.average();
    const smoothFriend = friendRollRef.current.average();

    setConfidence(smoothConf);
    setFriendliness(smoothFriend);
    setBreakdown(scores.breakdown);
    setHasData(true);

    onVisionRef.current?.(smoothConf, smoothFriend);
  }, []);

  const handlePoseLandmarks = useCallback((_: PoseLandmark[]) => {
    // Reserved — pose could feed shoulder-posture signals in a future metric
  }, []);

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
    confRollRef.current.clear();
    friendRollRef.current.clear();
    setCalibState("calibrating");
    setCalibProgress(0);
    setHasData(false);
    setConfidence(0);
    setFriendliness(0);
    setBreakdown(null);
  }

  const METRIC_LABELS: Array<[keyof VisionBreakdown, string]> = [
    ["gaze",           "Gaze / Eye Contact"],
    ["microExpr",      "Micro-expression"],
    ["browTension",    "Brow Tension"],
    ["lipCompression", "Lip Compression"],
    ["fidget",         "Stillness"],
    ["headPosition",   "Head Position"],
    ["duchenneSmile",  "Genuine Smile"],
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#000000" }}>

      {/* ── Video panel ─────────────────────────────────────────────────── */}
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
            const labels: Record<OverlayMode, string> = {
              contour: "Contour", dots: "Dots", skeleton: "Pose", none: "Off",
            };
            const active = overlayMode === om;
            return (
              <button key={om} onClick={() => setOverlay(om)} style={{
                fontFamily: FONT, fontSize: 10, letterSpacing: "0.06em",
                textTransform: "uppercase", fontWeight: active ? 600 : 400,
                color: active ? "#FFFFFF" : "#555555",
                background: active ? "rgba(255,255,255,0.10)" : "transparent",
                border: "none", borderRadius: 7, padding: "4px 10px",
                cursor: "pointer", transition: "all 0.15s ease",
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
            padding: "72px 32px 32px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="animate-pulse" style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: ACCENT, boxShadow: `0 0 7px ${ACCENT}`,
                  display: "inline-block",
                }} />
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500,
                  color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                  Sit naturally — look at the camera
                </span>
              </div>
              <div style={{ height: 2, borderRadius: 100,
                background: "rgba(255,255,255,0.08)", marginLeft: 16 }}>
                <div style={{
                  height: "100%", borderRadius: 100,
                  width: `${calibProgress * 100}%`, background: ACCENT,
                  boxShadow: `0 0 8px rgba(255,77,77,0.5)`,
                  transition: calibProgress > 0 ? "width 0.25s linear" : "none",
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
            <span style={{ width: 5, height: 5, borderRadius: "50%",
              background: ACCENT, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: 10, color: "#AAAAAA",
              letterSpacing: "0.09em", textTransform: "uppercase" }}>
              {toast}
            </span>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 22px",
          background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
          pointerEvents: "none",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%",
            background: ACCENT, boxShadow: `0 0 6px rgba(255,77,77,0.8)`, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888",
            letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Live Vision
          </span>
          <div style={{ flex: 1 }} />
          {hasData && breakdown && (
            <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888",
              letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {Object.values(breakdown).filter(v => v >= 0.55).length}/
              {METRIC_LABELS.length} signals passing
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
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%",
                background: "#555555", flexShrink: 0, display: "inline-block" }} />
              Recalibrate
            </button>
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, width: "30%",
        padding: "14px 16px 14px 0",
        display: "flex",
      }}>
        <div style={{
          flex: 1, borderRadius: 20, background: "#141414",
          display: "flex", flexDirection: "column",
          padding: "22px 20px 18px",
          overflow: "hidden",
        }}>

          {/* Score rings */}
          <div style={{ display: "flex", justifyContent: "space-around",
            alignItems: "center", marginBottom: 26 }}>
            <ScoreRing score={confidence}   label="Confidence"   hasData={hasData}
              size={120} accent={ACCENT} />
            <div style={{ width: 1, height: 55, background: "rgba(255,255,255,0.05)" }} />
            <ScoreRing score={friendliness} label="Friendliness" hasData={hasData}
              size={120} accent="#3B82F6" />
          </div>

          {/* 7 metric bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {METRIC_LABELS.map(([key, label]) => (
              <MetricBar
                key={key}
                label={label}
                score={breakdown ? breakdown[key] : 0}
                hasData={hasData}
              />
            ))}
          </div>

          {/* Cross-validation insight */}
          {insight ? (
            <InsightCard insight={insight} />
          ) : (
            <div style={{
              borderRadius: 12, padding: "13px 15px",
              background: "rgba(255,255,255,0.018)",
              border: "1px solid rgba(255,255,255,0.045)",
            }}>
              <span style={{ fontFamily: FONT, fontSize: 10, color: "#777777",
                letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Insight — speak to activate
              </span>
            </div>
          )}

          {/* Calibration footer */}
          {calibState === "calibrating" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <span className="animate-pulse" style={{
                width: 5, height: 5, borderRadius: "50%",
                background: ACCENT, flexShrink: 0, display: "inline-block",
              }} />
              <span style={{ fontFamily: FONT, fontSize: 10, color: "#888888",
                letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {calibProgress > 0
                  ? `Hold still · ${Math.round(calibProgress * 100)}%`
                  : "Calibrating baseline"}
              </span>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
