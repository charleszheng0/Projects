"use client";

import { useGameStore } from "@/store/game-store";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";

/**
 * GTO Wizard-style action buttons as full-width color-coded grid tiles
 */
export function ActionButtonsGrid() {
  const { 
    playerHand, 
    gameStage, 
    actionToFace, 
    isPlayerTurn, 
    currentBet, 
    pot,
    bigBlind,
    selectAction, 
    optimalActions, 
    isCorrect,
    playerStackBB 
  } = useGameStore();

  if (!playerHand || !isPlayerTurn) {
    return null;
  }

  const isPreflop = gameStage === "preflop";
  const canCheck = !isPreflop && (actionToFace === "check" || actionToFace === null);
  const canBet = !isPreflop && (actionToFace === "check" || actionToFace === null);
  const canCall = actionToFace === "bet" || actionToFace === "raise" || (isPreflop && currentBet > 0);
  const canFold = !canCheck && (isPreflop || actionToFace === "bet" || actionToFace === "raise");
  
  // Determine if we're facing a bet (need to raise, not just bet)
  const facingBet = canCall && currentBet > 0;
  
  // Minimum raise size: standard poker rule is minimum raise = 2x the current bet
  // (e.g., if facing 1 BB bet, minimum raise is 2 BB total)
  const minRaiseSize = facingBet ? currentBet * 2 : 0;
  
  // Calculate bet sizes as percentages of pot
  let betSizes = [
    { label: "1/3", size: Math.round((pot * 0.33) * 10) / 10 },
    { label: "1/2", size: Math.round((pot * 0.5) * 10) / 10 },
    { label: "2/3", size: Math.round((pot * 0.67) * 10) / 10 },
    { label: "Pot", size: Math.round(pot * 10) / 10 },
    { label: "All-in", size: playerStackBB },
  ];
  
  // Filter out invalid bet sizes when facing a bet
  // A raise must be strictly larger than the current bet to call
  if (facingBet) {
    betSizes = betSizes.filter(bet => {
      // All-in is always valid (if player has chips)
      if (bet.label === "All-in") return playerStackBB > currentBet;
      // For raises, the bet size must be strictly greater than currentBet
      // Also ensure it meets minimum raise requirement
      return bet.size > currentBet && bet.size >= minRaiseSize;
    });
    
    // If we filtered out too many options, add a minimum raise option
    // This ensures players always have a raise option when facing a bet
    const hasValidRaise = betSizes.some(bet => bet.label !== "All-in" && bet.size >= minRaiseSize);
    if (!hasValidRaise && minRaiseSize <= playerStackBB) {
      // Add minimum raise option
      betSizes.unshift({ 
        label: "Min", 
        size: Math.round(minRaiseSize * 10) / 10 
      });
    }
  }

  const getActionStatus = (action: Action | BettingAction) => {
    if (isCorrect === null) return null;
    const actionStr = action as string;
    return optimalActions.includes(actionStr as Action) ? "correct" : "incorrect";
  };

  return (
    <div className="w-full space-y-2">
      {/* Fold Button - Blue/Grey, Full Width */}
      {canFold && (
        <button
          onClick={() => selectAction("fold")}
          className={`w-full py-4 px-6 text-lg font-semibold rounded transition-all duration-200 ${
            getActionStatus("fold") === "correct"
              ? "bg-gray-600 border-2 border-green-500 shadow-lg shadow-green-500/50"
              : getActionStatus("fold") === "incorrect"
              ? "bg-gray-600 border-2 border-red-500"
              : "bg-gray-700 hover:bg-gray-600 border border-gray-600"
          } text-white`}
        >
          FOLD
          {getActionStatus("fold") === "correct" && (
            <span className="ml-2 text-green-400">✓</span>
          )}
        </button>
      )}

      {/* Check/Call Button - Green, Full Width */}
      {canCheck && (
        <button
          onClick={() => selectAction("check")}
          className={`w-full py-4 px-6 text-lg font-semibold rounded transition-all duration-200 ${
            getActionStatus("check") === "correct"
              ? "bg-green-600 border-2 border-green-500 shadow-lg shadow-green-500/50"
              : getActionStatus("check") === "incorrect"
              ? "bg-green-600 border-2 border-red-500"
              : "bg-green-600 hover:bg-green-700 border border-green-700"
          } text-white`}
        >
          CHECK
          {getActionStatus("check") === "correct" && (
            <span className="ml-2 text-green-300">✓</span>
          )}
        </button>
      )}

      {canCall && (
        <button
          onClick={() => selectAction("call")}
          className={`w-full py-4 px-6 text-lg font-semibold rounded transition-all duration-200 ${
            getActionStatus("call") === "correct"
              ? "bg-green-600 border-2 border-green-500 shadow-lg shadow-green-500/50"
              : getActionStatus("call") === "incorrect"
              ? "bg-green-600 border-2 border-red-500"
              : "bg-green-600 hover:bg-green-700 border border-green-700"
          } text-white`}
        >
          CALL {currentBet > 0 ? `(${currentBet} bb)` : ""}
          {getActionStatus("call") === "correct" && (
            <span className="ml-2 text-green-300">✓</span>
          )}
        </button>
      )}

      {/* Bet/Raise Buttons - Red shades, Grid Layout */}
      {(canBet || (isPreflop || canCall)) && (
        <div className="grid grid-cols-5 gap-2">
          {betSizes.map((bet, index) => {
            const isRaise = isPreflop || canCall;
            const action = isRaise ? "raise" : "bet";
            const isOptimal = optimalActions.includes(action as Action);
            const isSelected = isCorrect !== null && isOptimal;
            
            // Darker red for bigger sizes
            const redShade = index === 4 ? "bg-red-900" : 
                           index === 3 ? "bg-red-800" : 
                           index === 2 ? "bg-red-700" : 
                           index === 1 ? "bg-red-600" : 
                           "bg-red-500";
            
            return (
              <button
                key={index}
                onClick={() => {
                  // For bet/raise actions, selectAction will show bet sizing modal
                  // We'll handle bet size through the modal
                  selectAction(action);
                  // Auto-confirm bet size after a brief delay if modal opens
                  if ((action === "bet" || action === "raise") && bet.size) {
                    setTimeout(() => {
                      const state = useGameStore.getState();
                      if (state.showBetSizingModal) {
                        useGameStore.getState().confirmBetSize(bet.size);
                      }
                    }, 100);
                  }
                }}
                className={`${redShade} hover:brightness-110 py-3 px-2 text-sm font-semibold rounded transition-all duration-200 border ${
                  isSelected
                    ? "border-green-500 shadow-lg shadow-green-500/50"
                    : isCorrect !== null && !isOptimal
                    ? "border-red-500"
                    : "border-red-800"
                } text-white`}
              >
                {bet.label === "All-in" ? "AI" : bet.label}
                <div className="text-xs mt-1 opacity-90">{bet.size} bb</div>
                {isSelected && (
                  <span className="text-green-300 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

