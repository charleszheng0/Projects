"use client";

import { useMemo } from "react";
import { Position, Hand } from "@/lib/gto";
import { getAdjustedGTOAction } from "@/lib/gto-table-size";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useGameStore } from "@/store/game-store";
import gtoRanges from "@/lib/gto-ranges.json";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

interface RangeVisualizerProps {
  position?: Position;
  numPlayers?: number;
  stackDepth?: number; // Stack depth in BB (e.g., 25bb, 100bb)
}

export function RangeVisualizer({
  position = "BTN",
  numPlayers = 6,
  stackDepth = 100,
}: RangeVisualizerProps) {
  const { playerPosition, playerStackBB, numPlayers: livePlayers } = useGameStore();
  const selectedPosition: Position = playerPosition || position;
  const selectedStackDepth = playerStackBB || stackDepth;
  const tablePlayers = livePlayers || numPlayers;

  // Build hand matrix with accurate GTO lookups using memoization
  const handMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { action: string; hand: string }>> = {};
    
    // Determine table size for GTO lookup
    const tableSize = selectedStackDepth <= 25 ? 2 : selectedStackDepth <= 50 ? 4 : tablePlayers;
    
    RANKS.forEach((rank1, i) => {
      RANKS.forEach((rank2, j) => {
        let hand: string;
        let handObj: Hand;
        
        if (i === j) {
          // Pair
          hand = `${rank1}${rank2}`;
          handObj = {
            card1: { rank: rank1, suit: "hearts" },
            card2: { rank: rank2, suit: "diamonds" },
          };
        } else if (i < j) {
          // Suited (higher rank first)
          hand = `${rank1}${rank2}s`;
          handObj = {
            card1: { rank: rank1, suit: "hearts" },
            card2: { rank: rank2, suit: "hearts" },
          };
        } else {
          // Offsuit (higher rank first, lower rank second)
          hand = `${rank1}${rank2}o`;
          handObj = {
            card1: { rank: rank1, suit: "hearts" },
            card2: { rank: rank2, suit: "diamonds" },
          };
        }
        
        // Look up GTO action using table-size-adjusted ranges
        try {
          const gtoResult = getAdjustedGTOAction(handObj, selectedPosition, tableSize, "call");
          const action = gtoResult.optimalActions[0] || "fold";
          
          if (!matrix[rank1]) matrix[rank1] = {};
          matrix[rank1][rank2] = { action, hand };
        } catch (error) {
          // Fallback to base ranges if lookup fails
          const positionRanges = gtoRanges[selectedPosition as keyof typeof gtoRanges] as Record<string, string> | undefined;
          const action = positionRanges?.[hand] || "fold";
          if (!matrix[rank1]) matrix[rank1] = {};
          matrix[rank1][rank2] = { action, hand };
        }
      });
    });
    
    return matrix;
  }, [selectedPosition, selectedStackDepth, numPlayers]);

  const getActionColor = (action: string): string => {
    if (action === "fold") return "bg-gray-800";
    if (action === "all-in") return "bg-[#C72C48]";
    if (action === "raise") return "bg-[#FFD700]";
    if (action === "call") return "bg-[#C72C48]/70";
    return "bg-gray-800";
  };

  const getActionLabel = (action: string): string => {
    if (action === "fold") return "";
    if (action === "all-in") return "A";
    if (action === "raise") return "R";
    if (action === "call") return "C";
    return "";
  };

  // Calculate range statistics
  const totalHands = RANKS.length * RANKS.length;
  let raiseHands = 0;
  let callHands = 0;
  let foldHands = 0;

  Object.values(handMatrix).forEach(row => {
    Object.values(row).forEach(cell => {
      if (cell.action === "raise" || cell.action === "all-in") raiseHands++;
      else if (cell.action === "call") callHands++;
      else foldHands++;
    });
  });

  const raisePercent = ((raiseHands / totalHands) * 100).toFixed(1);
  const callPercent = ((callHands / totalHands) * 100).toFixed(1);
  const foldPercent = ((foldHands / totalHands) * 100).toFixed(1);

  return (
    <Card className="p-6 bg-[#2e3a59]/60 border-[#3a3a3a]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Adaptive GTO Range Table</h2>
        <div className="text-xs text-gray-300">
          Position: {selectedPosition} · Stack: {Math.round(selectedStackDepth)} BB · Players: {tablePlayers}
        </div>
        {/* Range Statistics */}
        <div className="flex gap-4 mb-4">
          <Badge className="bg-[#FFD700] text-black">
            Raise: {raisePercent}%
          </Badge>
          <Badge className="bg-[#C72C48] text-white">
            Call: {callPercent}%
          </Badge>
          <Badge className="bg-gray-700 text-white">
            Fold: {foldPercent}%
          </Badge>
        </div>
      </div>

      {/* Hand Matrix */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex">
            <div className="w-16 h-8 flex items-center justify-center text-xs text-gray-400 font-semibold border border-gray-700">
              {/* Empty corner */}
            </div>
            {RANKS.map(rank => (
              <div
                key={rank}
                className="w-14 h-8 flex items-center justify-center text-xs text-gray-300 font-semibold border border-gray-700 bg-gray-900"
              >
                {rank}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {RANKS.map((rank1, i) => (
            <div key={rank1} className="flex">
              {/* Row Label */}
              <div className="w-16 h-14 flex items-center justify-center text-xs text-gray-300 font-semibold border border-gray-700 bg-gray-900">
                {rank1}
              </div>
              
              {/* Cells */}
              {RANKS.map((rank2, j) => {
                const cell = handMatrix[rank1]?.[rank2];
                if (!cell) return null;
                
                const isPair = i === j;
                const isSuited = i < j;
                const isOffsuit = i > j;
                
                return (
                  <div
                    key={`${rank1}-${rank2}`}
                    className={`w-14 h-14 flex items-center justify-center text-[9px] font-bold border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity ${getActionColor(cell.action)} ${
                      cell.action === "fold" ? "text-gray-500" : "text-black"
                    }`}
                    title={`${cell.hand} - ${cell.action}`}
                  >
                    {cell.action === "fold" ? "" : (
                      <span className="text-center leading-tight px-0.5">{getActionLabel(cell.action)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700 text-xs text-gray-400">
        <p>Pairs on diagonal, suited above, offsuit below.</p>
      </div>
    </Card>
  );
}

