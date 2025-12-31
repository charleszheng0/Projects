"use client";

import { useGameStore } from "@/store/game-store";
import { Badge } from "./ui/badge";
import { CheckCircle2 } from "lucide-react";

/**
 * Indicator showing when custom range is active
 */
export function CustomRangeIndicator() {
  const { useCustomRange, customRange } = useGameStore();
  
  if (!useCustomRange || customRange.size === 0) {
    return null;
  }
  
  return (
    <Badge 
      variant="secondary" 
      className="bg-green-900/50 text-green-300 border border-green-700/50 flex items-center gap-1.5 px-3 py-1.5"
      title={`Custom range active: ${customRange.size} hands selected`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">
        Range: {customRange.size} hands
      </span>
    </Badge>
  );
}


