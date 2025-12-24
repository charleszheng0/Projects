"use client";

import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

export function FeedbackBox() {
  const { feedback, isCorrect, lastAction } = useGameStore();

  if (!feedback) {
    return (
      <Card className="p-6 bg-gray-900 border-gray-700">
        <div className="text-gray-400 text-center">
          Take an action to receive GTO feedback
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gray-900 border-gray-700">
      <div className="flex items-start gap-4">
        {isCorrect ? (
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
        ) : (
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={isCorrect ? "default" : "destructive"}
              className={
                isCorrect
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }
            >
              {isCorrect ? "Correct" : "Incorrect"}
            </Badge>
            {lastAction && (
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                Your Action: {lastAction}
              </Badge>
            )}
          </div>
          <p className="text-white text-base leading-relaxed">{feedback}</p>
        </div>
      </div>
    </Card>
  );
}

