"use client";

import { useEffect, useState } from "react";

interface ActionIndicatorProps {
  isActive: boolean;
  seat: number;
  action?: "fold" | "call" | "raise" | "bet" | "check";
  betSize?: number;
}

/**
 * Action Indicator - Shows whose turn it is with a subtle glow
 */
export function ActionIndicator({ isActive, seat, action, betSize }: ActionIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div 
      className={`absolute inset-0 rounded-lg border-2 transition-all duration-300 ${
        isAnimating 
          ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)] ring-2 ring-yellow-400/50" 
          : "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] ring-2 ring-yellow-400/50"
      }`}
      style={{
        animation: isAnimating ? "pulse 0.3s ease-in-out" : "none",
      }}
    />
  );
}

