"use client";

import { useGameStore } from "@/store/game-store";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

/**
 * Convert hand to encoding (e.g., "AKo", "76s", "22")
 */
function handToEncoding(rank1: string, rank2: string, isSuited: boolean): string | null {
  if (rank1 === rank2) {
    return `${rank1}${rank2}`;
  }
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const idx1 = rankOrder.indexOf(rank1);
  const idx2 = rankOrder.indexOf(rank2);
  if (idx1 === -1 || idx2 === -1) return null;
  
  const highRank = idx1 > idx2 ? rank1 : rank2;
  const lowRank = idx1 > idx2 ? rank2 : rank1;
  return `${highRank}${lowRank}${isSuited ? "s" : "o"}`;
}

/**
 * Get hand encoding from matrix position
 */
function getHandEncoding(row: number, col: number): string | null {
  if (row === col) {
    // Pair
    return `${RANKS[row]}${RANKS[col]}`;
  }
  const highRank = RANKS[Math.min(row, col)];
  const lowRank = RANKS[Math.max(row, col)];
  const isSuited = row > col;
  return `${highRank}${lowRank}${isSuited ? "s" : "o"}`;
}

/**
 * Range Selector Component
 * 13x13 matrix for selecting hands
 * Independent of action buttons - read-only during hand
 */
export function RangeSelector() {
  const {
    customRange,
    useCustomRange,
    toggleHandInRange,
    setUseCustomRange,
    playerHand,
    isPlayerTurn,
  } = useGameStore();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // CRITICAL: Read-only during hand (doesn't block actions, just prevents editing)
  const isReadOnly = !!playerHand;
  
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
      >
        Select Range
      </Button>
    );
  }
  
  return (
    <Card className="p-4 bg-gray-900 border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold">Custom Range</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setUseCustomRange(!useCustomRange)}
            variant={useCustomRange ? "default" : "outline"}
            size="sm"
            className={useCustomRange ? "bg-blue-600" : ""}
          >
            {useCustomRange ? "Enabled" : "Disabled"}
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>
      </div>
      
      {isReadOnly && (
        <div className="mb-2 text-yellow-400 text-sm">
          Range locked during hand - edit between hands
        </div>
      )}
      
      {/* 13x13 Matrix */}
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {/* Header row */}
        <div></div>
        {RANKS.map(rank => (
          <div key={rank} className="text-xs text-gray-400 text-center font-semibold">
            {rank}
          </div>
        ))}
        
        {/* Data rows */}
        {RANKS.map((rank1, row) => (
          <div key={rank1} className="contents">
            {/* Row label */}
            <div className="text-xs text-gray-400 font-semibold flex items-center justify-end pr-2">
              {rank1}
            </div>
            
            {/* Cells */}
            {RANKS.map((rank2, col) => {
              const encoding = getHandEncoding(row, col);
              if (!encoding) return <div key={col} />;
              
              const isSelected = customRange.has(encoding);
              const isPair = row === col;
              const isSuited = row > col;
              
              return (
                <button
                  key={col}
                  onClick={() => {
                    if (!isReadOnly) {
                      toggleHandInRange(encoding);
                    }
                  }}
                  disabled={isReadOnly}
                  className={`
                    w-8 h-8 text-xs font-semibold rounded
                    ${isPair 
                      ? "bg-gray-700" 
                      : isSuited 
                        ? "bg-blue-900/30" 
                        : "bg-gray-800"
                    }
                    ${isSelected 
                      ? "bg-green-600 text-white" 
                      : "text-gray-300 hover:bg-gray-700"
                    }
                    ${isReadOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  title={encoding}
                >
                  {isPair ? "P" : isSuited ? "s" : "o"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-400">
        Selected: {customRange.size} hands
      </div>
    </Card>
  );
}

