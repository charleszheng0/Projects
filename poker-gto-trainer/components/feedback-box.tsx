"use client";

import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { calculateEVLoss, formatEV, getEVColorClass } from "@/lib/ev-calculator";

export function FeedbackBox() {
  const { 
    feedback, 
    isCorrect, 
    lastAction, 
    playerHand, 
    communityCards, 
    gameStage, 
    pot, 
    currentBet, 
    optimalActions,
    betSizeBB,
    numPlayers,
    handEV // Use handEV from store (calculated per action, reset per hand)
  } = useGameStore();

  // Use handEV from store (already calculated and tracked per hand)
  const evLoss: number | null = handEV !== 0 ? handEV : null;

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
    <Card className={`p-6 border-2 ${
      isCorrect 
        ? "bg-green-900/20 border-green-600/50" 
        : "bg-red-900/20 border-red-600/50"
    }`}>
      <div className="flex items-start gap-4">
        {isCorrect ? (
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
        ) : (
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge
              variant={isCorrect ? "default" : "destructive"}
              className={
                isCorrect
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }
            >
              {isCorrect ? "✓ Correct" : "✗ Incorrect"}
            </Badge>
            {lastAction && (
              <Badge variant="outline" className="text-gray-300 border-gray-600 bg-gray-800/50">
                Your Action: {lastAction}
              </Badge>
            )}
            {optimalActions.length > 0 && (
              <Badge variant="outline" className="text-green-300 border-green-600 bg-green-900/20">
                Optimal: {optimalActions.join(", ")}
              </Badge>
            )}
            {evLoss !== null && evLoss > 0 && (
              <Badge variant="outline" className="text-red-400 border-red-600 bg-red-900/20">
                EV Loss: {formatEV(evLoss)}
              </Badge>
            )}
            {evLoss !== null && evLoss === 0 && (
              <Badge variant="outline" className="text-green-400 border-green-600 bg-green-900/20">
                Optimal EV
              </Badge>
            )}
          </div>
          <p className={`text-base leading-relaxed ${
            isCorrect ? "text-green-100" : "text-red-100"
          }`}>
            {feedback}
          </p>
          {evLoss !== null && evLoss > 0 && (
            <p className="text-red-300 text-sm mt-3 font-medium">
              ⚠ Expected Value Loss: {formatEV(evLoss)} compared to optimal play
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

