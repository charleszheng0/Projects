"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SpeechAnalysis from "@/components/SpeechAnalysis";

// LiveTracker contains the webcam — load only on client
const LiveTracker = dynamic(() => import("@/components/LiveTracker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border-default)", borderTopColor: "var(--blue)" }}
        />
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          Loading…
        </span>
      </div>
    </div>
  ),
});

type Tab = "live" | "speech";

export default function Home() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div
      className="flex flex-col"
      style={{ height: "100vh", background: "var(--bg-app)", overflow: "hidden" }}
    >
      {/* ── App header ───────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 shrink-0"
        style={{
          height: 52,
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--blue) 0%, var(--purple) 100%)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" fill="white" />
              <path
                d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div
              className="text-base font-bold leading-none tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Inflect
            </div>
            <div
              className="text-xs leading-none mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Know how you sound before they do.
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <TabBtn active={tab === "live"} onClick={() => setTab("live")}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              className="shrink-0"
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
            </svg>
            Live Tracker
          </TabBtn>
          <TabBtn active={tab === "speech"} onClick={() => setTab("speech")}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M6.5 1.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-4 0V3.5a2 2 0 0 1 2-2z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M2.5 6.5a4 4 0 0 0 8 0"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <path
                d="M6.5 10.5v1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Speech Analysis
          </TabBtn>
        </nav>

        {/* System status */}
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "var(--green)" }}
          />
          <span
            className="text-xs font-mono tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            ONLINE
          </span>
        </div>
      </header>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0">
        {/* Keep LiveTracker mounted but hidden so camera doesn't restart on tab switch */}
        <div className="h-full" style={{ display: tab === "live" ? "block" : "none" }}>
          <LiveTracker />
        </div>
        {tab === "speech" && (
          <div className="h-full">
            <SpeechAnalysis />
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: active ? "var(--blue)" : "transparent",
        color: active ? "white" : "var(--text-secondary)",
        border: active ? "none" : "1px solid transparent",
        boxShadow: active ? "0 2px 8px rgba(59,130,246,0.25)" : "none",
      }}
    >
      {children}
    </button>
  );
}
