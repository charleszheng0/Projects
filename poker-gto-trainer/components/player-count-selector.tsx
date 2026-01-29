"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";

export function PlayerCountSelector() {
  const { numPlayers, isRandomPlayers, setNumPlayers, setRandomPlayers } = useGameStore();

  const playerCounts = [2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Number of Players
      </span>
      <div className="flex flex-wrap gap-1">
        {playerCounts.map((count) => (
          <Button
            key={count}
            variant={!isRandomPlayers && numPlayers === count ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setRandomPlayers(false);
              setNumPlayers(count);
            }}
            disabled={isRandomPlayers}
            className={
              !isRandomPlayers && numPlayers === count
                ? "bg-amber-500 hover:bg-amber-400 text-black"
                : "border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            }
          >
            {count}
          </Button>
        ))}
        <Button
          variant={isRandomPlayers ? "default" : "outline"}
          size="sm"
          onClick={() => setRandomPlayers(true)}
          className={
            isRandomPlayers
              ? "bg-amber-500 hover:bg-amber-400 text-black"
              : "border-gray-700 text-gray-300 hover:bg-gray-800"
          }
        >
          Random
        </Button>
      </div>
    </div>
  );
}

