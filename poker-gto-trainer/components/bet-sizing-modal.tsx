"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";

export function BetSizingModal() {
  const { showBetSizingModal, pendingAction, gameStage, pot, bigBlind, playerStackBB, confirmBetSize, cancelBetSize, showFeedbackModal } = useGameStore();
  const isPreflop = gameStage === "preflop";
  
  // Calculate default bet size based on stage
  const getDefaultBetSize = () => {
    if (isPreflop) return 3;
    // Post-flop: default to 50% pot
    return Math.max(1, Math.round(pot * 0.5));
  };
  
  const [betSizeBB, setBetSizeBB] = useState<number>(getDefaultBetSize());
  const [inputValue, setInputValue] = useState<string>("");

  // Reset input when modal opens
  useEffect(() => {
    if (showBetSizingModal) {
      setBetSizeBB(getDefaultBetSize());
      setInputValue("");
    }
  }, [showBetSizingModal, gameStage, pot]);

  if (!showBetSizingModal || !pendingAction) {
    return null;
  }

  const maxBet = playerStackBB;
  
  // Calculate pot percentage for current bet size
  const betSizePotPercent = pot > 0 ? Math.round((betSizeBB / pot) * 100) : 0;
  
  // Generate quick sizes based on stage
  const getQuickSizes = () => {
    if (isPreflop) {
      return [2, 3, 5, 10, 20, 50]; // Fixed BB amounts for preflop
    } else {
      // Post-flop: MIN, 1/2 pot, 3/4 pot, POT, MAX (similar to betonline)
      const minBet = Math.max(1, Math.ceil(pot * 0.33)); // Minimum bet (round up)
      const halfPot = Math.max(1, Math.ceil(pot * 0.5)); // Half pot (round up)
      const threeQuarterPot = Math.max(1, Math.ceil(pot * 0.75)); // 3/4 pot (round up)
      const fullPot = Math.max(1, Math.ceil(pot * 1.0)); // Full pot
      const maxBetAmount = maxBet; // Maximum bet (player's stack)
      
      const sizes = [
        minBet,
        halfPot,
        threeQuarterPot,
        fullPot,
        maxBetAmount,
      ]
        .filter(size => size >= 1 && size <= maxBet)
        .filter((size, index, self) => self.indexOf(size) === index); // Remove duplicates
      
      return sizes;
    }
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
    if (finalValue > 0 && finalValue <= maxBet) {
      confirmBetSize(finalValue);
      setBetSizeBB(getDefaultBetSize()); // Reset for next time
      setInputValue(""); // Clear input
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
                ? `Select the number of big blinds (BBs) to ${pendingAction === "bet" ? "bet" : "raise"}`
                : `Select bet size (pot size: ${pot} BB). Bet sizing is pot-relative on post-flop streets.`
              }
            </p>

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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={getEffectiveBetSize() < 1 || getEffectiveBetSize() > maxBet}
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

