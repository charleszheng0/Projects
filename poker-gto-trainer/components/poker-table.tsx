"use client";

import { useGameStore } from "@/store/game-store";
import { PokerCard } from "./poker-card";
import { Badge } from "./ui/badge";

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
  } = useGameStore();

  // Create array of player positions around the table
  const playerPositions = Array.from({ length: numPlayers }, (_, i) => i);
  
  // Ensure arrays are initialized with defaults
  const safePlayerStacksBB = playerStacksBB || Array(numPlayers).fill(100);
  const safePlayerBetsBB = playerBetsBB || Array(numPlayers).fill(0);
  const safeFoldedPlayers = foldedPlayers || Array(numPlayers).fill(false);

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[16/10]">
      {/* Table surface */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-800 to-green-900 border-8 border-gray-800 shadow-2xl">
        {/* Inner table border */}
        <div className="absolute inset-4 rounded-full border-2 border-green-700/50"></div>
        
        {/* Center area for pot and community cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
          {/* Pot display */}
          <div className="bg-green-700/80 rounded-full px-6 py-2 border-2 border-yellow-400">
            <div className="text-yellow-300 text-xs font-semibold">Total Pot</div>
            <div className="text-yellow-200 text-xl font-bold">{pot} BB</div>
          </div>

          {/* Community Cards - Only show community cards in center */}
          {communityCards.length > 0 && (
            <div className="flex gap-2">
              {communityCards.map((card, index) => (
                <PokerCard key={index} card={card} size="md" />
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
          const stackBB = safePlayerStacksBB[seat] || 100;
          const betBB = Math.max(0, safePlayerBetsBB[seat] || 0); // Ensure betBB is never negative
          const isSmallBlind = seat === smallBlindSeat;
          const isBigBlind = seat === bigBlindSeat;
          const isButton = seat === buttonSeat;
          const isFolded = safeFoldedPlayers[seat] || false;
          const isActive = !isFolded;
          const justActed = lastActorSeat === seat;

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
                  <div className="flex gap-1 mb-1">
                    <PokerCard card={playerHand.card1} size="sm" />
                    <PokerCard card={playerHand.card2} size="sm" />
                  </div>
                )}
                
                {/* Opponent hand cards - face down */}
                {!isPlayerSeat && opponentHands[seat] && !isFolded && (
                  <div className="flex gap-1 mb-1">
                    <PokerCard card={opponentHands[seat]!.card1} size="sm" faceDown={true} />
                    <PokerCard card={opponentHands[seat]!.card2} size="sm" faceDown={true} />
                  </div>
                )}
                
                {/* Player info */}
                {isPlayerSeat ? (
                  <div className={`rounded-lg px-3 py-1 border-2 ${
                    isFolded 
                      ? "bg-gray-900/80 border-gray-700 opacity-50" 
                      : "bg-gray-800 border-yellow-400"
                  }`}>
                    <div className="text-white text-xs font-semibold">You</div>
                    <div className="text-yellow-300 text-xs">{playerStackBB} BB</div>
                    {isFolded && (
                      <div className="text-red-400 text-[10px] font-bold mt-0.5">FOLDED</div>
                    )}
                    {isActive && !isFolded && (
                      <div className="text-green-400 text-[10px] font-semibold mt-0.5">ACTIVE</div>
                    )}
                    {justActed && !isFolded && (
                      <div className="text-blue-300 text-[10px] font-bold mt-0.5 animate-pulse">BET</div>
                    )}
                  </div>
                ) : (
                  <div className={`rounded-lg px-3 py-1 border ${
                    isFolded 
                      ? "bg-gray-900/80 border-gray-700 opacity-50" 
                      : justActed
                      ? "bg-blue-900/80 border-blue-500 border-2"
                      : "bg-gray-800/60 border-gray-600"
                  }`}>
                    <div className={`text-xs ${
                      isFolded ? "text-gray-500" : "text-gray-300"
                    }`}>
                      Player {seat + 1}
                    </div>
                    <div className={`text-xs ${
                      isFolded ? "text-gray-600" : "text-gray-400"
                    }`}>
                      {stackBB} BB
                    </div>
                    {isFolded && (
                      <div className="text-red-400 text-[10px] font-bold mt-0.5">FOLDED</div>
                    )}
                    {isActive && !isFolded && (
                      <div className="text-green-400 text-[10px] font-semibold mt-0.5">ACTIVE</div>
                    )}
                    {justActed && !isFolded && (
                      <div className="text-blue-300 text-[10px] font-bold mt-0.5 animate-pulse">BET</div>
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
                  const displayAmount = Math.round(betBB * 10) / 10; // Round to 1 decimal place
                  
                  return (
                    <div className="relative flex items-center justify-center mt-1" style={{ height: '32px' }}>
                      {/* Chip stack visualization - properly stacked */}
                      {Array.from({ length: chipCount }).map((_, i) => {
                        const offset = i * 2; // Small offset for stacking effect
                        const rotation = i * 2; // Slight rotation for realism
                        const isTopChip = i === chipCount - 1;
                        
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
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center relative overflow-visible">
                            {isTopChip && displayAmount > 0 && (
                              <span 
                                className="text-black text-[10px] font-bold leading-none select-none pointer-events-none whitespace-nowrap"
                                style={{
                                  transform: `rotate(${-rotation}deg)`, // Counter-rotate text to keep it readable
                                  display: 'inline-block',
                                  maxWidth: '100%',
                                  textAlign: 'center',
                                  lineHeight: '1',
                                }}
                              >
                                {displayAmount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                        })}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
        
        {/* Visual bet indicators - chips shown at player positions, no text labels */}
      </div>
    </div>
  );
}

