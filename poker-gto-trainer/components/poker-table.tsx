"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { PokerCard } from "./poker-card";
import { Badge } from "./ui/badge";
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
    <div className="relative w-full max-w-4xl mx-auto aspect-[16/10]">
      {/* Table surface - GTO Wizard style: Dark charcoal/near-black */}
      <div className="absolute inset-0 rounded-full bg-[#121212] border-4 border-[#1a1a1a]">
        {/* Inner table border - subtle */}
        <div className="absolute inset-2 rounded-full border border-[#1f1f1f]"></div>
        
        {/* Center area for pot and community cards - GTO Wizard style */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          {/* Pot display - Simple centered format like GTO Wizard */}
          <div className={`text-white text-2xl font-semibold transition-all duration-200 ${
            potAnimation ? "scale-110" : "scale-100"
          }`}>
            {formatBB(pot)} bb
          </div>
          
          {/* Current Bet to Call - Subtle below pot */}
          {currentBet > 0 && (
            <div className="text-gray-400 text-sm">
              {formatBB(currentBet)} bb to call
            </div>
          )}

          {/* Community Cards - Only show community cards in center */}
          {communityCards.length > 0 && (
            <div className="flex gap-2">
              {communityCards.map((card, index) => (
                <PokerCard 
                  key={index} 
                  card={card} 
                  size="md"
                  className="animate-in fade-in zoom-in duration-150"
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                />
              ))}
            </div>
          )}

          {/* Position and Stage badge */}
          <div className="flex gap-2 flex-wrap justify-center">
            <Badge variant="secondary" className="bg-gray-800 text-white">
              Position: {playerPosition}
            </Badge>
            <Badge variant="secondary" className="bg-blue-800 text-white capitalize">
              {gameStage}
            </Badge>
          </div>
        </div>

        {/* Player positions around the table */}
        {playerPositions.map((seat, index) => {
          const angle = (index / numPlayers) * 2 * Math.PI - Math.PI / 2;
          const radius = 0.35;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

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
                top: `${50 + y * 100}%`,
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
                {isPlayerSeat ? (
                  <div className={`rounded-full w-16 h-16 flex flex-col items-center justify-center border-2 transition-all relative ${
                    isFolded 
                      ? "bg-gray-900/50 border-gray-700 opacity-40" 
                      : isPlayerTurn || isCurrentActor
                      ? "bg-[#1a1a1a] border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] ring-2 ring-green-500/50"
                      : "bg-[#1a1a1a] border-green-500"
                  }`}>
                    <div className="text-white text-[10px] font-semibold">YOU</div>
                    <div className="text-green-400 text-xs font-bold">
                      {formatBB(Math.max(0, playerStackBB - (safePlayerBetsBB[playerSeat] || 0)))} BB
                    </div>
                    {isFolded && (
                      <div className="absolute -bottom-4 text-red-400 text-[9px] font-bold">FOLD</div>
                    )}
                  </div>
                ) : (
                  <div className={`rounded-full w-14 h-14 flex flex-col items-center justify-center border-2 transition-all relative ${
                    isFolded 
                      ? "bg-gray-900/50 border-gray-700 opacity-40" 
                      : isCurrentActor
                      ? "bg-[#1a1a1a] border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)] ring-2 ring-orange-500/50"
                      : justActed
                      ? "bg-[#1a1a1a] border-blue-500"
                      : "bg-[#1a1a1a] border-gray-600"
                  }`}>
                    {/* Action indicator for opponents */}
                    {isCurrentActor && !isFolded && (
                      <ActionIndicator 
                        isActive={true} 
                        seat={seat}
                        action={actionHistory[actionHistory.length - 1]?.action as any}
                        betSize={actionHistory[actionHistory.length - 1]?.betSize}
                      />
                    )}
                    <div className={`text-[10px] font-semibold ${
                      isFolded ? "text-gray-500" : "text-gray-300"
                    }`}>
                      {getPositionFromSeat(seat, numPlayers)}
                    </div>
                    <div className={`text-xs font-bold ${
                      isFolded ? "text-gray-600" : "text-gray-400"
                    }`}>
                      {displayStack} BB
                    </div>
                    {isFolded && (
                      <div className="absolute -bottom-4 text-red-400 text-[9px] font-bold">FOLD</div>
                    )}
                  </div>
                )}
                
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
                      <div className="text-yellow-300 text-[10px] font-bold bg-yellow-900/80 px-2 py-0.5 rounded border border-yellow-600 whitespace-nowrap">
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
      </div>
      
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

