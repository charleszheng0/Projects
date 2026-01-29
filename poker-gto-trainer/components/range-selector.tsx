"use client";

import { useGameStore } from "@/store/game-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { getAdjustedGTOAction } from "@/lib/gto-table-size";
import { Hand, Position } from "@/lib/gto";

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
type RangeSelectorProps = {
  defaultOpen?: boolean;
  showToggle?: boolean;
};

export function RangeSelector({ defaultOpen = true, showToggle = false }: RangeSelectorProps) {
  const {
    customRange,
    useCustomRange,
    toggleHandInRange,
    setUseCustomRange,
    canSelectRange,
    playerPosition,
    playerStackBB,
    numPlayers,
  } = useGameStore();
  
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const dragTargetRef = useRef<string | null>(null);
  
  // CRITICAL: Use independent state for range selection (not tied to playerHand)
  const isReadOnly = !canSelectRange;
  
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        disabled={!canSelectRange}
        className={`bg-gray-800 hover:bg-gray-700 text-white border-gray-600 ${
          !canSelectRange ? "opacity-50 cursor-not-allowed" : ""
        }`}
        title={!canSelectRange ? "Range selection locked while making a decision" : "Select Range"}
      >
        Select Range
      </Button>
    );
  }

  const tableSize = playerStackBB <= 25 ? 2 : playerStackBB <= 50 ? 4 : numPlayers;
  const legalRange = useMemo(() => {
    const legalSet = new Set<string>();
    RANKS.forEach((rank1, i) => {
      RANKS.forEach((rank2, j) => {
        const encoding = getHandEncoding(i, j);
        if (!encoding) return;
        const isPair = i === j;
        const isSuited = i > j;
        const hand: Hand = {
          card1: { rank: RANKS[Math.min(i, j)], suit: "hearts" },
          card2: { rank: RANKS[Math.max(i, j)], suit: isSuited ? "hearts" : "diamonds" },
        };
        const gto = getAdjustedGTOAction(hand, playerPosition as Position, tableSize, "call");
        const isInRange = gto.optimalActions.some(action => action !== "fold");
        if (isInRange) legalSet.add(encoding);
      });
    });
    return legalSet;
  }, [playerPosition, tableSize]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      dragTargetRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);
  
  return (
    <Card className="p-4 bg-gray-900 border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white font-semibold">Range Selector</h3>
          <p className="text-xs text-gray-400">
            Position: {playerPosition} · Stack: {Math.round(playerStackBB)} BB
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setUseCustomRange(!useCustomRange)}
            variant={useCustomRange ? "default" : "outline"}
            size="sm"
            className={useCustomRange ? "bg-[#00ADEF]" : ""}
          >
            {useCustomRange ? "Enabled" : "Disabled"}
          </Button>
          {showToggle && (
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              size="sm"
            >
              Close
            </Button>
          )}
        </div>
      </div>
      
      {isReadOnly && (
        <div className="mb-2 text-yellow-400 text-sm">
          Range locked while making a decision - edit when it's not your turn
        </div>
      )}
      
      {/* 13x13 Matrix */}
      <div className="grid gap-1 select-none" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
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
              const isLegal = legalRange.has(encoding);
              const isDisabled = isReadOnly || !isLegal;

              const baseColor = isSelected
                ? "bg-[#FFD700] text-black"
                : isLegal
                  ? "bg-[#C72C48] text-white"
                  : "bg-gray-800 text-gray-500";

              return (
                <button
                  key={col}
                  onMouseDown={() => {
                    if (isDisabled) return;
                    setIsDragging(true);
                    const nextMode = isSelected ? "remove" : "add";
                    setDragMode(nextMode);
                    dragTargetRef.current = encoding;
                    toggleHandInRange(encoding);
                  }}
                  onMouseEnter={() => {
                    if (!isDragging || isDisabled) return;
                    if (dragTargetRef.current === encoding) return;
                    dragTargetRef.current = encoding;
                    if (dragMode === "add" && !isSelected) {
                      toggleHandInRange(encoding);
                    } else if (dragMode === "remove" && isSelected) {
                      toggleHandInRange(encoding);
                    }
                  }}
                  onClick={() => {
                    if (!isDisabled && !isDragging) {
                      toggleHandInRange(encoding);
                    }
                  }}
                  disabled={isDisabled}
                  className={`
                    w-8 h-8 text-[10px] font-semibold rounded transition-colors
                    ${baseColor}
                    ${isLegal && !isSelected ? "hover:brightness-110" : ""}
                    ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  title={`${encoding}${isLegal ? "" : " (out of range)"}`}
                >
                  {isPair ? "P" : isSuited ? "s" : "o"}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        Selected: {customRange.size} hands · In range: {legalRange.size} hands
      </div>
    </Card>
  );
}

