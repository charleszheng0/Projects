"use client";

import { useEffect, useState } from "react";

interface ChipAnimationProps {
  amount: number;
  fromSeat: number;
  toPot: boolean;
  onComplete?: () => void;
}

/**
 * Chip Animation - Animates chips moving from player to pot
 */
export function ChipAnimation({ amount, fromSeat, toPot, onComplete }: ChipAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, 300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isAnimating) return null;

  const chipCount = Math.max(1, Math.min(Math.ceil(amount / 5), 5));

  return (
    <div 
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
      style={{
        animation: "chipMoveToPot 0.3s ease-out forwards",
      }}
    >
      {Array.from({ length: chipCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-6 h-6 rounded-full border-2 border-yellow-300 bg-yellow-500 shadow-lg"
          style={{
            animationDelay: `${i * 20}ms`,
            transform: `translate(${(i - chipCount / 2) * 8}px, ${i * 2}px)`,
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
        </div>
      ))}
      <style jsx>{`
        @keyframes chipMoveToPot {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(0, -100px) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}

