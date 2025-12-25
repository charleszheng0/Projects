"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerTable } from "@/components/poker-table";
import { ActionButtons } from "@/components/action-buttons";
import { FeedbackBox } from "@/components/feedback-box";
import { FeedbackModal } from "@/components/feedback-modal";
import { BetSizingModal } from "@/components/bet-sizing-modal";
import { PlayerCountSelector } from "@/components/player-count-selector";
import { HandHistoryReview } from "@/components/hand-history-review";
import { Navigation } from "@/components/navigation";
import { getSessionManager } from "@/lib/session-tracking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GamePage() {
  const { dealNewHand, playerHand, currentHandId } = useGameStore();
  const [showHandReview, setShowHandReview] = useState(false);
  const [sessionManager] = useState(() => getSessionManager());

  useEffect(() => {
    // Start session tracking
    const sessionId = sessionManager.startSession();
    
    // Deal a new hand when component mounts
    dealNewHand();
    
    // Cleanup: end session on unmount
    return () => {
      sessionManager.endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Poker GTO Trainer</h1>
          <p className="text-gray-400">Practice Game Theory Optimal decisions with real-time feedback</p>
        </div>

        {/* Navigation */}
        <Navigation />

        {/* Player Count Selector */}
        <div className="mb-6 flex justify-center">
          <PlayerCountSelector />
        </div>

        {/* Action Buttons */}
        {playerHand && (
          <div className="mb-4 flex justify-center gap-4">
            <Button
              onClick={dealNewHand}
              variant="outline"
              size="lg"
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 px-8"
            >
              Deal Next Hand
            </Button>
            {currentHandId && (
              <Button
                onClick={() => setShowHandReview(true)}
                variant="outline"
                size="lg"
                className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 px-8"
              >
                Review Hand
              </Button>
            )}
          </div>
        )}

        {/* Game Area */}
        <div className="space-y-8">
          {/* Poker Table */}
          <Card className="p-8 bg-gray-800/50 border-gray-700">
            <PokerTable />
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <ActionButtons />
          </div>

          {/* Feedback Box */}
          <div className="max-w-3xl mx-auto">
            <FeedbackBox />
          </div>
        </div>

        {/* Feedback Modal Overlay */}
        <FeedbackModal />
        
        {/* Bet Sizing Modal Overlay */}
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
    </div>
  );
}

