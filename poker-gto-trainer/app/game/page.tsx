"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerTable } from "@/components/poker-table";
import { ActionButtons } from "@/components/action-buttons";
import { FeedbackBox } from "@/components/feedback-box";
import { FeedbackModal } from "@/components/feedback-modal";
import { BetSizingModal } from "@/components/bet-sizing-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GamePage() {
  const { dealNewHand, playerHand } = useGameStore();

  useEffect(() => {
    // Deal a new hand when component mounts
    dealNewHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Poker GTO Trainer</h1>
          <p className="text-gray-400">Practice Game Theory Optimal preflop decisions</p>
        </div>

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
      </div>
    </div>
  );
}

