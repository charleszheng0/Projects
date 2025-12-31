"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { bettingRoundClosed } from "@/lib/action-engine";
import { convertToActionEngineState } from "@/lib/game-state-adapter";

/**
 * Continue button that appears after user action
 * Allows user to proceed when ready (no auto-advance)
 */
export function ContinueButton() {
  const {
    isCorrect,
    lastAction,
    isPlayerTurn,
    gameStage,
    processOpponentActions,
    advanceToNextStreet,
    dealNewHand,
    foldedPlayers,
    playerSeat,
    isPausedForReview,
    userClickedContinue,
  } = useGameStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // CRITICAL: Only show when paused for review (explicit user-gated progression)
  // This gates progression but NEVER blocks action buttons
  if (!isPausedForReview || isPlayerTurn) {
    return null;
  }
  
  // Check if player folded
  const playerFolded = foldedPlayers?.[playerSeat] || false;
  
  // Check if river betting round is complete (hand is finished)
  const state = useGameStore.getState();
  const engineState = convertToActionEngineState();
  const isRiverComplete = gameStage === "river" && bettingRoundClosed(engineState);
  
  const handleContinue = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // CRITICAL: User clicked continue - unpause progression
      userClickedContinue();
      
      const currentState = useGameStore.getState();
      
      // If player folded, deal new hand
      if (playerFolded || currentState.foldedPlayers[currentState.playerSeat]) {
        dealNewHand();
        setIsProcessing(false);
        return;
      }
      
      // CRITICAL: Reset feedback state before processing to allow next action
      useGameStore.setState({
        isCorrect: null,
        lastAction: null,
        feedback: null,
        evLoss: 0,
        isPausedForReview: false, // Unpause
      });
      
      // Process opponent actions
      await processOpponentActions();
      
      // Check state after processing
      const stateAfterProcessing = useGameStore.getState();
      
      // If it's player's turn again, ensure feedback is cleared and return
      if (stateAfterProcessing.isPlayerTurn) {
        // Ensure feedback state is cleared for new action
        useGameStore.setState({
          isCorrect: null,
          lastAction: null,
          feedback: null,
          isPausedForReview: false, // Unpause
        });
        setIsProcessing(false);
        return;
      }
      
      // Check if betting round is closed
      const activeOpponents = stateAfterProcessing.foldedPlayers
        .map((folded, seat) => !folded && seat !== stateAfterProcessing.playerSeat ? seat : null)
        .filter((seat): seat is number => seat !== null);
      
      // Check if river is complete (hand finished)
      const engineStateAfter = convertToActionEngineState();
      const isRiverCompleteAfter = stateAfterProcessing.gameStage === "river" && bettingRoundClosed(engineStateAfter);
      
      if (isRiverCompleteAfter) {
        // River complete - deal new hand
        dealNewHand();
      } else if (activeOpponents.length === 0) {
        // No active opponents - advance to next street
        advanceToNextStreet();
      } else {
        // Betting round closed but opponents still active - advance to next street
        advanceToNextStreet();
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error("Error continuing:", error);
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex justify-center mt-4">
      <Button
        onClick={handleContinue}
        disabled={isProcessing}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processing..." : (playerFolded || isRiverComplete) ? "Next Hand" : "Continue"}
      </Button>
    </div>
  );
}

