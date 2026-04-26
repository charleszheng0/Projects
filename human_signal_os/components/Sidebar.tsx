"use client";

interface BiasFlag {
  label: string;
  severity: "low" | "medium" | "high";
}

interface SidebarProps {
  confidenceScore: number; // 0–1
  biasFlags: BiasFlag[];
  dominantEmotion: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "#ffab00",
  medium: "#ff6d00",
  high: "#ff1744",
};

/** Interpolate hex color between green (#00e676) and red (#ff1744) */
function scoreToHex(score: number): string {
  const clamped = Math.max(0, Math.min(1, score));
  const r = Math.round(255 * (1 - clamped));
  const g = Math.round(230 * clamped);
  return `rgb(${r + Math.round(0 * (1 - clamped))},${g},${Math.round(118 * clamped)})`;
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const dash = circ * score;
  const color = scoreToHex(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="#1a1d24"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>
            {pct}
          </span>
          <span className="text-xs" style={{ color: "#4a4f5e" }}>/ 100</span>
        </div>
      </div>
      <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "#8b90a0" }}>
        Confidence
      </span>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className="text-xs font-mono tracking-widest uppercase"
        style={{ color: "#4a4f5e" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "#2a2d36" }} />
    </div>
  );
}

export default function Sidebar({
  confidenceScore,
  biasFlags,
  dominantEmotion,
}: SidebarProps) {
  return (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: "280px",
        minWidth: "280px",
        background: "#111318",
        borderLeft: "1px solid #2a2d36",
        padding: "24px 20px",
        gap: "28px",
      }}
    >
      {/* Header */}
      <div>
        <p className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: "#4a4f5e" }}>
          Inflect
        </p>
        <h1 className="text-base font-semibold tracking-tight" style={{ color: "#e8eaf0" }}>
          Face Analytics
        </h1>
      </div>

      {/* Confidence Score */}
      <div>
        <SectionHeader label="Confidence Score" />
        <div className="flex justify-center">
          <ScoreRing score={confidenceScore} />
        </div>
      </div>

      {/* Dominant Emotion */}
      <div>
        <SectionHeader label="Dominant Emotion" />
        <div
          className="flex items-center justify-between rounded-lg px-4 py-3"
          style={{ background: "#1a1d24", border: "1px solid #2a2d36" }}
        >
          <span className="text-sm font-medium" style={{ color: "#e8eaf0" }}>
            {dominantEmotion}
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              background: "#0a0c10",
              color: "#8b90a0",
              border: "1px solid #2a2d36",
            }}
          >
            DETECTED
          </span>
        </div>
      </div>

      {/* Bias Flags */}
      <div className="flex-1">
        <SectionHeader label="Bias Flags" />
        {biasFlags.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg py-8"
            style={{
              background: "#1a1d24",
              border: "1px dashed #2a2d36",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#2a2d36" strokeWidth="1.5" />
              <path d="M10 6v4M10 13v1" stroke="#4a4f5e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-xs" style={{ color: "#4a4f5e" }}>
              No flags detected
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {biasFlags.map((flag, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{
                  background: "#1a1d24",
                  border: `1px solid ${SEVERITY_COLOR[flag.severity]}33`,
                }}
              >
                <span className="text-sm" style={{ color: "#e8eaf0" }}>
                  {flag.label}
                </span>
                <span
                  className="text-xs font-mono uppercase px-1.5 py-0.5 rounded"
                  style={{
                    color: SEVERITY_COLOR[flag.severity],
                    background: `${SEVERITY_COLOR[flag.severity]}18`,
                  }}
                >
                  {flag.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="pt-4 flex items-center gap-2"
        style={{ borderTop: "1px solid #2a2d36" }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-mono" style={{ color: "#4a4f5e" }}>
          Face analytics active
        </span>
      </div>
    </aside>
  );
}
