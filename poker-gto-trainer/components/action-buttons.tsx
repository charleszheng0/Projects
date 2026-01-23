"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";

export function ActionButtons() {
  const { playerHand, gameStage, actionToFace, isPlayerTurn, currentBet, selectAction, optimalActions, isCorrect } = useGameStore();

  if (!playerHand || !isPlayerTurn) {
    return null;
  }

  const isPreflop = gameStage === "preflop";
  // Always show all available actions - let GTO feedback tell user if it's correct
  // Check is available post-flop when no bet to face
  const canCheck = !isPreflop && (actionToFace === "check" || actionToFace === null);
  // Bet is available post-flop when no bet to face
  const canBet = !isPreflop && (actionToFace === "check" || actionToFace === null);
  // Call is available when facing a bet or in preflop with BB to call
  const canCall = actionToFace === "bet" || actionToFace === "raise" || (isPreflop && currentBet > 0);
  // Fold is only available when facing a bet (can't fold when you can check)
  const canFold = !canCheck && (isPreflop || actionToFace === "bet" || actionToFace === "raise");
  // Raise is always available (preflop or when facing a bet)

  const getActionStatus = (action: Action | BettingAction) => {
    if (isCorrect === null) return null;
    const actionStr = action as string;
    return optimalActions.includes(actionStr as Action) ? "correct" : "incorrect";
  };

  return (
    <div className="flex gap-4 justify-center items-center flex-wrap">
      {/* Fold is only available when facing a bet (not when you can check) */}
      {canFold && (
        <Button
          variant="destructive"
          size="lg"
          onClick={() => selectAction("fold")}
          className={`bg-gray-700 hover:bg-gray-800 text-white px-8 py-6 text-lg font-semibold relative ${
            getActionStatus("fold") === "correct" ? "ring-2 ring-green-500 shadow-lg shadow-green-500/50" :
            getActionStatus("fold") === "incorrect" ? "ring-2 ring-red-500" : ""
          }`}
        >
          Fold
          {getActionStatus("fold") === "correct" && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</span>
          )}
        </Button>
      )}
      
      {/* Always show Check button post-flop when it's a valid action */}
      {canCheck && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => selectAction("check")}
          className={`bg-gray-600 hover:bg-gray-700 text-white px-8 py-6 text-lg font-semibold relative ${
            getActionStatus("check") === "correct" ? "ring-2 ring-green-500 shadow-lg shadow-green-500/50" :
            getActionStatus("check") === "incorrect" ? "ring-2 ring-red-500" : ""
          }`}
        >
          Check
          {getActionStatus("check") === "correct" && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</span>
          )}
        </Button>
      )}
      
      {/* Always show Call button when facing a bet */}
      {canCall && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => selectAction("call")}
          className={`bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-6 text-lg font-semibold relative ${
            getActionStatus("call") === "correct" ? "ring-2 ring-green-500 shadow-lg shadow-green-500/50" :
            getActionStatus("call") === "incorrect" ? "ring-2 ring-red-500" : ""
          }`}
        >
          Call {currentBet > 0 ? `(${currentBet} BB)` : ""}
          {getActionStatus("call") === "correct" && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</span>
          )}
        </Button>
      )}
      
      {/* Always show Bet button post-flop when it's a valid action - don't hide based on GTO */}
      {canBet && (
        <Button
          variant="default"
          size="lg"
          onClick={() => selectAction("bet")}
          className={`bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold relative ${
            getActionStatus("bet") === "correct" ? "ring-2 ring-green-500 shadow-lg shadow-green-500/50" :
            getActionStatus("bet") === "incorrect" ? "ring-2 ring-red-500" : ""
          }`}
        >
          Bet
          {getActionStatus("bet") === "correct" && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</span>
          )}
        </Button>
      )}
      
      {/* Always show Raise button - available preflop or when facing a bet */}
      {(isPreflop || canCall) && (
        <Button
          variant="outline"
          size="lg"
          onClick={() => selectAction("raise")}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold border-2 relative ${
            getActionStatus("raise") === "correct" ? "ring-2 ring-green-500 shadow-lg shadow-green-500/50" :
            getActionStatus("raise") === "incorrect" ? "ring-2 ring-red-500" : ""
          }`}
        >
          {isPreflop ? "Raise" : "Raise"}
          {getActionStatus("raise") === "correct" && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</span>
          )}
        </Button>
      )}
    </div>
  );
}
