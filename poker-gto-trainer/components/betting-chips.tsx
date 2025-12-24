"use client";

import { useEffect, useState } from "react";

interface BettingChipsProps {
  amountBB: number;
  fromSeat: number;
  totalSeats: number;
  isAnimating: boolean;
}

export function BettingChips({ amountBB, fromSeat, totalSeats, isAnimating }: BettingChipsProps) {
  const [showChips, setShowChips] = useState(false);

  useEffect(() => {
    if (isAnimating && amountBB > 0) {
      setShowChips(true);
    } else {
      setShowChips(false);
    }
  }, [isAnimating, amountBB]);

  if (!showChips || amountBB === 0) {
    return null;
  }

  // Calculate position of the betting player
  const angle = (fromSeat / totalSeats) * 2 * Math.PI - Math.PI / 2;
  const radius = 0.35;
  const fromX = Math.cos(angle) * radius;
  const fromY = Math.sin(angle) * radius;

  // Center of table (where chips land)
  const toX = 0;
  const toY = 0;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        left: `${50 + fromX * 100}%`,
        top: `${50 + fromY * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Animated chips flying to center */}
      <div
        className={`absolute transition-all duration-500 ease-out ${
          isAnimating ? "animate-[slideToCenter_0.5s_ease-out_forwards]" : ""
        }`}
        style={{
          animation: isAnimating
            ? `slideToCenter 0.5s ease-out forwards`
            : "none",
        }}
      >
        {/* Chip stack visualization */}
        <div className="flex flex-col items-center gap-0.5">
          {/* Multiple chips for visual effect */}
          {Array.from({ length: Math.min(Math.ceil(amountBB / 5), 5) }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-yellow-300 bg-yellow-500 shadow-lg"
              style={{
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                <span className="text-black text-xs font-bold">{amountBB}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideToCenter {
          from {
            transform: translate(0, 0);
            opacity: 1;
          }
          to {
            transform: translate(${(toX - fromX) * 100}%, ${(toY - fromY) * 100}%);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

