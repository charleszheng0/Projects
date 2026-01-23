"use client";

import { useEffect, useState } from "react";

interface FoldAnimationProps {
  isFolding: boolean;
  onComplete?: () => void;
}

/**
 * Fold Animation - Cards fade and slide toward muck
 */
export function FoldAnimation({ isFolding, onComplete }: FoldAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isFolding) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onComplete?.();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isFolding, onComplete]);

  if (!isAnimating) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-40"
      style={{
        animation: "foldAnimation 0.25s ease-out forwards",
      }}
    >
      <style jsx>{`
        @keyframes foldAnimation {
          0% {
            opacity: 1;
            transform: translate(0, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-20px, 10px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}

