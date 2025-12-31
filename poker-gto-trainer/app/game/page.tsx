"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerTable } from "@/components/poker-table";
import { ActionButtonsWithFrequencies } from "@/components/action-buttons-with-frequencies";
import { FeedbackBox } from "@/components/feedback-box";
import { FeedbackModal } from "@/components/feedback-modal";
import { BetSizingModal } from "@/components/bet-sizing-modal";
import { PlayerCountSelector } from "@/components/player-count-selector";
import { HandHistoryReview } from "@/components/hand-history-review";
import { RangeVisualizer } from "@/components/range-visualizer";
import { Navigation } from "@/components/navigation";
import { TrainingStatsPanel } from "@/components/training-stats-panel";
import { ActionHistoryBar } from "@/components/action-history-bar";
import { GTOHints } from "@/components/gto-hints";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GamePage() {
  const { 
    dealNewHand, 
    playerHand, 
    currentHandId,
    playerPosition,
    gameStage,
    numPlayers,
    playerStackBB,
    pot,
    currentBet,
    isCorrect,
    lastAction,
    optimalActions,
    explanation,
    postFlopExplanation
  } = useGameStore();
  
  const [showHandReview, setShowHandReview] = useState(false);
  const [showRangePanel, setShowRangePanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(true);

  useEffect(() => {
    // Deal a new hand when component mounts
    dealNewHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="min-h-screen bg-[#0f0f0f]">
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
            <div className="flex items-center gap-4 mr-20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRangePanel(!showRangePanel)}
                className={`text-gray-300 hover:text-white ${showRangePanel ? 'bg-gray-800' : ''}`}
              >
                {showRangePanel ? 'Hide' : 'Show'} Ranges
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStatsPanel(!showStatsPanel)}
                className={`text-gray-300 hover:text-white ${showStatsPanel ? 'bg-gray-800' : ''}`}
              >
                {showStatsPanel ? 'Hide' : 'Show'} Stats
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout - GTO Wizard Style */}
      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Range Visualizer (Collapsible) */}
          {showRangePanel && (
            <div className="col-span-12 lg:col-span-3">
              <Card className="p-4 bg-gray-800/50 border-gray-700 sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <RangeVisualizer 
                  position={playerPosition} 
                  numPlayers={numPlayers}
                  stackDepth={playerStackBB}
                />
              </Card>
            </div>
          )}

          {/* Main Training Area */}
          <div className={`${showRangePanel ? 'col-span-12 lg:col-span-6' : 'col-span-12 lg:col-span-8'}`}>
            <div className="space-y-6">
              {/* Game Info Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-wrap min-w-0 flex-1">
                    <PlayerCountSelector />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
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

              {/* Poker Table - Main Focus */}
              <Card className="p-6 bg-gray-800/50 border-gray-700">
                <PokerTable />
              </Card>

              {/* Action Buttons - GTO Wizard Style with Frequencies */}
              <Card className="p-4 bg-[#1a1a1a] border-gray-800">
                <ActionButtonsWithFrequencies />
              </Card>

              {/* Quick Stats Bar - GTO Wizard Style */}
              <Card className="p-4 bg-gray-800/50 border-gray-700">
                <TrainingStatsPanel compact={true} />
              </Card>

              {/* Feedback & Hints */}
              <div className="space-y-4">
                <FeedbackBox />
                <GTOHints />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Statistics Panel (Collapsible) */}
          {showStatsPanel && (
            <div className="col-span-12 lg:col-span-3">
              <Card className="p-4 bg-gray-800/50 border-gray-700 sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <TrainingStatsPanel />
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FeedbackModal />
      <BetSizingModal />

      {/* Hand History Review Modal */}
      {showHandReview && currentHandId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowHandReview(false)}
        >
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
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

