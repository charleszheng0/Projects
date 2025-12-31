"use client";

import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Info } from "lucide-react";

export function GTOHints() {
  const { optimalActions, explanation, postFlopExplanation, gameStage } = useGameStore();
  
  if (!optimalActions || optimalActions.length === 0) {
    return null;
  }
  
  const currentExplanation = gameStage === "preflop" ? explanation : postFlopExplanation;
  
  // Calculate frequency hints
  const getActionFrequency = (action: string) => {
    // This is a simplified version - in a real app, you'd get this from GTO solver data
    if (optimalActions.includes(action as any)) {
      if (optimalActions.length === 1) return "100%";
      if (optimalActions.length === 2) return "~50%";
      if (optimalActions.length === 3) return "~33%";
      return "~25%";
    }
    return "0%";
  };
  
  return (
    <Card className="p-4 bg-blue-900/20 border-blue-700/50">
      <div className="flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">GTO Hints</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-300 mb-1">Optimal Actions:</p>
              <div className="flex flex-wrap gap-2">
                {optimalActions.map((action) => (
                  <Badge
                    key={action}
                    variant="outline"
                    className="bg-green-900/30 text-green-300 border-green-600"
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)} ({getActionFrequency(action)})
                  </Badge>
                ))}
              </div>
            </div>
            {currentExplanation?.explanation && (
              <div className="mt-2 pt-2 border-t border-blue-700/50">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {currentExplanation.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

