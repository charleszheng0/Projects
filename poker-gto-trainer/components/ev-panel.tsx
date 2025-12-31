"use client";

import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useMemo } from "react";
import { calculateEV } from "@/lib/ev-calculator";
import { getAvailableActions } from "@/lib/action-validation";

/**
 * EV Panel Component
 * Shows EV for available actions
 * Read-only, never blocks input
 */
export function EVPanel() {
  const {
    playerHand,
    gameStage,
    pot,
    currentBet,
    playerBetsBB,
    playerSeat,
    numPlayers,
    showEVPanel,
    setShowEVPanel,
    actionToFace,
    communityCards,
  } = useGameStore();
  
  const playerCurrentBet = playerBetsBB?.[playerSeat] || 0;
  
  // Calculate EV for each available action
  const evData = useMemo(() => {
    if (!playerHand || !showEVPanel) return null;
    
    const availableActions = getAvailableActions(
      gameStage,
      actionToFace,
      currentBet,
      playerCurrentBet,
      gameStage === "preflop"
    );
    
    const evs: Array<{ action: string; ev: number; label: string }> = [];
    
    if (availableActions.canFold) {
      try {
        const ev = calculateEV(
          playerHand,
          communityCards || [],
          gameStage,
          pot,
          currentBet,
          "fold",
          undefined,
          numPlayers
        );
        evs.push({ action: "fold", ev: ev.ev, label: "Fold" });
      } catch {
        evs.push({ action: "fold", ev: 0, label: "Fold" });
      }
    }
    
    if (availableActions.canCall) {
      try {
        const ev = calculateEV(
          playerHand,
          communityCards || [],
          gameStage,
          pot,
          currentBet,
          "call",
          undefined,
          numPlayers
        );
        evs.push({ action: "call", ev: ev.ev, label: "Call" });
      } catch {
        evs.push({ action: "call", ev: 0, label: "Call" });
      }
    }
    
    if (availableActions.canCheck) {
      try {
        const ev = calculateEV(
          playerHand,
          communityCards || [],
          gameStage,
          pot,
          currentBet,
          "call", // Check is same as call for EV
          undefined,
          numPlayers
        );
        evs.push({ action: "check", ev: ev.ev, label: "Check" });
      } catch {
        evs.push({ action: "check", ev: 0, label: "Check" });
      }
    }
    
    if (availableActions.canBet) {
      // Sample bet sizes
      const betSizes = [pot * 0.33, pot * 0.5, pot * 0.75, pot];
      betSizes.forEach(size => {
        try {
          const ev = calculateEV(
            playerHand,
            communityCards || [],
            gameStage,
            pot,
            currentBet,
            "bet",
            size,
            numPlayers
          );
          evs.push({ action: "bet", ev: ev.ev, label: `Bet ${Math.round(size)}` });
        } catch {
          // Skip if calculation fails
        }
      });
    }
    
    if (availableActions.canRaise) {
      // Sample raise sizes
      const raiseSizes = [currentBet * 2, currentBet * 3, pot];
      raiseSizes.forEach(size => {
        try {
          const ev = calculateEV(
            playerHand,
            communityCards || [],
            gameStage,
            pot,
            currentBet,
            "raise",
            size,
            numPlayers
          );
          evs.push({ action: "raise", ev: ev.ev, label: `Raise ${Math.round(size)}` });
        } catch {
          // Skip if calculation fails
        }
      });
    }
    
    // Sort by EV descending
    evs.sort((a, b) => b.ev - a.ev);
    
    return evs;
  }, [playerHand, gameStage, pot, currentBet, playerCurrentBet, numPlayers, actionToFace, showEVPanel, communityCards]);
  
  if (!showEVPanel) {
    return (
      <Button
        onClick={() => setShowEVPanel(true)}
        variant="outline"
        size="sm"
        className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
      >
        Show EV
      </Button>
    );
  }
  
  if (!evData || evData.length === 0) {
    return (
      <Card className="p-4 bg-gray-900 border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">EV Panel</h3>
          <Button
            onClick={() => setShowEVPanel(false)}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>
        <div className="text-gray-400 text-sm mt-2">
          No EV data available
        </div>
      </Card>
    );
  }
  
  const bestEV = evData[0]?.ev || 0;
  
  return (
    <Card className="p-4 bg-gray-900 border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold">EV Panel</h3>
        <Button
          onClick={() => setShowEVPanel(false)}
          variant="outline"
          size="sm"
        >
          Close
        </Button>
      </div>
      
      <div className="space-y-2">
        {evData.map((item, idx) => {
          const isBest = idx === 0 && item.ev === bestEV;
          return (
            <div
              key={`${item.action}-${idx}`}
              className={`
                flex justify-between items-center p-2 rounded
                ${isBest ? "bg-green-600/20 border border-green-500" : "bg-gray-800"}
              `}
            >
              <span className="text-white text-sm font-medium">
                {item.label}
                {isBest && <span className="ml-2 text-green-400">★</span>}
              </span>
              <span className={`text-sm font-semibold ${item.ev >= 0 ? "text-green-400" : "text-red-400"}`}>
                {item.ev >= 0 ? "+" : ""}{item.ev.toFixed(2)} BB
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

