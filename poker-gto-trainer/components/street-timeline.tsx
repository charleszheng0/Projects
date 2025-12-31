"use client";

import { GameStage } from "@/lib/postflop-gto";
import { cn } from "@/lib/utils";

interface StreetTimelineProps {
  currentStage: GameStage;
  className?: string;
}

const streets = [
  { stage: "preflop" as GameStage, label: "Preflop", icon: "🂠" },
  { stage: "flop" as GameStage, label: "Flop", icon: "🃏" },
  { stage: "turn" as GameStage, label: "Turn", icon: "🃍" },
  { stage: "river" as GameStage, label: "River", icon: "🃎" },
];

export function StreetTimeline({ currentStage, className }: StreetTimelineProps) {
  const currentIndex = streets.findIndex(s => s.stage === currentStage);
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {streets.map((street, index) => {
        const isActive = street.stage === currentStage;
        const isCompleted = index < currentIndex;
        
        return (
          <div key={street.stage} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110"
                    : isCompleted
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-400"
                )}
              >
                {street.icon}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isActive ? "text-blue-300" : isCompleted ? "text-green-300" : "text-gray-500"
                )}
              >
                {street.label}
              </span>
            </div>
            {index < streets.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-all",
                  index < currentIndex ? "bg-green-600" : "bg-gray-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

