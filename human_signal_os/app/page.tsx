"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

function ModeLoadingSpinner() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.1)",
        borderTopColor: "#3B82F6",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

const LiveSession = dynamic(() => import("@/components/modes/LiveSession"), {
  ssr: false,
  loading: () => <ModeLoadingSpinner />,
});

const VisualOnly = dynamic(() => import("@/components/modes/VisualOnly"), {
  ssr: false,
  loading: () => <ModeLoadingSpinner />,
});

const DeepAnalysis = dynamic(() => import("@/components/modes/DeepAnalysis"), {
  ssr: false,
  loading: () => <ModeLoadingSpinner />,
});

const FaceDashboard = dynamic(() => import("@/components/modes/FaceDashboard"), {
  ssr: false,
  loading: () => <ModeLoadingSpinner />,
});

type Mode = "deep" | "live" | "visual" | "dashboard";

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function Home() {
  const [mode, setMode] = useState<Mode>("live");

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "var(--bg-app)", overflow: "hidden", fontFamily: FONT,
    }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        height: 52, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="38" height="30" viewBox="0 0 38 30" fill="none">
            {/* Left bubble */}
            <rect x="0" y="6" width="21" height="15" rx="3.5" fill="white" opacity="0.65" />
            <path d="M5 21 L2.5 25.5 L9 21 Z" fill="white" opacity="0.65" />
            <circle cx="7.5" cy="13.5" r="2" fill="var(--bg-panel)" />
            <circle cx="13" cy="13.5" r="2" fill="var(--bg-panel)" />
            {/* Right bubble */}
            <rect x="15" y="0" width="23" height="17" rx="3.5" fill="white" />
            <path d="M30 17 L35 23 L25 17 Z" fill="white" />
            <circle cx="23" cy="8.5" r="2" fill="var(--bg-panel)" />
            <circle cx="29.5" cy="8.5" r="2" fill="var(--bg-panel)" />
          </svg>
          <div>
            <div style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1 }}>
              Inflect
            </div>
            <div style={{ color: "#777777", fontWeight: 300, fontSize: 11, letterSpacing: "0.06em", marginTop: 3, lineHeight: 1 }}>
              Know how you sound before they do.
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <nav style={{
          display: "flex", alignItems: "center", gap: 1,
          padding: 4, borderRadius: 12,
          background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
        }}>
          <ModeBtn active={mode === "deep"} onClick={() => setMode("deep")}>
            <DeepIcon /> Deep Analysis
          </ModeBtn>
          <ModeBtn active={mode === "live"} onClick={() => setMode("live")}>
            <LiveIcon /> Live Session
          </ModeBtn>
          <ModeBtn active={mode === "visual"} onClick={() => setMode("visual")}>
            <VisualIcon /> Visual
          </ModeBtn>
          <ModeBtn active={mode === "dashboard"} onClick={() => setMode("dashboard")}>
            <DashboardIcon /> Face Dashboard
          </ModeBtn>
        </nav>

        {/* Online indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
          <span style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
            ONLINE
          </span>
        </div>
      </header>

      {/* ── Mode content ────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minHeight: 0 }}>
        {mode === "deep"      && <DeepAnalysis />}
        {mode === "live"      && <LiveSession />}
        {mode === "visual"    && <VisualOnly />}
        {mode === "dashboard" && <FaceDashboard />}
      </main>
    </div>
  );
}

function ModeBtn({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 9,
        fontSize: 12, fontWeight: 600, letterSpacing: "0.01em",
        fontFamily: FONT,
        background: active ? "#3B82F6" : "transparent",
        color: active ? "#FFFFFF" : "#888888",
        border: "none", cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

function DeepIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 4.5L8.5 6L4.5 7.5V4.5Z" fill="currentColor" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6" cy="6" r="1.8" fill="currentColor" />
    </svg>
  );
}

function VisualIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 6C2.5 3 9.5 3 11 6C9.5 9 2.5 9 1 6Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="6.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
