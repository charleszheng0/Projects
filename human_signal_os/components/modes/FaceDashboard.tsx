"use client";

import { useState } from "react";
import FaceMeshCamera from "@/components/FaceMeshCamera";
import Sidebar from "@/components/Sidebar";

/**
 * FaceDashboard — camera-first analytics view
 *
 * Left: full-height webcam canvas with MediaPipe FaceMesh dots overlay.
 *       Dot color interpolates green → red based on `confidenceScore`.
 * Right: 280px Sidebar showing Confidence Score ring, Dominant Emotion,
 *        and Bias Flags (placeholder values — wire up via props/state later).
 *
 * To drive the dashboard:
 *   - Set `confidenceScore` (0–1) from your scoring engine
 *   - Push BiasFlag objects into `biasFlags`
 *   - Set `dominantEmotion` from your emotion classifier
 */

interface BiasFlag {
  label: string;
  severity: "low" | "medium" | "high";
}

export default function FaceDashboard() {
  // ── Placeholder state — wire these up to your scoring engine ──────────────
  const [confidenceScore] = useState<number>(0);
  const [biasFlags] = useState<BiasFlag[]>([]);
  const [dominantEmotion] = useState<string>("Neutral");

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-app)",
      }}
    >
      {/* ── Camera pane ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        {/* Status bar overlay */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(8, 10, 15, 0.72)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 6px #10b981",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              letterSpacing: "0.12em",
              color: "var(--text-secondary)",
            }}
          >
            FACE MESH · 468 PTS · LIVE
          </span>
        </div>

        {/* Overlay mode badge */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(8, 10, 15, 0.72)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
            }}
          >
            DOTS
          </span>
        </div>

        <FaceMeshCamera
          confidenceScore={confidenceScore}
          overlayMode="dots"
        />
      </div>

      {/* ── Analytics sidebar ────────────────────────────────────────────────── */}
      <Sidebar
        confidenceScore={confidenceScore}
        biasFlags={biasFlags}
        dominantEmotion={dominantEmotion}
      />
    </div>
  );
}
