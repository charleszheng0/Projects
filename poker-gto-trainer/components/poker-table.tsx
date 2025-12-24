"use client";

import { useGameStore } from "@/store/game-store";
import { PokerCard } from "./poker-card";
import { Badge } from "./ui/badge";

export function PokerTable() {
  const { playerHand, numPlayers, playerPosition, playerStackBB, playerStacksBB, pot, bigBlind } = useGameStore();

  // Create array of player positions around the table
  const playerPositions = Array.from({ length: numPlayers }, (_, i) => i);

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[16/10]">
      {/* Table surface */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-800 to-green-900 border-8 border-gray-800 shadow-2xl">
        {/* Inner table border */}
        <div className="absolute inset-4 rounded-full border-2 border-green-700/50"></div>
        
        {/* Center area for pot and community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          {/* Pot display */}
          <div className="bg-green-700/80 rounded-full px-6 py-2 border-2 border-yellow-400">
            <div className="text-yellow-300 text-xs font-semibold">Total Pot</div>
            <div className="text-yellow-200 text-xl font-bold">{pot} BB</div>
          </div>

          {/* Player hand display */}
          {playerHand && (
            <div className="flex gap-2">
              <PokerCard card={playerHand.card1} size="md" />
              <PokerCard card={playerHand.card2} size="md" />
            </div>
          )}

          {/* Position badge */}
          <Badge variant="secondary" className="bg-gray-800 text-white">
            Position: {playerPosition}
          </Badge>
        </div>

        {/* Player positions around the table */}
        {playerPositions.map((seat, index) => {
          const angle = (index / numPlayers) * 2 * Math.PI - Math.PI / 2;
          const radius = 0.35;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          const isPlayerSeat = seat === 0; // Assuming seat 0 is the player
          const stackBB = playerStacksBB[seat] || 100;

          return (
            <div
              key={seat}
              className="absolute"
              style={{
                left: `${50 + x * 100}%`,
                top: `${50 + y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {isPlayerSeat ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-gray-800 rounded-lg px-3 py-1 border-2 border-yellow-400">
                    <div className="text-white text-xs font-semibold">You</div>
                    <div className="text-yellow-300 text-xs">{playerStackBB} BB</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-gray-800/60 rounded-lg px-3 py-1 border border-gray-600">
                    <div className="text-gray-300 text-xs">Player {seat + 1}</div>
                    <div className="text-gray-400 text-xs">{stackBB} BB</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

