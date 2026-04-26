"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerTable } from "@/components/poker-table";
import { ActionButtonsWithFrequencies } from "@/components/action-buttons-with-frequencies";
import { ContinueButton } from "@/components/continue-button";
import { PlayerCountSelector } from "@/components/player-count-selector";
import { HandHistoryReview } from "@/components/hand-history-review";
import { ActionHistoryBar } from "@/components/action-history-bar";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getArchetypeLabel, OpponentArchetype } from "@/lib/leak-weighting";

export default function GamePage() {
  const { 
    dealNewHand, 
    currentHandId,
    opponentArchetype,
    strategyMode,
    showEVDecimals,
    setOpponentArchetype,
    setStrategyMode,
    setShowEVDecimals,
  } = useGameStore();
  
  const [showHandReview, setShowHandReview] = useState(false);

  useEffect(() => {
    // Deal a new hand when component mounts
    dealNewHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <div className="bg-[#0f0f0f] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-brand text-lg font-bold tracking-wide text-white">
                  Varion Poker
                </span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <Navigation />
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-[#121212] px-3 py-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Opponent</label>
                  <select
                    value={opponentArchetype}
                    onChange={(event) => setOpponentArchetype(event.target.value as OpponentArchetype)}
                    className="bg-[#0f0f0f] text-sm text-gray-200 border border-gray-700 rounded px-2 py-1"
                  >
                    {(["SOLVER_LIKE", "OVER_FOLDS", "STATION", "SCARED_MONEY", "OVER_AGGRO"] as const).map((type) => (
                      <option key={type} value={type}>
                        {getArchetypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 border border-gray-700 rounded px-2 py-1" title="Switch between GTO and exploit mode">
                  <button
                    className={`text-xs px-2 py-1 rounded ${strategyMode === "gto" ? "bg-gray-800 text-white" : "text-gray-400"}`}
                    onClick={() => setStrategyMode("gto")}
                  >
                    GTO
                  </button>
                  <button
                    className={`text-xs px-2 py-1 rounded ${strategyMode === "exploit" ? "bg-gray-800 text-white" : "text-gray-400"}`}
                    onClick={() => setStrategyMode("exploit")}
                  >
                    Exploit
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-400" title="Show EV values with decimals">
                  <input
                    type="checkbox"
                    checked={showEVDecimals}
                    onChange={() => setShowEVDecimals(!showEVDecimals)}
                    className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-900 text-amber-400"
                  />
                  Show Decimals
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <PlayerCountSelector />
              <Button
                onClick={dealNewHand}
                variant="outline"
                size="sm"
                className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 whitespace-nowrap"
              >
                New Hand
              </Button>
              {currentHandId && (
                <Button
                  onClick={() => setShowHandReview(true)}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 whitespace-nowrap"
                >
                  Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start gap-6 p-6">
        <div className="w-full max-w-5xl">
          <Card className="p-6 bg-gray-800/50 border-gray-700">
            <PokerTable />
          </Card>
        </div>
        <div className="w-full max-w-5xl">
          <ContinueButton />
        </div>
      </div>

      <div className="action-dock">
        <ActionButtonsWithFrequencies />
        <ActionHistoryBar />
      </div>

      {showHandReview && currentHandId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowHandReview(false)}
        >
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-lg border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <HandHistoryReview 
              handId={currentHandId} 
              onClose={() => setShowHandReview(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
