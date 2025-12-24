"use client";

import { Card } from "@/lib/gto";
import { cn } from "@/lib/utils";

interface PokerCardProps {
  card: Card;
  className?: string;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
}

const suitSymbols: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const suitColors: Record<string, string> = {
  hearts: "text-red-600",
  diamonds: "text-red-600",
  clubs: "text-gray-900",
  spades: "text-gray-900",
};

const sizeClasses = {
  sm: "w-12 h-16 text-xs",
  md: "w-16 h-24 text-sm",
  lg: "w-20 h-32 text-base",
};

export function PokerCard({ card, className, size = "md", faceDown = false }: PokerCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-gray-800 bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg flex items-center justify-center",
          sizeClasses[size],
          className
        )}
      >
        <div className="text-white text-2xl">🂠</div>
      </div>
    );
  }

  const suitSymbol = suitSymbols[card.suit];
  const suitColor = suitColors[card.suit];
  const rank = card.rank;

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-gray-800 bg-white shadow-lg flex flex-col items-center justify-between relative",
        sizeClasses[size],
        className
      )}
    >
      {/* Top rank */}
      <div className={cn("font-bold absolute top-1 left-1", suitColor, size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base")}>
        {rank}
      </div>
      {/* Center suit */}
      <div className={cn("flex-1 flex items-center justify-center", suitColor, size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl")}>
        {suitSymbol}
      </div>
      {/* Bottom rank (rotated) */}
      <div className={cn("font-bold absolute bottom-1 right-1 rotate-180", suitColor, size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base")}>
        {rank}
      </div>
    </div>
  );
}

