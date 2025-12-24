"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function PlayerCountSelector() {
  const { numPlayers, isRandomPlayers, setNumPlayers, setRandomPlayers } = useGameStore();

  const playerCounts = [2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <Card className="p-4 bg-gray-800/50 border-gray-700">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-gray-300 text-center">
          Number of Players
        </label>
        <div className="flex flex-wrap gap-2 justify-center">
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
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
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
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "border-gray-600 text-gray-300 hover:bg-gray-800"
            }
          >
            Random
          </Button>
        </div>
        {isRandomPlayers && (
          <p className="text-xs text-gray-400 text-center mt-1">
            Player count will be random (2-9) for each hand
          </p>
        )}
      </div>
    </Card>
  );
}

