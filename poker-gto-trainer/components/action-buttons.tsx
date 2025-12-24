"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { Action } from "@/lib/gto";

export function ActionButtons() {
  const { playerHand, selectAction } = useGameStore();

  if (!playerHand) {
    return null;
  }

  return (
    <div className="flex gap-4 justify-center items-center">
      <Button
        variant="destructive"
        size="lg"
        onClick={() => selectAction("fold")}
        className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-semibold"
      >
        Fold
      </Button>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => selectAction("call")}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
      >
        Call
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => selectAction("raise")}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-6 text-lg font-semibold border-2"
      >
        Raise
      </Button>
    </div>
  );
}

