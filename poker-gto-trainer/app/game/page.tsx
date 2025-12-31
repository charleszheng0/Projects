"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerTable } from "@/components/poker-table";
import { ActionButtonsWithFrequencies } from "@/components/action-buttons-with-frequencies";
import { BetSizingModal } from "@/components/bet-sizing-modal";
import { PlayerCountSelector } from "@/components/player-count-selector";
import { HandHistoryReview } from "@/components/hand-history-review";
import { ActionHistoryBar } from "@/components/action-history-bar";
import { GTOSidebar } from "@/components/gto-sidebar";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RangeSelector } from "@/components/range-selector";
import { EVPanel } from "@/components/ev-panel";

export default function GamePage() {
  const { 
    dealNewHand, 
    currentHandId,
  } = useGameStore();
  
  const [showHandReview, setShowHandReview] = useState(false);

  useEffect(() => {
    // Deal a new hand when component mounts
    dealNewHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Action History Bar - GTO Wizard Style Top Breadcrumb */}
      <ActionHistoryBar />
      
      {/* Top Bar - GTO Wizard Style */}
      <div className="bg-[#0f0f0f] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-white">Poker GTO Trainer</h1>
              <Navigation />
            </div>
            <div className="flex items-center gap-4">
              <RangeSelector />
              <EVPanel />
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

      {/* Main Layout - GTO Wizard 3-Panel Structure */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls (Optional, can be hidden) */}
        <div className="w-0 lg:w-64 border-r border-gray-800 bg-[#1a1a1a] hidden lg:block">
          {/* Left panel content can go here if needed */}
        </div>

        {/* Center Panel - Poker Table & Action Buttons */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
            {/* Poker Table - Always visible, never dimmed */}
            <div className="w-full max-w-4xl">
              <Card className="p-6 bg-gray-800/50 border-gray-700">
                <PokerTable />
              </Card>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom, morphs into analysis */}
          <div className="border-t border-gray-800 bg-[#1a1a1a] p-4">
            <ActionButtonsWithFrequencies />
          </div>
        </div>

        {/* Right Panel - GTO Sidebar (Strategy/Ranges) */}
        <div className="w-0 lg:w-96 border-l border-gray-800 bg-[#1a1a1a] hidden lg:flex">
          <GTOSidebar />
        </div>
      </div>

      {/* Modals */}
      <BetSizingModal />

      {/* Hand History Review Modal */}
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
