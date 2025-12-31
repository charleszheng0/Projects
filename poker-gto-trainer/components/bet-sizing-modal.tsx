"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";
import { validateAndAdjustBetSize, calculateValidBetSizes } from "@/lib/action-validation";
import { formatBB } from "@/lib/utils";

export function BetSizingModal() {
  const { 
    showBetSizingModal, 
    pendingAction, 
    gameStage, 
    pot, 
    bigBlind, 
    playerStackBB, 
    confirmBetSize, 
    cancelBetSize, 
    showFeedbackModal,
    currentBet,
    playerBetsBB,
    playerSeat
  } = useGameStore();
  const isPreflop = gameStage === "preflop";
  
  // Calculate current player's bet and remaining stack
  const playerCurrentBet = playerBetsBB?.[playerSeat] || 0;
  const remainingStack = Math.max(0, (playerStackBB || 100) - playerCurrentBet);
  
  // Calculate default bet size based on stage
  const getDefaultBetSize = () => {
    if (isPreflop) {
      // Preflop: default to 3x BB
      return Math.max(bigBlind * 2, 3);
    }
    // Post-flop: default to 50% pot
    return Math.max(1, Math.round(pot * 0.5));
  };
  
  const [betSizeBB, setBetSizeBB] = useState<number>(getDefaultBetSize());
  const [inputValue, setInputValue] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset input when modal opens
  useEffect(() => {
    if (showBetSizingModal) {
      const defaultSize = getDefaultBetSize();
      setBetSizeBB(defaultSize);
      setInputValue("");
      setValidationError(null);
    }
  }, [showBetSizingModal, gameStage, pot, currentBet]);
  
  // Validate bet size whenever it changes
  useEffect(() => {
    if (showBetSizingModal && pendingAction && (pendingAction === "bet" || pendingAction === "raise")) {
      const effectiveSize = getEffectiveBetSize();
      if (effectiveSize > 0) {
        const validation = validateAndAdjustBetSize(
          pendingAction,
          effectiveSize,
          gameStage,
          pot,
          currentBet,
          playerCurrentBet,
          remainingStack,
          bigBlind
        );
        
        if (!validation.isValid && validation.error) {
          setValidationError(validation.error);
        } else {
          setValidationError(null);
          // Auto-adjust if needed
          if (validation.adjustedSize !== effectiveSize) {
            setBetSizeBB(validation.adjustedSize);
            setInputValue("");
          }
        }
      }
    }
  }, [betSizeBB, inputValue, showBetSizingModal, pendingAction, gameStage, pot, currentBet, playerCurrentBet, remainingStack, bigBlind]);

  if (!showBetSizingModal || !pendingAction) {
    return null;
  }

  const maxBet = pendingAction === "bet" 
    ? remainingStack 
    : remainingStack + playerCurrentBet; // For raise, can use full stack
  
  // Calculate pot percentage for current bet size
  const betSizePotPercent = pot > 0 ? Math.round((betSizeBB / pot) * 100) : 0;
  
  // Generate quick sizes based on stage - use validation system
  const getQuickSizes = () => {
    if (!pendingAction || (pendingAction !== "bet" && pendingAction !== "raise")) {
      return [];
    }
    
    // Use validation system to calculate valid sizes
    const validSizes = calculateValidBetSizes(
      pendingAction,
      gameStage,
      pot,
      currentBet,
      playerCurrentBet,
      remainingStack,
      bigBlind
    );
    
    // Limit to reasonable number of options
    return validSizes.slice(0, 6);
  };
  
  const getQuickSizeLabel = (size: number, index: number) => {
    if (isPreflop) {
      return `${size} BB`;
    } else {
      // Post-flop labels
      const percent = pot > 0 ? Math.round((size / pot) * 100) : 0;
      if (size === maxBet) {
        return "MAX";
      } else if (size === Math.max(1, Math.ceil(pot * 1.0))) {
        return "POT";
      } else if (size === Math.max(1, Math.ceil(pot * 0.75))) {
        return "3/4";
      } else if (size === Math.max(1, Math.ceil(pot * 0.5))) {
        return "1/2";
      } else if (size === Math.max(1, Math.ceil(pot * 0.33))) {
        return "MIN";
      } else {
        return `${size} BB`;
      }
    }
  };

  const handleConfirm = () => {
    const finalValue = getEffectiveBetSize();
    
    // Validate before confirming
    if (!pendingAction || (pendingAction !== "bet" && pendingAction !== "raise")) {
      return;
    }
    
    const validation = validateAndAdjustBetSize(
      pendingAction,
      finalValue,
      gameStage,
      pot,
      currentBet,
      playerCurrentBet,
      remainingStack,
      bigBlind
    );
    
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid bet size");
      if (validation.adjustedSize) {
        setBetSizeBB(validation.adjustedSize);
        setInputValue("");
      }
      return;
    }
    
    // Use adjusted size if validation adjusted it
    const confirmedSize = validation.adjustedSize;
    if (confirmedSize > 0 && confirmedSize <= remainingStack + playerCurrentBet) {
      confirmBetSize(confirmedSize);
      setBetSizeBB(getDefaultBetSize()); // Reset for next time
      setInputValue(""); // Clear input
      setValidationError(null);
    }
  };

  const handleCancel = () => {
    setInputValue(""); // Clear input
    cancelBetSize();
  };

  const handleQuickSizeClick = (size: number) => {
    setBetSizeBB(size);
    setInputValue(""); // Clear input so user can type fresh if they want
  };
  
  // Get the display value for the input - use inputValue if it exists, otherwise empty
  const getInputDisplayValue = () => {
    return inputValue;
  };
  
  // Get the effective bet size for confirmation
  const getEffectiveBetSize = () => {
    if (inputValue && inputValue !== "") {
      const parsed = parseInt(inputValue);
      return isNaN(parsed) ? betSizeBB : parsed;
    }
    return betSizeBB;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Always allow typing/deleting - this is the source of truth for input
    
    // Only update betSizeBB when there's a valid number
    if (value === "") {
      // Allow empty input for deletion - don't update betSizeBB
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= maxBet) {
      setBetSizeBB(numValue);
    }
  };
  
  const handleInputFocus = () => {
    // When input is focused, clear it so user can type fresh
    if (inputValue === "") {
      setInputValue("");
    }
  };

  const quickSizes = getQuickSizes();
  
  // Calculate slider values
  const minSliderValue = 1;
  const maxSliderValue = maxBet;
  const sliderValue = getEffectiveBetSize();
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= minSliderValue && value <= maxSliderValue) {
      setBetSizeBB(value);
      setInputValue(value.toString()); // Update input to match slider
    }
  };

  return (
    <div 
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 animate-in fade-in duration-200"
      onClick={handleCancel}
      style={{ display: showFeedbackModal ? 'none' : 'flex' }}
    >
      <div 
        className="w-full max-w-md p-4 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-gray-900 border-gray-700 shadow-2xl">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                Choose {pendingAction === "bet" ? "Bet" : "Raise"} Size
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Instructions */}
            <p className="text-gray-400 text-sm">
              {isPreflop 
                ? `Select the number of big blinds (BBs) to ${pendingAction === "bet" ? "bet" : "raise"} (min: ${bigBlind * 2} BB)`
                : pendingAction === "bet"
                ? `Select bet size (pot: ${formatBB(pot)} BB, min: ${Math.max(1, bigBlind)} BB)`
                : `Select raise size (current bet: ${formatBB(currentBet)} BB, min raise: ${formatBB(currentBet * 2)} BB)`
              }
            </p>
            
            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-900/30 border border-red-500 text-red-300 px-3 py-2 rounded text-sm">
                {validationError}
              </div>
            )}

            {/* Quick Size Buttons */}
            <div className="space-y-3">
              <div className="flex gap-2">
                {quickSizes.map((size, index) => {
                  const isSelected = betSizeBB === size && !inputValue;
                  const label = getQuickSizeLabel(size, index);
                  return (
                    <Button
                      key={`bet-size-${size}-${index}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickSizeClick(size)}
                      className={
                        isSelected
                          ? "bg-gray-700 hover:bg-gray-600 text-white flex-1"
                          : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 flex-1"
                      }
                      disabled={size > maxBet}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            
            {/* Slider for fine-tuning bet size */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-8">{minSliderValue}</span>
                <input
                  type="range"
                  min={minSliderValue}
                  max={maxSliderValue}
                  value={sliderValue}
                  onChange={handleSliderChange}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((sliderValue - minSliderValue) / (maxSliderValue - minSliderValue)) * 100}%, #374151 ${((sliderValue - minSliderValue) / (maxSliderValue - minSliderValue)) * 100}%, #374151 100%)`
                  }}
                />
                <span className="text-xs text-gray-400 w-8 text-right">{maxSliderValue}</span>
              </div>
            </div>
            
            {/* Bet Amount Display */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-300">Bet Amount:</label>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max={maxBet}
                  value={getInputDisplayValue()}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={() => {
                    if (inputValue && !isNaN(parseInt(inputValue))) {
                      const parsed = parseInt(inputValue);
                      if (parsed >= 1 && parsed <= maxBet) {
                        setBetSizeBB(parsed);
                      }
                    }
                  }}
                  className="bg-gray-800 border-2 border-purple-500 border-dashed text-white text-center font-semibold"
                  placeholder={betSizeBB.toString()}
                />
                <span className="text-gray-400 font-semibold">BB</span>
              </div>
            </div>

            {/* Pot percentage info */}
            {!isPreflop && pot > 0 && (
              <div className="text-xs text-gray-400 text-center">
                {betSizePotPercent}% of pot ({pot} BB)
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="lg"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant="default"
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={validationError !== null || getEffectiveBetSize() < 1 || getEffectiveBetSize() > maxBet}
              >
                Confirm {getEffectiveBetSize()} BB
                {!isPreflop && pot > 0 && ` (${Math.round((getEffectiveBetSize() / pot) * 100)}% pot)`}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

