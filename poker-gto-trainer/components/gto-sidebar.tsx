"use client";

import { useGameStore } from "@/store/game-store";
import { useState, useEffect, useMemo } from "react";
import { RangeVisualizer } from "./range-visualizer";
import { formatBB } from "@/lib/utils";
import { calculateEV } from "@/lib/ev-calculator";
import { Hand } from "@/lib/gto";

/**
 * Determine correctness level based on EV loss and isCorrect flag
 */
function getCorrectnessLevel(isCorrect: boolean | null, evLoss: number): "best-move" | "correct" | "inaccuracy" | "mistake" | "blunder" | null {
  if (isCorrect === null) return null;
  if (isCorrect) {
    if (evLoss < 0.1) return "best-move";
    return "correct";
  }
  if (evLoss >= 2.0) return "blunder";
  if (evLoss >= 0.5) return "mistake";
  return "inaccuracy";
}

/**
 * Get correctness label and color
 */
function getCorrectnessInfo(level: "best-move" | "correct" | "inaccuracy" | "mistake" | "blunder" | null) {
  switch (level) {
    case "best-move":
      return { label: "Best Move", color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-500" };
    case "correct":
      return { label: "Correct", color: "text-green-300", bgColor: "bg-green-500/20", borderColor: "border-green-500" };
    case "inaccuracy":
      return { label: "Inaccuracy", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500" };
    case "mistake":
      return { label: "Mistake", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500" };
    case "blunder":
      return { label: "Blunder", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500" };
    default:
      return { label: "", color: "", bgColor: "", borderColor: "" };
  }
}

interface HistoryEntry {
  handId: string;
  hand: Hand;
  action: string;
  betSize?: number;
  optimalAction: string;
  correctness: string;
  evLoss: number;
  stage: string;
  position: string;
  timestamp: number;
}

/**
 * GTO Wizard-style comprehensive sidebar with ranges, EV, frequencies, and history
 */
export function GTOSidebar() {
  const {
    playerHand,
    gameStage,
    playerPosition,
    numPlayers,
    playerStackBB,
    pot,
    currentBet,
    actionToFace,
    isCorrect,
    lastAction,
    optimalActions,
    betSizeBB,
    evLoss,
    actionHistory,
    currentHandId,
  } = useGameStore();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"strategy" | "ranges">("strategy");

  // Update history when action is completed
  useEffect(() => {
    if (isCorrect !== null && lastAction !== null && playerHand && optimalActions.length > 0) {
      const correctnessLevel = getCorrectnessLevel(isCorrect, Math.abs(evLoss || 0));
      const correctnessInfo = getCorrectnessInfo(correctnessLevel);
      
      const entry: HistoryEntry = {
        handId: currentHandId || `hand-${Date.now()}`,
        hand: playerHand,
        action: lastAction,
        betSize: betSizeBB || undefined,
        optimalAction: optimalActions[0] || "",
        correctness: correctnessInfo.label,
        evLoss: evLoss || 0,
        stage: gameStage,
        position: playerPosition,
        timestamp: Date.now(),
      };

      setHistory(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
    }
  }, [isCorrect, lastAction, playerHand, optimalActions, evLoss, betSizeBB, gameStage, playerPosition, currentHandId]);

  // Calculate EV for user's action and optimal action
  const evComparison = useMemo(() => {
    if (!playerHand || !lastAction || optimalActions.length === 0) return null;

    try {
      const userEV = calculateEV(
        playerHand,
        [],
        gameStage,
        pot,
        currentBet,
        lastAction,
        betSizeBB || undefined,
        numPlayers
      );

      const optimalEVs = optimalActions.map(action => {
        const optBetSize = (action === "bet" || action === "raise") ? (betSizeBB || currentBet * 2) : undefined;
        // Action type doesn't include "check", so we can use action directly
        return calculateEV(
          playerHand,
          [],
          gameStage,
          pot,
          currentBet,
          action,
          optBetSize,
          numPlayers
        );
      });

      const bestOptimalEV = Math.max(...optimalEVs.map(e => e.ev));

      return {
        userEV: userEV.ev,
        optimalEV: bestOptimalEV,
        evLoss: Math.max(0, bestOptimalEV - userEV.ev),
      };
    } catch {
      return null;
    }
  }, [playerHand, lastAction, optimalActions, gameStage, pot, currentBet, betSizeBB, numPlayers]);

  // Calculate frequency breakdown
  const frequencyBreakdown = useMemo(() => {
    if (!playerHand || optimalActions.length === 0) return null;

    // Simplified frequency calculation - in real implementation, use solver data
    const total = optimalActions.length;
    const foldFreq = optimalActions.filter(a => a === "fold").length / total * 100;
    // Check is a BettingAction, not Action, so we check for call only
    const callFreq = optimalActions.filter(a => a === "call").length / total * 100;
    const raiseFreq = optimalActions.filter(a => a === "bet" || a === "raise").length / total * 100;

    return {
      fold: foldFreq,
      call: callFreq,
      raise: raiseFreq,
    };
  }, [playerHand, optimalActions]);

  // Calculate running stats
  const runningStats = useMemo(() => {
    const total = history.length;
    if (total === 0) {
      return {
        hands: 0,
        correct: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
        accuracy: 0,
        totalEVLoss: 0,
      };
    }

    const correct = history.filter(h => h.correctness === "Correct" || h.correctness === "Best Move").length;
    const inaccuracy = history.filter(h => h.correctness === "Inaccuracy").length;
    const mistake = history.filter(h => h.correctness === "Mistake").length;
    const blunder = history.filter(h => h.correctness === "Blunder").length;
    const totalEVLoss = history.reduce((sum, h) => sum + h.evLoss, 0);

    return {
      hands: total,
      correct,
      inaccuracy,
      mistake,
      blunder,
      accuracy: (correct / total) * 100,
      totalEVLoss,
    };
  }, [history]);

  const correctnessLevel = getCorrectnessLevel(isCorrect, Math.abs(evLoss || 0));
  const correctnessInfo = getCorrectnessInfo(correctnessLevel);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] border-l border-gray-800">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab("strategy")}
          className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "strategy"
              ? "text-white bg-gray-800 border-b-2 border-green-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Strategy
        </button>
        <button
          onClick={() => setActiveTab("ranges")}
          className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "ranges"
              ? "text-white bg-gray-800 border-b-2 border-green-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Ranges
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "strategy" ? (
          <div className="p-4 space-y-6">
            {/* Action Evaluation */}
            {isCorrect !== null && lastAction && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Move Evaluation</h3>
                
                <div className={`p-3 rounded-lg border ${correctnessInfo.bgColor} ${correctnessInfo.borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Category</span>
                    <span className={`text-sm font-bold ${correctnessInfo.color}`}>
                      {correctnessInfo.label}
                    </span>
                  </div>
                  
                  {evComparison && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Best Move</span>
                        <span className="text-sm font-semibold text-white">
                          {optimalActions[0] || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Your Move</span>
                        <span className="text-sm font-semibold text-white">
                          {lastAction} {betSizeBB ? `(${formatBB(betSizeBB)} BB)` : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Solver EV</span>
                        <span className="text-sm font-semibold text-green-400">
                          {evComparison.optimalEV >= 0 ? "+" : ""}{evComparison.optimalEV.toFixed(2)} BB
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Your EV</span>
                        <span className={`text-sm font-semibold ${
                          evComparison.userEV >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {evComparison.userEV >= 0 ? "+" : ""}{evComparison.userEV.toFixed(2)} BB
                        </span>
                      </div>
                      {evComparison.evLoss > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">EV Loss</span>
                            <span className="text-sm font-semibold text-red-400">
                              -{evComparison.evLoss.toFixed(2)} BB
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Frequency Breakdown */}
            {frequencyBreakdown && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Range Frequencies</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">FOLD</span>
                    <span className="text-sm font-semibold text-white">{frequencyBreakdown.fold.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${frequencyBreakdown.fold}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">CALL/CHECK</span>
                    <span className="text-sm font-semibold text-white">{frequencyBreakdown.call.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${frequencyBreakdown.call}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">BET/RAISE</span>
                    <span className="text-sm font-semibold text-white">{frequencyBreakdown.raise.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${frequencyBreakdown.raise}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Running Stats */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Session Stats</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Hands</span>
                  <span className="text-sm font-semibold text-white">{runningStats.hands}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Accuracy</span>
                  <span className={`text-sm font-semibold ${
                    runningStats.accuracy >= 70 ? "text-green-400" :
                    runningStats.accuracy >= 50 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {runningStats.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Best Move</span>
                  <span className="text-sm font-semibold text-green-400">{runningStats.correct}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Inaccuracy</span>
                  <span className="text-sm font-semibold text-yellow-400">{runningStats.inaccuracy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Mistake</span>
                  <span className="text-sm font-semibold text-orange-400">{runningStats.mistake}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Blunder</span>
                  <span className="text-sm font-semibold text-red-400">{runningStats.blunder}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-400">Total EV Loss</span>
                  <span className="text-sm font-semibold text-red-400">
                    -{runningStats.totalEVLoss.toFixed(2)} BB
                  </span>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">History</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">No actions yet</div>
                ) : (
                  history.map((entry, idx) => {
                    const entryCorrectness = getCorrectnessInfo(
                      entry.correctness as any
                    );
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{entry.position}</span>
                          <span className={`text-xs font-semibold ${entryCorrectness.color}`}>
                            {entry.correctness}
                          </span>
                        </div>
                        <div className="text-xs text-white mb-1">
                          {entry.hand.card1.rank}{entry.hand.card1.suit[0]} {entry.hand.card2.rank}{entry.hand.card2.suit[0]}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{entry.action} {entry.betSize ? `(${formatBB(entry.betSize)} BB)` : ""}</span>
                          <span className="text-gray-500">{entry.stage}</span>
                        </div>
                        {entry.evLoss > 0 && (
                          <div className="text-xs text-red-400 mt-1">
                            -{entry.evLoss.toFixed(2)} BB
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <RangeVisualizer
              position={playerPosition}
              numPlayers={numPlayers}
              stackDepth={playerStackBB}
            />
          </div>
        )}
      </div>
    </div>
  );
}

