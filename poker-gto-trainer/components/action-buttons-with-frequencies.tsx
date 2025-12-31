"use client";

import { useGameStore } from "@/store/game-store";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";
import { getRealisticFrequencies, ActionFrequency } from "@/lib/gto-frequencies";
import { useState } from "react";

/**
 * GTO Wizard-style action buttons with frequencies displayed
 */
export function ActionButtonsWithFrequencies() {
  const { 
    playerHand, 
    gameStage, 
    actionToFace, 
    isPlayerTurn, 
    currentBet, 
    pot,
    bigBlind,
    playerStackBB,
    playerPosition,
    numPlayers,
    selectAction, 
    optimalActions, 
    isCorrect,
    lastAction,
    betSizeBB
  } = useGameStore();
  
  const [selectedAction, setSelectedAction] = useState<{action: string, betSize?: number} | null>(null);

  if (!playerHand || !isPlayerTurn) {
    return null;
  }

  const isPreflop = gameStage === "preflop";
  const canCheck = !isPreflop && (actionToFace === "check" || actionToFace === null);
  const canBet = !isPreflop && (actionToFace === "check" || actionToFace === null);
  const canCall = actionToFace === "bet" || actionToFace === "raise" || (isPreflop && currentBet > 0);
  const canFold = !canCheck && (isPreflop || actionToFace === "bet" || actionToFace === "raise");

  // Calculate GTO frequencies for all actions
  const actionFrequencies = playerHand && optimalActions.length > 0
    ? getRealisticFrequencies(
        playerHand,
        playerPosition,
        gameStage,
        pot,
        currentBet,
        actionToFace,
        optimalActions as Action[],
        numPlayers,
        playerStackBB
      )
    : [];

  // Filter frequencies based on available actions
  const availableFrequencies = actionFrequencies.filter(freq => {
    if (freq.action === "fold" && !canFold) return false;
    if (freq.action === "check" && !canCheck) return false;
    if (freq.action === "call" && !canCall) return false;
    if ((freq.action === "bet" || freq.action === "raise") && !canBet && !canCall) return false;
    return true;
  });

  const handleActionClick = (frequency: ActionFrequency) => {
    setSelectedAction({ action: frequency.action, betSize: frequency.betSize });
    
    if (frequency.action === "fold" || frequency.action === "check" || frequency.action === "call") {
      selectAction(frequency.action);
    } else if (frequency.action === "bet" || frequency.action === "raise") {
      selectAction(frequency.action);
      // Auto-confirm bet size
      if (frequency.betSize) {
        setTimeout(() => {
          const state = useGameStore.getState();
          if (state.showBetSizingModal) {
            useGameStore.getState().confirmBetSize(frequency.betSize!);
          }
        }, 100);
      }
    }
  };

  const getActionButtonClass = (frequency: ActionFrequency, isSelected: boolean) => {
    const baseClass = "relative py-4 px-6 text-lg font-semibold rounded transition-all duration-200 border-2 ";
    
    if (frequency.action === "fold") {
      return baseClass + (isSelected
        ? "bg-gray-600 border-green-500 shadow-lg shadow-green-500/50"
        : "bg-gray-700 hover:bg-gray-600 border-gray-600");
    } else if (frequency.action === "check" || frequency.action === "call") {
      return baseClass + (isSelected
        ? "bg-green-600 border-green-500 shadow-lg shadow-green-500/50"
        : "bg-green-600 hover:bg-green-700 border-green-700");
    } else if (frequency.action === "bet" || frequency.action === "raise") {
      // Red shades for bet/raise
      const redShade = frequency.betSize && frequency.betSize > pot * 1.2 ? "bg-red-900" :
                       frequency.betSize && frequency.betSize > pot * 0.8 ? "bg-red-800" :
                       frequency.betSize && frequency.betSize > pot * 0.5 ? "bg-red-700" :
                       "bg-red-600";
      return baseClass + redShade + (isSelected
        ? " border-green-500 shadow-lg shadow-green-500/50"
        : " hover:brightness-110 border-red-800");
    }
    return baseClass + "bg-gray-700 border-gray-600";
  };

  // Group frequencies by action type for layout
  const foldFreqs = availableFrequencies.filter(f => f.action === "fold");
  const checkFreqs = availableFrequencies.filter(f => f.action === "check");
  const callFreqs = availableFrequencies.filter(f => f.action === "call");
  const betRaiseFreqs = availableFrequencies.filter(f => f.action === "bet" || f.action === "raise");

  return (
    <div className="w-full space-y-3">
      {/* Correct Frequencies Label */}
      <div className="flex items-center justify-center">
        <div className="bg-teal-600/20 border border-teal-500 px-3 py-1 rounded text-teal-300 text-sm font-semibold">
          CORRECT FREQUENCIES
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Check Button */}
        {checkFreqs.length > 0 && checkFreqs.map((freq, idx) => {
          const isSelected = selectedAction?.action === freq.action && 
                           lastAction === freq.action && 
                           isCorrect !== null;
          return (
            <button
              key={`check-${idx}`}
              onClick={() => handleActionClick(freq)}
              className={getActionButtonClass(freq, isSelected || false) + " text-white flex flex-col items-center justify-center"}
            >
              <span>{freq.label}</span>
              <span className="text-sm font-normal mt-1 opacity-90">{freq.frequency.toFixed(1)}%</span>
              {isSelected && (
                <span className="absolute top-1 right-1 text-green-300 text-xs">✓</span>
              )}
            </button>
          );
        })}

        {/* Bet/Raise Buttons */}
        {betRaiseFreqs.map((freq, idx) => {
          const isSelected = selectedAction?.action === freq.action && 
                           selectedAction?.betSize === freq.betSize &&
                           lastAction === freq.action &&
                           betSizeBB === freq.betSize &&
                           isCorrect !== null;
          const displayLabel = freq.label.includes("ALLIN") ? "ALLIN" : freq.label;
          return (
            <button
              key={`bet-${idx}`}
              onClick={() => handleActionClick(freq)}
              className={getActionButtonClass(freq, isSelected || false) + " text-white flex flex-col items-center justify-center"}
            >
              <span>{displayLabel}</span>
              {freq.betSize && freq.betSize > 0 && (
                <span className="text-xs opacity-75">{freq.betSize} bb</span>
              )}
              <span className="text-sm font-normal mt-1 opacity-90">{freq.frequency.toFixed(1)}%</span>
              {isSelected && (
                <span className="absolute top-1 right-1 text-green-300 text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fold and Call Buttons - Full Width */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fold Button */}
        {foldFreqs.length > 0 && foldFreqs.map((freq, idx) => {
          const isSelected = selectedAction?.action === freq.action && 
                           lastAction === freq.action && 
                           isCorrect !== null;
          return (
            <button
              key={`fold-${idx}`}
              onClick={() => handleActionClick(freq)}
              className={getActionButtonClass(freq, isSelected || false) + " text-white flex flex-col items-center justify-center"}
            >
              <span>{freq.label}</span>
              <span className="text-sm font-normal mt-1 opacity-90">{freq.frequency.toFixed(1)}%</span>
              {isSelected && (
                <span className="absolute top-1 right-1 text-green-300 text-xs">✓</span>
              )}
            </button>
          );
        })}

        {/* Call Button */}
        {callFreqs.length > 0 && callFreqs.map((freq, idx) => {
          const isSelected = selectedAction?.action === freq.action && 
                           lastAction === freq.action && 
                           isCorrect !== null;
          return (
            <button
              key={`call-${idx}`}
              onClick={() => handleActionClick(freq)}
              className={getActionButtonClass(freq, isSelected || false) + " text-white flex flex-col items-center justify-center"}
            >
              <span>{freq.label}</span>
              <span className="text-sm font-normal mt-1 opacity-90">{freq.frequency.toFixed(1)}%</span>
              {isSelected && (
                <span className="absolute top-1 right-1 text-green-300 text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

