"use client";

import { useState, useMemo } from "react";
import { Position, Hand } from "@/lib/gto";
import { getAdjustedGTOAction } from "@/lib/gto-table-size";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
  const [selectedPosition, setSelectedPosition] = useState<Position>(position);
  const [selectedStackDepth, setSelectedStackDepth] = useState<number>(stackDepth);
  const [showEquity, setShowEquity] = useState(false);

  // Build hand matrix with accurate GTO lookups using memoization
  const handMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { action: string; hand: string }>> = {};
    
    // Determine table size for GTO lookup
    const tableSize = selectedStackDepth <= 25 ? 2 : selectedStackDepth <= 50 ? 4 : numPlayers;
    
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

  const getActionColor = (action: string, isPair: boolean, isSuited: boolean, isOffsuit: boolean): string => {
    // Color scheme matching poker range charts (like 25-Percent-Range.jpg)
    // Blue = Premium hands (all-in, strong raises)
    // Red = Strong offsuit raises
    // Yellow = Suited calls
    // Light pink/beige = Offsuit calls
    // Gray = Fold
    
    if (action === "fold") {
      return "bg-gray-700"; // Fold = gray
    }
    
    if (action === "all-in") {
      return "bg-blue-600"; // All-in = blue (premium)
    }
    
    if (action === "raise") {
      // Premium hands (pairs, strong suited) = blue
      if (isPair || isSuited) {
        return "bg-blue-600";
      }
      // Strong offsuit = red
      if (isOffsuit) {
        return "bg-red-600";
      }
      return "bg-blue-600";
    }
    
    if (action === "call") {
      // Suited hands = yellow
      if (isSuited) {
        return "bg-yellow-500";
      }
      // Offsuit hands = light pink/beige
      if (isOffsuit) {
        return "bg-pink-200"; // Light pink/beige
      }
      // Pairs calling = yellow
      return "bg-yellow-500";
    }
    
    return "bg-gray-700";
  };

  const getActionLabel = (action: string, hand: string): string => {
    // Show single-letter labels matching poker range charts
    if (action === "fold") {
      return "";
    }
    if (action === "all-in") {
      return "A";
    }
    if (action === "raise") {
      return "R";
    }
    if (action === "call") {
      return "C";
    }
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
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">GTO Range Visualizer</h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value as Position)}
              className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-2"
            >
              <option value="UTG">UTG</option>
              <option value="UTG+1">UTG+1</option>
              <option value="MP">MP</option>
              <option value="CO">CO</option>
              <option value="BTN">BTN</option>
              <option value="SB">SB</option>
              <option value="BB">BB</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Stack Depth</label>
            <select
              value={selectedStackDepth}
              onChange={(e) => setSelectedStackDepth(Number(e.target.value))}
              className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-2"
            >
              <option value={25}>25 BB</option>
              <option value={50}>50 BB</option>
              <option value={100}>100 BB</option>
              <option value={200}>200 BB</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={() => setShowEquity(!showEquity)}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300"
            >
              {showEquity ? "Hide" : "Show"} Equity
            </Button>
          </div>
        </div>

        {/* Range Statistics */}
        <div className="flex gap-4 mb-4">
          <Badge className="bg-green-600 text-white">
            Raise: {raisePercent}%
          </Badge>
          <Badge className="bg-yellow-600 text-white">
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
                    className={`w-14 h-14 flex items-center justify-center text-[9px] font-bold border border-gray-700 cursor-pointer hover:opacity-80 transition-opacity ${getActionColor(cell.action, isPair, isSuited, isOffsuit)} ${
                      cell.action === "fold" ? "text-gray-400" : "text-white"
                    }`}
                    title={`${cell.hand} - ${cell.action}`}
                  >
                    {cell.action === "fold" ? "" : (
                      <span className="text-center leading-tight px-0.5">{getActionLabel(cell.action, cell.hand)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded"></div>
            <span className="text-gray-300">Raise (Premium/Strong)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded"></div>
            <span className="text-gray-300">Raise (Offsuit)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500 rounded"></div>
            <span className="text-gray-300">Call (Suited)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-pink-200 rounded"></div>
            <span className="text-gray-300">Call (Offsuit)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-700 rounded"></div>
            <span className="text-gray-300">Fold</span>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-400">
          <p>• Pairs are shown on the diagonal (e.g., AA, KK, QQ)</p>
          <p>• Suited hands are above the diagonal (e.g., AKs, QJs)</p>
          <p>• Offsuit hands are below the diagonal (e.g., AKo, QJo)</p>
          <p>• Hover over cells to see full hand notation</p>
        </div>
      </div>

      {/* Equity Information (if enabled) */}
      {showEquity && (
        <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Equity Metrics</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p>• Raising range: ~{raisePercent}% of hands (strong value + bluffs)</p>
            <p>• Calling range: ~{callPercent}% of hands (medium strength)</p>
            <p>• Folding range: ~{foldPercent}% of hands (weak hands)</p>
            <p className="mt-2 text-gray-400">
              Note: Ranges adjust based on position, stack depth, and table dynamics.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

