"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerCard } from "./poker-card";
import { ActionIndicator } from "./action-indicator";
import { FoldAnimation } from "./fold-animation";
import { getPositionFromSeat } from "@/lib/gto";
import { formatBB } from "@/lib/utils";
import { getHandRankName } from "@/lib/hand-rank";
import { Eye, EyeOff } from "lucide-react";

export function PokerTable() {
  const { 
    playerHand, 
    opponentHands,
    numPlayers, 
    playerPosition, 
    playerSeat,
    playerStackBB, 
    playerStacksBB, 
    playerBetsBB,
    pot, 
    currentBet,
    bigBlind, 
    gameStage, 
    communityCards,
    smallBlindSeat,
    bigBlindSeat,
    buttonSeat,
    actionToFace,
    showFeedbackModal,
    foldedPlayers,
    lastActorSeat,
    currentActorSeat,
    isPlayerTurn,
    actionHistory,
    animationState,
    showPlayerHand,
    setShowPlayerHand,
  } = useGameStore();

  // Create array of player positions around the table
  const playerPositions = Array.from({ length: numPlayers }, (_, i) => i);
  
  // Ensure arrays are initialized with defaults
  const safePlayerStacksBB = playerStacksBB || Array(numPlayers).fill(100);
  const safePlayerBetsBB = playerBetsBB || Array(numPlayers).fill(0);
  const safeFoldedPlayers = foldedPlayers || Array(numPlayers).fill(false);
  
  // Animation states
  const [dealingAnimation, setDealingAnimation] = useState(false);
  const [potAnimation, setPotAnimation] = useState(false);
  const [previousPot, setPreviousPot] = useState(pot);
  
  // Handle dealing animation when new hand starts
  useEffect(() => {
    if (playerHand && animationState === "dealing") {
      setDealingAnimation(true);
      const timer = setTimeout(() => {
        setDealingAnimation(false);
      }, numPlayers * 2 * 200 + 500); // 200ms per card, 2 cards per player + buffer
      return () => clearTimeout(timer);
    }
  }, [playerHand, animationState, numPlayers]);
  
  // Handle pot update animation
  useEffect(() => {
    if (pot !== previousPot) {
      setPotAnimation(true);
      const timer = setTimeout(() => {
        setPotAnimation(false);
        setPreviousPot(pot);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pot, previousPot]);

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[16/9]">
      {/* Abstract curved table */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-[52%] h-[38%] w-[90%] -translate-x-1/2 rounded-[999px] border border-[#2e3a59] bg-gradient-to-b from-[#2e3a59]/40 to-transparent shadow-[0_-8px_24px_rgba(0,0,0,0.6)]" />
        <div className="absolute left-1/2 top-[54%] h-[32%] w-[84%] -translate-x-1/2 rounded-[999px] border border-[#3a3a3a]/60" />
      </div>
        
      {/* Pot + community cards */}
      <div className="absolute left-1/2 top-[22%] -translate-x-1/2 flex flex-col items-center gap-3">
        <div className={`text-white text-2xl font-semibold transition-all duration-200 ${
          potAnimation ? "scale-110" : "scale-100"
        }`}>
          {formatBB(pot)} bb
        </div>
        {currentBet > 0 && (
          <div className="text-gray-400 text-sm">
            {formatBB(currentBet)} bb to call
          </div>
        )}
        {communityCards.length > 0 && (
          <div className="flex gap-3">
            {communityCards.map((card, index) => (
              <PokerCard
                key={index}
                card={card}
                size="lg"
                className="shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
                style={{
                  animationDelay: `${index * 120}ms`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Player positions along the curve */}
      {playerPositions.map((seat, index) => {
          const angle = (index / numPlayers) * Math.PI + Math.PI;
          const radius = 0.45;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius * 0.45;

          const isPlayerSeat = seat === playerSeat;
          const betBB = Math.max(0, safePlayerBetsBB[seat] || 0); // Ensure betBB is never negative
          // Display stack minus current bet (chips already committed to pot)
          const stackBB = Math.max(0, (safePlayerStacksBB[seat] || 100) - betBB);
          const displayStack = formatBB(stackBB);
          const isSmallBlind = seat === smallBlindSeat;
          const isBigBlind = seat === bigBlindSeat;
          const isButton = seat === buttonSeat;
          const isFolded = safeFoldedPlayers[seat] || false;
          const isActive = !isFolded;
          const justActed = lastActorSeat === seat;
          const isCurrentActor = currentActorSeat === seat;

          return (
            <div
              key={seat}
              className="absolute"
              style={{
                left: `${50 + x * 100}%`,
                top: `${55 + y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Button indicator */}
                {isButton && (
                  <div className="bg-yellow-500 rounded-full w-6 h-6 flex items-center justify-center mb-1 border-2 border-yellow-300">
                    <span className="text-black text-xs font-bold">D</span>
                  </div>
                )}
                
                {/* Player hand cards - positioned near player seat */}
                {isPlayerSeat && playerHand && (
                  <div className="flex gap-1 mb-1 relative">
                    {showPlayerHand ? (
                      <>
                        <PokerCard 
                          card={playerHand.card1} 
                          size="sm"
                          className={dealingAnimation ? "animate-in fade-in slide-in-from-bottom duration-200" : ""}
                          style={{
                            animationDelay: dealingAnimation ? `${seat * 400}ms` : "0ms"
                          }}
                        />
                        <PokerCard 
                          card={playerHand.card2} 
                          size="sm"
                          className={dealingAnimation ? "animate-in fade-in slide-in-from-bottom duration-200" : ""}
                          style={{
                            animationDelay: dealingAnimation ? `${seat * 400 + 200}ms` : "0ms"
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <PokerCard 
                          card={playerHand.card1} 
                          size="sm"
                          faceDown={true}
                          className={dealingAnimation ? "animate-in fade-in slide-in-from-bottom duration-200" : ""}
                          style={{
                            animationDelay: dealingAnimation ? `${seat * 400}ms` : "0ms"
                          }}
                        />
                        <PokerCard 
                          card={playerHand.card2} 
                          size="sm"
                          faceDown={true}
                          className={dealingAnimation ? "animate-in fade-in slide-in-from-bottom duration-200" : ""}
                          style={{
                            animationDelay: dealingAnimation ? `${seat * 400 + 200}ms` : "0ms"
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
                
                {/* Opponent hand cards - face down */}
                {!isPlayerSeat && opponentHands[seat] && !isFolded && (
                  <div className="flex gap-1 mb-1 relative">
                    <PokerCard 
                      card={opponentHands[seat]!.card1} 
                      size="sm" 
                      faceDown={true}
                      className={dealingAnimation ? "animate-in fade-in slide-in-from-bottom duration-200" : ""}
                      style={{
                        animationDelay: dealingAnimation ? `${seat * 400}ms` : "0ms"
                      }}
                    />
                    <PokerCard 
                      card={opponentHands[seat]!.card2} 
                      size="sm" 
                      faceDown={true}
                      className={dealingAnimation ? "animate-in fade-in slide-in-from-bottom duration-200" : ""}
                      style={{
                        animationDelay: dealingAnimation ? `${seat * 400 + 200}ms` : "0ms"
                      }}
                    />
                  </div>
                )}
                
                {/* Fold animation overlay */}
                {isFolded && (
                  <FoldAnimation isFolding={isFolded} />
                )}
                
                {/* Action indicator overlay - shows whose turn it is */}
                {currentActorSeat === seat && !isFolded && (
                  <ActionIndicator 
                    isActive={true} 
                    seat={seat}
                    action={actionHistory[actionHistory.length - 1]?.action as any}
                    betSize={actionHistory[actionHistory.length - 1]?.betSize}
                  />
                )}
                
                {/* Player info - GTO Wizard style: Circular orbs with rings */}
                <div className={`flex flex-col items-center justify-center rounded-xl border px-3 py-2 text-[10px] font-semibold ${
                  isFolded
                    ? "bg-gray-900/40 border-gray-700 text-gray-500"
                    : isPlayerSeat
                      ? "bg-[#1a1a1a] border-emerald-500 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      : isCurrentActor
                        ? "bg-[#1a1a1a] border-blue-500 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                        : "bg-[#1a1a1a] border-gray-700 text-gray-300"
                }`}>
                  <div className="text-[9px] uppercase tracking-wide">
                    {isPlayerSeat ? "You" : getPositionFromSeat(seat, numPlayers)}
                  </div>
                  <div className="font-numeric text-xs text-gray-200">
                    {displayStack} BB
                  </div>
                </div>
                
                {/* Blind indicators */}
                {isSmallBlind && gameStage === "preflop" && (
                  <div className="bg-blue-600 rounded px-2 py-0.5 text-xs font-semibold text-white">
                    SB
                  </div>
                )}
                {isBigBlind && gameStage === "preflop" && (
                  <div className="bg-red-600 rounded px-2 py-0.5 text-xs font-semibold text-white">
                    BB
                  </div>
                )}
                
                {/* Bet display - visual chips (only show if player is active) */}
                {betBB > 0 && !isFolded && (() => {
                  // Ensure at least 1 chip for any bet > 0
                  const chipCount = Math.max(1, Math.min(Math.ceil(betBB / 5), 5));
                  const displayAmount = formatBB(betBB); // Format to avoid floating point issues
                  
                  return (
                    <div className="relative flex flex-col items-center justify-center mt-1 gap-1">
                      {/* Chip stack visualization - properly stacked */}
                      <div className="relative flex items-center justify-center" style={{ height: '32px' }}>
                        {Array.from({ length: chipCount }).map((_, i) => {
                          const offset = i * 2; // Small offset for stacking effect
                          const rotation = i * 2; // Slight rotation for realism
                          
                          return (
                            <div
                              key={i}
                              className="absolute w-7 h-7 rounded-full border-2 border-yellow-300 bg-yellow-500 shadow-lg"
                              style={{
                                transform: `translateY(${-offset}px) rotate(${rotation}deg)`,
                                zIndex: chipCount - i,
                                bottom: 0,
                              }}
                            >
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Bet amount label below chips */}
                      <div className="font-numeric text-yellow-200 text-[10px] font-bold bg-yellow-900/80 px-2 py-0.5 rounded border border-yellow-600 whitespace-nowrap">
                        {displayAmount} BB
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
        
      {/* Visual bet indicators - chips shown at player positions, no text labels */}
      
      {/* Hand strength indicator and toggle - bottom right */}
      {playerHand && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
          {/* Hand strength indicator */}
          <div className="text-white text-xs font-semibold">
            {getHandRankName(playerHand, communityCards, gameStage)}
          </div>
          
          {/* Toggle button - smaller */}
          <button
            onClick={() => setShowPlayerHand(!showPlayerHand)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={showPlayerHand ? "Hide hand" : "Show hand"}
          >
            {showPlayerHand ? (
              <Eye className="w-3 h-3 text-gray-300" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

