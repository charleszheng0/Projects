"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";

export function ActionButtons() {
  const { playerHand, gameStage, actionToFace, isPlayerTurn, currentBet, selectAction } = useGameStore();

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
  // Raise is always available (preflop or when facing a bet)

  return (
    <div className="flex gap-4 justify-center items-center flex-wrap">
      <Button
        variant="destructive"
        size="lg"
        onClick={() => selectAction("fold")}
        className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-semibold"
      >
        Fold
      </Button>
      
      {/* Always show Check button post-flop when it's a valid action */}
      {canCheck && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => selectAction("check")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-6 text-lg font-semibold"
        >
          Check
        </Button>
      )}
      
      {/* Always show Call button when facing a bet */}
      {canCall && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => selectAction("call")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
        >
          Call {currentBet > 0 ? `(${currentBet} BB)` : ""}
        </Button>
      )}
      
      {/* Always show Bet button post-flop when it's a valid action - don't hide based on GTO */}
      {canBet && (
        <Button
          variant="default"
          size="lg"
          onClick={() => selectAction("bet")}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold"
        >
          Bet
        </Button>
      )}
      
      {/* Always show Raise button - available preflop or when facing a bet */}
      {(isPreflop || canCall) && (
        <Button
          variant="outline"
          size="lg"
          onClick={() => selectAction("raise")}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-6 text-lg font-semibold border-2"
        >
          {isPreflop ? "Raise" : "Raise"}
        </Button>
      )}
    </div>
  );
}
