import { Hand, Card } from "./gto";
import { GameStage, evaluateHandStrength } from "./postflop-gto";

/**
 * EV Calculator
 * Calculates Expected Value (EV) for poker decisions
 * Simplified model for training purposes
 */

export interface EVCalculation {
  action: string;
  ev: number; // Expected value in BB
  evLoss?: number; // EV lost compared to optimal action
  winProbability: number; // Probability of winning
  potEquity: number; // Equity in the pot
}

/**
 * Calculate EV for a given action
 */
export function calculateEV(
  playerHand: Hand,
  communityCards: Card[],
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  action: string,
  betSize?: number,
  numPlayers: number = 2
): EVCalculation {
  // Calculate hand strength and pot equity
  const handStrength = evaluateHandStrength(playerHand, communityCards, gameStage);
  
  // Estimate pot equity based on hand strength and stage
  // This is a simplified model - real EV requires Monte Carlo simulation
  let potEquity = handStrength;
  
  // Adjust for number of players (more players = lower equity)
  if (numPlayers > 2) {
    potEquity = potEquity * (0.5 + 0.5 / numPlayers);
  }
  
  // Adjust for game stage (later streets = more information = more accurate equity)
  const stageMultiplier = {
    preflop: 0.7, // Less certain preflop
    flop: 0.85,
    turn: 0.95,
    river: 1.0, // Most certain on river
  };
  potEquity = potEquity * stageMultiplier[gameStage];
  
  // Calculate EV for each action
  let ev = 0;
  let winProbability = potEquity;
  
  if (action === "fold") {
    ev = 0; // No EV when folding
    winProbability = 0;
  } else if (action === "call") {
    // EV = (pot equity * total pot) - cost to call
    const totalPot = pot + currentBet;
    ev = potEquity * totalPot - currentBet;
  } else if (action === "bet" || action === "raise") {
    const betAmount = betSize || currentBet * 2;
    // Estimate fold equity (simplified: 30% fold rate for bets)
    const foldEquity = 0.3;
    const totalPot = pot + betAmount;
    
    // EV = (fold equity * pot) + (1 - fold equity) * (pot equity * total pot - bet)
    ev = foldEquity * pot + (1 - foldEquity) * (potEquity * totalPot - betAmount);
  } else if (action === "check") {
    // EV = pot equity * pot (no additional cost)
    ev = potEquity * pot;
  }
  
  return {
    action,
    ev,
    winProbability,
    potEquity,
  };
}

/**
 * Calculate EV loss compared to optimal action
 */
export function calculateEVLoss(
  playerHand: Hand,
  communityCards: Card[],
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  playerAction: string,
  optimalActions: string[],
  betSize?: number,
  numPlayers: number = 2
): number {
  // Calculate EV for player's action
  const playerEV = calculateEV(
    playerHand,
    communityCards,
    gameStage,
    pot,
    currentBet,
    playerAction,
    betSize,
    numPlayers
  );
  
  // Calculate EV for optimal actions
  const optimalEVs = optimalActions.map(optAction => {
    // For optimal bet/raise, use reasonable sizing
    const optBetSize = (optAction === "bet" || optAction === "raise") 
      ? (betSize || currentBet * 2)
      : undefined;
    
    return calculateEV(
      playerHand,
      communityCards,
      gameStage,
      pot,
      currentBet,
      optAction,
      optBetSize,
      numPlayers
    );
  });
  
  // Find maximum EV among optimal actions
  const maxOptimalEV = Math.max(...optimalEVs.map(e => e.ev));
  
  // EV loss = optimal EV - player EV
  const evLoss = Math.max(0, maxOptimalEV - playerEV.ev);
  
  return evLoss;
}

/**
 * Format EV for display
 */
export function formatEV(ev: number): string {
  const sign = ev >= 0 ? "+" : "";
  return `${sign}${ev.toFixed(2)} BB`;
}

/**
 * Get EV color class for UI
 */
export function getEVColorClass(ev: number): string {
  if (ev > 1) return "text-green-400";
  if (ev > 0) return "text-green-300";
  if (ev > -1) return "text-yellow-300";
  return "text-red-400";
}

