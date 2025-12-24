"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";

export function BetSizingModal() {
  const { showBetSizingModal, pendingAction, gameStage, pot, bigBlind, playerStackBB, confirmBetSize, cancelBetSize } = useGameStore();
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
      // Post-flop: pot percentages (33%, 50%, 66%, 75%, 100%)
      return [
        Math.max(1, Math.round(pot * 0.33)),
        Math.max(1, Math.round(pot * 0.5)),
        Math.max(1, Math.round(pot * 0.66)),
        Math.max(1, Math.round(pot * 0.75)),
        Math.max(1, Math.round(pot * 1.0)),
        Math.max(1, Math.round(pot * 1.5)), // Overbet option
      ].filter(size => size <= maxBet);
    }
  };

  const handleConfirm = () => {
    const finalValue = inputValue ? parseInt(inputValue) || betSizeBB : betSizeBB;
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
    setInputValue(""); // Clear input when quick size is selected
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Always allow typing/deleting
    
    // Parse and validate
    if (value === "") {
      // Allow empty input for deletion
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= maxBet) {
      setBetSizeBB(numValue);
    }
  };

  const quickSizes = getQuickSizes();
  
  const getSizeLabel = (size: number) => {
    if (isPreflop) {
      return `${size} BB`;
    } else {
      const percent = pot > 0 ? Math.round((size / pot) * 100) : 0;
      return `${size} BB (${percent}% pot)`;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 animate-in fade-in duration-200"
      onClick={handleCancel}
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
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">
                {isPreflop ? "Quick Sizes (BB):" : "Quick Sizes (Pot-Relative):"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickSizes.map((size) => (
                  <Button
                    key={size}
                    variant={betSizeBB === size && !inputValue ? "default" : "outline"}
                    onClick={() => handleQuickSizeClick(size)}
                    className={
                      betSizeBB === size && !inputValue
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-800"
                    }
                    disabled={size > maxBet}
                  >
                    {getSizeLabel(size)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Custom Size:</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max={maxBet}
                  value={inputValue || betSizeBB}
                  onChange={handleInputChange}
                  onBlur={() => {
                    // If input is empty or invalid, reset to current betSizeBB
                    if (!inputValue || isNaN(parseInt(inputValue))) {
                      setInputValue("");
                    }
                  }}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder={betSizeBB.toString()}
                />
                <span className="text-gray-400 self-center">BB</span>
              </div>
              <div className="flex justify-between text-xs">
                <p className="text-gray-500">
                  Max: {maxBet} BB (Your stack)
                </p>
                {!isPreflop && pot > 0 && (
                  <p className="text-gray-400">
                    {betSizePotPercent}% of pot ({pot} BB)
                  </p>
                )}
              </div>
            </div>

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
                disabled={(inputValue ? (parseInt(inputValue) || betSizeBB) : betSizeBB) < 1 || (inputValue ? (parseInt(inputValue) || betSizeBB) : betSizeBB) > maxBet}
              >
                Confirm {(inputValue ? (parseInt(inputValue) || betSizeBB) : betSizeBB)} BB
                {!isPreflop && pot > 0 && ` (${Math.round(((inputValue ? (parseInt(inputValue) || betSizeBB) : betSizeBB) / pot) * 100)}% pot)`}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

