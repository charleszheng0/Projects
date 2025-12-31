"use client";

import { useGameStore } from "@/store/game-store";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";
import { getRealisticFrequencies, ActionFrequency } from "@/lib/gto-frequencies";
import { useState, useEffect } from "react";
import { formatBB } from "@/lib/utils";
import { validateAction, getAvailableActions } from "@/lib/action-validation";
import { ContinueButton } from "./continue-button";

/**
 * Determine correctness level based on EV loss and isCorrect flag
 */
function getCorrectnessLevel(isCorrect: boolean | null, evLoss: number): "correct" | "best-move" | "inaccuracy" | "mistake" | "blunder" | null {
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
 * Get correctness label text
 */
function getCorrectnessLabel(level: "correct" | "best-move" | "inaccuracy" | "mistake" | "blunder" | null): string {
  switch (level) {
    case "best-move": return "Best Move";
    case "correct": return "Correct";
    case "inaccuracy": return "Inaccuracy";
    case "mistake": return "Mistake";
    case "blunder": return "Blunder";
    default: return "";
  }
}

/**
 * Get correctness label color
 */
function getCorrectnessColor(level: "correct" | "best-move" | "inaccuracy" | "mistake" | "blunder" | null): string {
  switch (level) {
    case "best-move": return "text-green-400";
    case "correct": return "text-green-300";
    case "inaccuracy": return "text-yellow-400";
    case "mistake": return "text-orange-400";
    case "blunder": return "text-red-400";
    default: return "";
  }
}

/**
 * GTO Wizard-style action buttons with perfect morphing animations
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
    confirmBetSize,
    optimalActions, 
    isCorrect,
    lastAction,
    betSizeBB,
    evLoss,
    playerBetsBB,
    playerSeat
  } = useGameStore();
  
  const [selectedAction, setSelectedAction] = useState<{action: string, betSize?: number} | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"idle" | "morphing" | "complete">("idle");

  // Trigger feedback animation when user makes a choice
  useEffect(() => {
    if (isCorrect !== null && lastAction !== null && !isPlayerTurn) {
      // Start morphing animation
      setShowFeedback(true);
      setAnimationPhase("morphing");
      
      // Complete morphing after 220ms (matching GTO Wizard timing)
      const morphTimer = setTimeout(() => {
        setAnimationPhase("complete");
      }, 220);
      
      return () => clearTimeout(morphTimer);
    } else if (isPlayerTurn) {
      // Reset when new action available
      setShowFeedback(false);
      setAnimationPhase("idle");
      setSelectedAction(null);
    } else {
      setShowFeedback(false);
      setAnimationPhase("idle");
    }
  }, [isCorrect, lastAction, isPlayerTurn]);

  // CRITICAL: Show buttons when it's player's turn OR when showing feedback
  // But disable all buttons when not player's turn
  if (!playerHand) {
    return null;
  }
  
  // Show buttons even when showing feedback, but disable them if not player's turn
  const buttonsDisabled = !isPlayerTurn && !showFeedback;
  
  if (!isPlayerTurn && !showFeedback) {
    // Don't show buttons when not player's turn and not showing feedback
    return null;
  }

  // CRITICAL: Use validation system to determine available actions
  const isPreflop = gameStage === "preflop";
  const playerCurrentBet = playerBetsBB?.[playerSeat] || 0;
  const availableActions = getAvailableActions(
    gameStage,
    actionToFace,
    currentBet,
    playerCurrentBet,
    isPreflop
  );
  
  const canCheck = availableActions.includes("check");
  const canBet = availableActions.includes("bet");
  const canCall = availableActions.includes("call");
  const canFold = availableActions.includes("fold");
  const canRaise = availableActions.includes("raise");

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
  let availableFrequencies = actionFrequencies.filter(freq => {
    if (freq.action === "fold" && !canFold) return false;
    if (freq.action === "check" && !canCheck) return false;
    if (freq.action === "call" && !canCall) return false;
    if (freq.action === "bet" && !canBet) return false;
    if (freq.action === "raise" && !canRaise) return false;
    return true;
  });

  // Create default buttons if no frequencies calculated
  if (availableFrequencies.length === 0) {
    const defaultButtons: ActionFrequency[] = [];
    
    if (canFold) {
      defaultButtons.push({
        action: "fold",
        frequency: 0,
        label: "FOLD"
      });
    }
    
    if (canCall) {
      defaultButtons.push({
        action: "call",
        frequency: 0,
        label: `CALL ${currentBet > 0 ? `${formatBB(currentBet)} BB` : ""}`
      });
    }
    
    if (canCheck) {
      defaultButtons.push({
        action: "check",
        frequency: 0,
        label: "CHECK"
      });
    }
    
    if (canBet) {
      const betSizes = [
        { size: Math.round((pot * 0.33) * 10) / 10 },
        { size: Math.round((pot * 0.67) * 10) / 10 },
        { size: Math.round((pot * 1.3) * 10) / 10 },
      ];
      
      betSizes.forEach(betSize => {
        defaultButtons.push({
          action: "bet",
          betSize: betSize.size,
          frequency: 0,
          label: `BET ${formatBB(betSize.size)} BB`
        });
      });
      
      const allInSize = playerStackBB || pot * 10;
      defaultButtons.push({
        action: "bet",
        betSize: allInSize,
        frequency: 0,
        label: `ALLIN ${formatBB(allInSize)} BB`
      });
    }
    
    if (canRaise) {
      // Calculate minimum raise amount
      const minRaiseAmount = currentBet > 0 ? currentBet * 2 : bigBlind * 2;
      
      // Get player's remaining stack (stack minus current bet)
      const currentPlayerBet = playerBetsBB?.[playerSeat] || 0;
      const remainingStack = Math.max(0, (playerStackBB || 100) - currentPlayerBet);
      
      // Calculate raise sizes as increments above current bet
      // Ensure each raise size is unique and properly incremented
      const raiseSizes: number[] = [];
      
      if (currentBet > 0) {
        // When facing a bet, calculate raises as increments above current bet
        const increment = Math.max(bigBlind, Math.round(currentBet * 0.5 * 10) / 10); // Minimum increment
        
        // 2.5x raise (minimum)
        const raise25x = Math.max(minRaiseAmount, Math.round(currentBet * 2.5 * 10) / 10);
        if (raise25x > currentBet && !raiseSizes.includes(raise25x)) {
          raiseSizes.push(raise25x);
        }
        
        // 3x raise
        const raise3x = Math.round(currentBet * 3 * 10) / 10;
        if (raise3x > currentBet && !raiseSizes.includes(raise3x)) {
          raiseSizes.push(raise3x);
        }
        
        // 4x raise
        const raise4x = Math.round(currentBet * 4 * 10) / 10;
        if (raise4x > currentBet && !raiseSizes.includes(raise4x)) {
          raiseSizes.push(raise4x);
        }
        
        // Pot-sized raise
        const potRaise = Math.round((pot + currentBet) * 10) / 10;
        if (potRaise > currentBet && !raiseSizes.includes(potRaise)) {
          raiseSizes.push(potRaise);
        }
      } else {
        // Preflop or no bet - use pot-based sizing
        const pot33 = Math.round((pot * 0.33) * 10) / 10;
        const pot67 = Math.round((pot * 0.67) * 10) / 10;
        const pot130 = Math.round((pot * 1.3) * 10) / 10;
        
        // Ensure minimum raise and uniqueness
        if (pot33 >= minRaiseAmount && !raiseSizes.includes(pot33)) {
          raiseSizes.push(pot33);
        }
        if (pot67 >= minRaiseAmount && pot67 !== pot33 && !raiseSizes.includes(pot67)) {
          raiseSizes.push(pot67);
        }
        if (pot130 >= minRaiseAmount && pot130 !== pot67 && pot130 !== pot33 && !raiseSizes.includes(pot130)) {
          raiseSizes.push(pot130);
        }
        
        // If we don't have enough unique sizes, add increments
        if (raiseSizes.length < 3) {
          let nextSize = minRaiseAmount;
          while (raiseSizes.length < 3 && nextSize < (playerStackBB || 200)) {
            if (!raiseSizes.includes(nextSize)) {
              raiseSizes.push(nextSize);
            }
            nextSize = Math.round((nextSize + bigBlind) * 10) / 10;
          }
        }
      }
      
      // Sort raise sizes and add buttons
      // Calculate total bet size (current bet + raise amount)
      raiseSizes.sort((a, b) => a - b).forEach(raiseSize => {
        // raiseSize is the total bet amount, not the raise increment
        const totalBetSize = raiseSize;
        const raiseIncrement = totalBetSize - currentBet;
        
        // Only show if raise increment is valid and within stack
        if (totalBetSize > currentBet && raiseIncrement <= remainingStack && totalBetSize <= (playerStackBB || 200)) {
          defaultButtons.push({
            action: "raise",
            betSize: totalBetSize,
            frequency: 0,
            label: `RAISE ${formatBB(totalBetSize)} BB`
          });
        }
      });
      
      // Add all-in if it's different and valid
      const allInSize = remainingStack + currentPlayerBet; // Total stack including current bet
      if (allInSize > currentBet && !raiseSizes.includes(allInSize) && allInSize > 0) {
        defaultButtons.push({
          action: "raise",
          betSize: allInSize,
          frequency: 0,
          label: `ALLIN ${formatBB(allInSize)} BB`
        });
      }
    }
    
    availableFrequencies = defaultButtons;
  }

  const handleActionClick = (frequency: ActionFrequency) => {
    // CRITICAL: Validate action before proceeding
    if (!isPlayerTurn) {
      return; // Don't allow actions when not player's turn
    }
    
    // Get current state for validation
    const state = useGameStore.getState();
    const playerCurrentBet = state.playerBetsBB?.[state.playerSeat] || 0;
    
    // Validate action
    const validation = validateAction(
      frequency.action as Action | BettingAction,
      gameStage,
      actionToFace,
      currentBet,
      playerCurrentBet,
      playerStackBB || 100,
      bigBlind,
      frequency.betSize
    );
    
    if (!validation.isValid) {
      console.warn("Invalid action:", validation.error);
      return; // Don't proceed with invalid action
    }
    
    setSelectedAction({ action: frequency.action, betSize: frequency.betSize });
    
    if (frequency.action === "fold" || frequency.action === "check" || frequency.action === "call") {
      // Direct actions - no bet sizing needed
      selectAction(frequency.action);
    } else if (frequency.action === "bet" || frequency.action === "raise") {
      // Bet/raise actions - if betSize is provided, use it directly (like fold/call)
      // Otherwise, open bet sizing modal
      if (frequency.betSize && frequency.betSize > 0) {
        // Use solver-provided bet size directly
        // Set pendingAction first without opening modal, then confirm bet size
        useGameStore.setState({ 
          pendingAction: frequency.action as Action,
          showBetSizingModal: false // Ensure modal is closed
        });
        // Now confirmBetSize will work because pendingAction is set
        confirmBetSize(frequency.betSize);
      } else {
        // No bet size provided - open modal for user input
        selectAction(frequency.action);
      }
    }
  };

  const getActionButtonClass = (frequency: ActionFrequency, isSelected: boolean, isCorrect: boolean | null) => {
    const baseClass = "relative py-4 px-4 text-base font-semibold rounded-lg transition-all duration-[220ms] border-2 w-full ";
    
    // Morphing animation classes
    const morphClass = animationPhase === "morphing" ? "scale-[1.02]" : animationPhase === "complete" ? "scale-100" : "scale-100";
    
    if (frequency.action === "fold") {
      return baseClass + morphClass + (isSelected
        ? (isCorrect ? " bg-gray-600 border-green-500 shadow-lg shadow-green-500/50" : " bg-gray-600 border-red-500 shadow-lg shadow-red-500/50")
        : " bg-gray-700 hover:bg-gray-600 border-gray-500");
    } else if (frequency.action === "check") {
      return baseClass + morphClass + (isSelected
        ? (isCorrect ? " bg-green-600 border-green-500 shadow-lg shadow-green-500/50" : " bg-green-600 border-red-500 shadow-lg shadow-red-500/50")
        : " bg-green-600 hover:bg-green-700 border-green-700");
    } else if (frequency.action === "call") {
      return baseClass + morphClass + (isSelected
        ? (isCorrect ? " bg-green-600 border-green-500 shadow-lg shadow-green-500/50" : " bg-green-600 border-red-500 shadow-lg shadow-red-500/50")
        : " bg-green-600 hover:bg-green-700 border-green-700");
    } else if (frequency.action === "bet" || frequency.action === "raise") {
      // All bet/raise buttons are red with hover effect similar to fold/check
      return baseClass + morphClass + (isSelected
        ? (isCorrect ? " bg-red-600 border-green-500 shadow-lg shadow-green-500/50" : " bg-red-600 border-red-500 shadow-lg shadow-red-500/50")
        : " bg-red-600 hover:bg-red-700 border-red-700");
    }
    return baseClass + morphClass + "bg-gray-700 border-gray-600";
  };

  // Separate buttons into groups
  const foldCallButtons = availableFrequencies.filter(f => f.action === "fold" || f.action === "call" || f.action === "check");
  const raiseBetButtons = availableFrequencies.filter(f => f.action === "bet" || f.action === "raise");
  
  // Sort raise/bet buttons by size
  const sortedRaiseBetButtons = [...raiseBetButtons].sort((a, b) => {
    const aSize = a.betSize || 0;
    const bSize = b.betSize || 0;
    if (a.label.includes("ALLIN") && !b.label.includes("ALLIN")) return 1;
    if (b.label.includes("ALLIN") && !a.label.includes("ALLIN")) return -1;
    return aSize - bSize;
  });

  // Show frequencies after user makes a choice
  const shouldShowFrequencies = isCorrect !== null && lastAction !== null && optimalActions.length > 0;

  // Calculate correctness level
  const correctnessLevel = getCorrectnessLevel(isCorrect, Math.abs(evLoss || 0));
  const correctnessLabel = getCorrectnessLabel(correctnessLevel);
  const correctnessColor = getCorrectnessColor(correctnessLevel);

  const renderButton = (freq: ActionFrequency, idx: number) => {
    const isSelected = selectedAction?.action === freq.action && 
                     selectedAction?.betSize === freq.betSize &&
                     lastAction === freq.action &&
                     (freq.betSize ? betSizeBB === freq.betSize : true) &&
                     isCorrect !== null;
    
    const showFrequency = shouldShowFrequencies && freq.frequency > 0;
    
    return (
      <div key={`action-${idx}`} className="relative">
        {/* Correctness Label - slides up above selected button */}
        {isSelected && correctnessLabel && showFeedback && (
          <div 
            className={`absolute -top-10 left-1/2 -translate-x-1/2 ${correctnessColor} text-sm font-bold whitespace-nowrap px-3 py-1 rounded-full bg-gray-900/90 backdrop-blur-sm border border-gray-700 transition-all duration-[150ms] ${
              animationPhase === "complete" 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 -translate-y-2"
            }`}
            style={{
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {correctnessLabel}
          </div>
        )}
        
        <button
          onClick={() => handleActionClick(freq)}
          className={getActionButtonClass(freq, isSelected || false, isCorrect)}
          disabled={buttonsDisabled || (showFeedback && !isSelected)}
          style={{ 
            transition: "all 220ms cubic-bezier(0.25, 0.1, 0.25, 1.0)",
            opacity: (buttonsDisabled || (showFeedback && !isSelected)) ? 0.5 : 1,
            cursor: (buttonsDisabled || (showFeedback && !isSelected)) ? "not-allowed" : "pointer"
          }}
          title={buttonsDisabled ? "Not your turn" : ""}
        >
          {/* Action Label - fades out during morph */}
          <span 
            className="font-semibold text-base transition-opacity duration-[100ms]"
            style={{
              opacity: animationPhase === "morphing" || animationPhase === "complete" ? 0 : 1
            }}
          >
            {freq.label}
          </span>
          
          {/* Frequency - fades in after morph */}
          {showFrequency && (
            <span 
              className="text-xs font-normal absolute bottom-2 right-2 transition-opacity duration-[120ms]"
              style={{
                opacity: animationPhase === "complete" ? 0.9 : 0,
                transitionTimingFunction: "cubic-bezier(0.33, 0.0, 0.67, 1.0)"
              }}
            >
              {freq.frequency.toFixed(1)}%
            </span>
          )}
          
          {/* Correctness indicators */}
          {isSelected && isCorrect && animationPhase === "complete" && (
            <span className="absolute top-2 right-2 text-green-300 text-sm font-bold">✓</span>
          )}
          {isSelected && !isCorrect && animationPhase === "complete" && (
            <span className="absolute top-2 right-2 text-red-300 text-sm font-bold">✗</span>
          )}
        </button>
      </div>
    );
  };

  if (availableFrequencies.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3 relative z-10">
      {/* Correct Frequencies Label - fades in after morph */}
      {shouldShowFrequencies && (
        <div 
          className="flex items-center justify-center transition-all duration-[120ms]"
          style={{
            opacity: animationPhase === "complete" ? 1 : 0,
            transform: animationPhase === "complete" ? "translateY(0)" : "translateY(-10px)",
            transitionTimingFunction: "cubic-bezier(0.33, 0.0, 0.67, 1.0)"
          }}
        >
          <div className="bg-teal-600/20 border border-teal-500 px-3 py-1 rounded text-teal-300 text-sm font-semibold">
            CORRECT FREQUENCIES
          </div>
        </div>
      )}

      {/* Top Row: Fold and Call Buttons */}
      {foldCallButtons.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {foldCallButtons.map((freq, idx) => renderButton(freq, idx))}
        </div>
      )}

      {/* Bottom Row: Raise/Bet Buttons */}
      {sortedRaiseBetButtons.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {sortedRaiseBetButtons.map((freq, idx) => renderButton(freq, foldCallButtons.length + idx))}
        </div>
      )}
      
      {/* Continue Button - appears after action */}
      <ContinueButton />
    </div>
  );
}
