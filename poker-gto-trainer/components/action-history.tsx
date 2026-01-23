"use client";

import { useGameStore } from "@/store/game-store";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

export function ActionHistory() {
  const { actionHistory } = useGameStore();
  
  if (!actionHistory || actionHistory.length === 0) {
    return (
      <Card className="p-4 bg-gray-800/50 border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Action History</h3>
        <p className="text-gray-500 text-xs">No actions yet</p>
      </Card>
    );
  }
  
  return (
    <Card className="p-4 bg-gray-800/50 border-gray-700 max-h-32 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Action History</h3>
      <div className="space-y-1">
        {actionHistory.slice(-5).reverse().map((action, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <Badge 
              variant="outline" 
              className={
                action.player === "You" 
                  ? "bg-blue-900/30 text-blue-300 border-blue-600"
                  : "bg-gray-700 text-gray-300 border-gray-600"
              }
            >
              {action.player}
            </Badge>
            <span className="text-gray-400">{action.action}</span>
            {action.betSize && (
              <span className="text-yellow-400 font-semibold">{action.betSize} BB</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

