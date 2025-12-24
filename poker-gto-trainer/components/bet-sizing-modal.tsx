"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X } from "lucide-react";

export function BetSizingModal() {
  const { showBetSizingModal, pendingAction, bigBlind, playerStackBB, confirmBetSize, cancelBetSize } = useGameStore();
  const [betSizeBB, setBetSizeBB] = useState<number>(3);

  if (!showBetSizingModal || !pendingAction) {
    return null;
  }

  const maxBet = playerStackBB;

  const handleConfirm = () => {
    if (betSizeBB > 0 && betSizeBB <= maxBet) {
      confirmBetSize(betSizeBB);
      setBetSizeBB(3); // Reset for next time
    }
  };

  const quickSizes = [2, 3, 5, 10, 20, 50];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={cancelBetSize}
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
                Choose Raise Size
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelBetSize}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Instructions */}
            <p className="text-gray-400 text-sm">
              Select the number of big blinds (BBs) to raise
            </p>

            {/* Quick Size Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Quick Sizes:</label>
              <div className="grid grid-cols-3 gap-2">
                {quickSizes.map((size) => (
                  <Button
                    key={size}
                    variant={betSizeBB === size ? "default" : "outline"}
                    onClick={() => setBetSizeBB(size)}
                    className={
                      betSizeBB === size
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-800"
                    }
                    disabled={size > maxBet}
                  >
                    {size} BB
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
                  value={betSizeBB}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 1 && value <= maxBet) {
                      setBetSizeBB(value);
                    }
                  }}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <span className="text-gray-400 self-center">BB</span>
              </div>
              <p className="text-xs text-gray-500">
                Max: {maxBet} BB (Your stack)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <Button
                onClick={cancelBetSize}
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
                disabled={betSizeBB < 1 || betSizeBB > maxBet}
              >
                Confirm {betSizeBB} BB
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

