"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";

export function ActionButtons() {
  const { playerHand, gameStage, actionToFace, isPlayerTurn, selectAction } = useGameStore();

  if (!playerHand || !isPlayerTurn) {
    return null;
  }

  const isPreflop = gameStage === "preflop";
  const canCheck = !isPreflop && (actionToFace === "check" || actionToFace === null);
  const canBet = !isPreflop && (actionToFace === "check" || actionToFace === null);
  const canCall = actionToFace === "bet" || actionToFace === "raise";

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
      
      {canCall && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => selectAction("call")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
        >
          Call
        </Button>
      )}
      
      {isPreflop && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => selectAction("call")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
        >
          Call
        </Button>
      )}
      
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

