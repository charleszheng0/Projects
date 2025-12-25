"use client";

import { useState, useEffect } from "react";
import { getDataset, HandHistoryRecord } from "@/lib/hand-history";
import { formatHand } from "@/lib/gto";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface HandHistoryReviewProps {
  handId: string;
  onClose?: () => void;
}

export function HandHistoryReview({ handId, onClose }: HandHistoryReviewProps) {
  const [records, setRecords] = useState<HandHistoryRecord[]>([]);
  const [selectedStep, setSelectedStep] = useState<number>(0);

  useEffect(() => {
    const dataset = getDataset();
    const handRecords = dataset.getRecords({ handId });
    // Sort by timestamp to get chronological order
    const sorted = handRecords.sort((a, b) => a.timestamp - b.timestamp);
    setRecords(sorted);
    setSelectedStep(sorted.length - 1); // Start at last decision
  }, [handId]);

  if (records.length === 0) {
    return (
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Hand History Review</h2>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400">
              ✕
            </Button>
          )}
        </div>
        <div className="text-center text-gray-400 py-8">
          <p className="mb-4">No hand history found for this hand.</p>
          <p className="text-sm text-gray-500 mb-4">
            Hand history is recorded automatically as you play. Make some decisions to see the review.
          </p>
          {onClose && (
            <Button
              onClick={onClose}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const currentRecord = records[selectedStep];
  const handString = formatHand(currentRecord.playerHand);

  const formatCard = (card: { rank: string; suit: string }) => {
    const suitSymbols: Record<string, string> = {
      spades: "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
    };
    const suitColors: Record<string, string> = {
      spades: "text-black",
      clubs: "text-black",
      hearts: "text-red-600",
      diamonds: "text-red-600",
    };
    return (
      <span className={`font-mono ${suitColors[card.suit]}`}>
        {card.rank}{suitSymbols[card.suit]}
      </span>
    );
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Hand History Review</h2>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400">
            ✕
          </Button>
        )}
      </div>

      {/* Hand Info */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex items-center gap-4 mb-2">
          <div>
            <span className="text-gray-400 text-sm">Hand:</span>
            <div className="text-white font-mono text-lg">
              {formatCard(currentRecord.playerHand.card1)} {formatCard(currentRecord.playerHand.card2)}
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Position:</span>
            <Badge variant="secondary" className="bg-gray-700 text-white ml-2">
              {currentRecord.playerPosition}
            </Badge>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Players:</span>
            <span className="text-white ml-2">{currentRecord.numPlayers}</span>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          onClick={() => setSelectedStep(Math.max(0, selectedStep - 1))}
          disabled={selectedStep === 0}
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300"
        >
          ← Previous
        </Button>
        <div className="flex-1 text-center text-gray-400 text-sm">
          Decision {selectedStep + 1} of {records.length} • {currentRecord.gameStage}
        </div>
        <Button
          onClick={() => setSelectedStep(Math.min(records.length - 1, selectedStep + 1))}
          disabled={selectedStep === records.length - 1}
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300"
        >
          Next →
        </Button>
      </div>

      {/* Current Decision Analysis */}
      <div className="space-y-4">
        {/* Game State */}
        <div className="p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Game State</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Stage:</span>
              <Badge variant="secondary" className="bg-blue-700 text-white ml-2 capitalize">
                {currentRecord.gameStage}
              </Badge>
            </div>
            <div>
              <span className="text-gray-400">Pot:</span>
              <span className="text-yellow-300 font-semibold ml-2">{currentRecord.pot} BB</span>
            </div>
            <div>
              <span className="text-gray-400">Current Bet:</span>
              <span className="text-white ml-2">{currentRecord.currentBet} BB</span>
            </div>
            <div>
              <span className="text-gray-400">Stack:</span>
              <span className="text-white ml-2">{currentRecord.playerStackBB} BB</span>
            </div>
          </div>
          
          {currentRecord.communityCards.length > 0 && (
            <div className="mt-3">
              <span className="text-gray-400 text-sm">Board:</span>
              <div className="flex gap-2 mt-1">
                {currentRecord.communityCards.map((card, i) => (
                  <span key={i} className="text-white font-mono">
                    {formatCard(card)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Decision Analysis */}
        <div className="p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Decision Analysis</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Your Action:</span>
              <Badge
                variant={currentRecord.isCorrect ? "default" : "destructive"}
                className={currentRecord.isCorrect ? "bg-green-600" : "bg-red-600"}
              >
                {currentRecord.playerAction}
                {currentRecord.betSizeBB && ` (${currentRecord.betSizeBB} BB)`}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Optimal Actions:</span>
              <div className="flex gap-2">
                {currentRecord.optimalActions.map((action, i) => (
                  <Badge key={i} variant="secondary" className="bg-blue-700 text-white">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Correctness:</span>
              <Badge
                variant={currentRecord.isCorrect ? "default" : "destructive"}
                className={currentRecord.isCorrect ? "bg-green-600" : "bg-red-600"}
              >
                {currentRecord.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">GTO Feedback</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{currentRecord.feedback}</p>
        </div>

        {/* Timeline */}
        <div className="p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Decision Timeline</h3>
          <div className="space-y-2">
            {records.map((record, index) => (
              <button
                key={record.id}
                onClick={() => setSelectedStep(index)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  index === selectedStep
                    ? "bg-blue-900/50 border-2 border-blue-600"
                    : "bg-gray-800/50 hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-gray-700 text-white text-xs capitalize">
                      {record.gameStage}
                    </Badge>
                    <span className="text-gray-300">{record.playerAction}</span>
                    {record.betSizeBB && (
                      <span className="text-gray-400">({record.betSizeBB} BB)</span>
                    )}
                  </div>
                  <Badge
                    variant={record.isCorrect ? "default" : "destructive"}
                    className={record.isCorrect ? "bg-green-600" : "bg-red-600"}
                  >
                    {record.isCorrect ? "✓" : "✗"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

