import { Card, Hand, Action } from "./gto";
import { formatHand } from "./gto";

export type GameStage = "preflop" | "flop" | "turn" | "river";
export type BettingAction = "check" | "fold" | "call" | "bet" | "raise";

export interface PostFlopAction {
  action: BettingAction;
  betSizeBB?: number;
}

/**
 * Simplified post-flop GTO logic
 * This is a simplified version - full post-flop GTO is extremely complex
 * For now, we'll use hand strength and position-based heuristics
 */
export function getPostFlopGTOAction(
  playerHand: Hand,
  communityCards: Card[],
  stage: GameStage,
  position: string,
  actionToFace: BettingAction | null, // What action the player needs to respond to
  numPlayers: number,
  potSizeBB: number,
  betSizeBB?: number // Size of bet/raise to face
): { correct: boolean; optimalActions: BettingAction[]; feedback: string } {
  const handStrength = evaluateHandStrength(playerHand, communityCards, stage);
  const isHeadsUp = numPlayers === 2;
  
  // Determine if we're in position (BTN, CO) or out of position
  const isInPosition = position === "BTN" || position === "CO";
  const isOutOfPosition = position === "SB" || position === "BB" || position === "UTG" || position === "UTG+1";
  
  let optimalActions: BettingAction[] = [];
  let feedback = "";
  
  // If facing a bet/raise
  if (actionToFace === "bet" || actionToFace === "raise") {
    if (handStrength >= 0.7) {
      // Very strong hand - raise for value
      optimalActions = ["raise"];
      feedback = `With a very strong hand (${getHandDescription(handStrength)}), raising for value is optimal. You want to build the pot when you're likely ahead.`;
    } else if (handStrength >= 0.5) {
      // Strong hand - call or raise
      optimalActions = ["call", "raise"];
      feedback = `With a strong hand (${getHandDescription(handStrength)}), calling or raising are both acceptable. Calling keeps the pot controlled, while raising builds value.`;
    } else if (handStrength >= 0.3) {
      // Medium hand - call or fold depending on position and bet size
      if (isInPosition && betSizeBB && betSizeBB <= potSizeBB * 0.5) {
        optimalActions = ["call"];
        feedback = `With a medium-strength hand (${getHandDescription(handStrength)}), calling is acceptable in position against a small bet.`;
      } else {
        optimalActions = ["fold", "call"];
        feedback = `With a medium-strength hand (${getHandDescription(handStrength)}), folding is often correct, especially out of position or against large bets.`;
      }
    } else {
      // Weak hand - fold
      optimalActions = ["fold"];
      feedback = `With a weak hand (${getHandDescription(handStrength)}), folding is correct. You don't have enough equity to continue.`;
    }
  } else {
    // Facing check or it's our turn to act first
    if (handStrength >= 0.6) {
      // Strong hand - bet for value
      optimalActions = ["bet"];
      feedback = `With a strong hand (${getHandDescription(handStrength)}), betting for value is optimal. You want to build the pot when you're likely ahead.`;
    } else if (handStrength >= 0.4 && isInPosition) {
      // Medium-strong hand in position - bet or check
      optimalActions = ["bet", "check"];
      feedback = `With a medium-strength hand (${getHandDescription(handStrength)}) in position, betting or checking are both acceptable. Betting builds the pot, while checking allows you to control the pot size.`;
    } else if (handStrength >= 0.3) {
      // Medium hand - check
      optimalActions = ["check"];
      feedback = `With a medium-strength hand (${getHandDescription(handStrength)}), checking is often correct to control pot size and see the next card.`;
    } else {
      // Weak hand - check or fold if possible
      optimalActions = ["check"];
      feedback = `With a weak hand (${getHandDescription(handStrength)}), checking is correct. You want to see the next card cheaply or give up the pot.`;
    }
  }
  
  return {
    correct: false, // Will be set by caller
    optimalActions,
    feedback,
  };
}

/**
 * Evaluate hand strength (0-1 scale)
 * 0.9+ = Very strong (top pair+, two pair+, trips+)
 * 0.7-0.9 = Strong (top pair, good draws)
 * 0.5-0.7 = Medium (middle pair, weak draws)
 * 0.3-0.5 = Weak (bottom pair, weak draws)
 * <0.3 = Very weak (high card, nothing)
 */
export function evaluateHandStrength(playerHand: Hand, communityCards: Card[], stage: GameStage): number {
  if (communityCards.length === 0) return 0.5; // Preflop
  
  const allCards = [playerHand.card1, playerHand.card2, ...communityCards];
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  
  // Count ranks and suits
  const rankCounts: Record<string, number> = {};
  const suitCounts: Record<string, number> = {};
  
  allCards.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  
  // Check for pairs, trips, quads
  const pairs: string[] = [];
  let trips = false;
  let quads = false;
  
  Object.entries(rankCounts).forEach(([rank, count]) => {
    if (count === 2) pairs.push(rank);
    if (count === 3) trips = true;
    if (count === 4) quads = true;
  });
  
  // Check for flush
  const flushSuit = Object.entries(suitCounts).find(([_, count]) => count >= 5)?.[0];
  const hasFlush = !!flushSuit;
  
  // Check for straight (simplified)
  const ranks = Object.keys(rankCounts).map(r => rankOrder.indexOf(r)).sort((a, b) => a - b);
  let hasStraight = false;
  for (let i = 0; i <= ranks.length - 5; i++) {
    if (ranks[i + 4] - ranks[i] === 4) {
      hasStraight = true;
      break;
    }
  }
  
  // Evaluate hand strength
  if (quads) return 1.0;
  if (trips && pairs.length > 0) return 0.95; // Full house
  if (hasFlush && hasStraight) return 0.95; // Straight flush
  if (hasFlush) return 0.85;
  if (hasStraight) return 0.8;
  if (trips) return 0.75;
  if (pairs.length >= 2) return 0.7; // Two pair
  
  // Check if we have a pair with our hole cards
  const playerRanks = [playerHand.card1.rank, playerHand.card2.rank];
  const hasPair = pairs.some(p => playerRanks.includes(p));
  
  if (hasPair) {
    const pairRank = pairs.find(p => playerRanks.includes(p))!;
    const pairValue = rankOrder.indexOf(pairRank);
    // Top pair (pair of highest community card)
    const highestBoard = Math.max(...communityCards.map(c => rankOrder.indexOf(c.rank)));
    if (pairValue === highestBoard) return 0.65; // Top pair
    if (pairValue >= rankOrder.indexOf("T")) return 0.55; // Middle pair with high card
    return 0.45; // Bottom pair
  }
  
  // Check for draws
  const highCard = Math.max(...playerRanks.map(r => rankOrder.indexOf(r)));
  if (highCard >= rankOrder.indexOf("K")) return 0.4; // High card
  if (highCard >= rankOrder.indexOf("Q")) return 0.35;
  return 0.25; // Weak high card
}

function getHandDescription(strength: number): string {
  if (strength >= 0.9) return "very strong (two pair+, trips+)";
  if (strength >= 0.7) return "strong (top pair, good draws)";
  if (strength >= 0.5) return "medium-strong (middle pair)";
  if (strength >= 0.3) return "medium (bottom pair, weak draws)";
  return "weak (high card, nothing)";
}

/**
 * Generate random community cards
 */
export function generateCommunityCards(existingCards: Card[], stage: GameStage): Card[] {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const usedCards = new Set(existingCards.map(c => `${c.rank}-${c.suit}`));
  
  const cards: Card[] = [];
  const needed = stage === "flop" ? 3 : stage === "turn" ? 1 : stage === "river" ? 1 : 0;
  
  for (let i = 0; i < needed; i++) {
    let card: Card;
    do {
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      card = { rank, suit };
    } while (usedCards.has(`${card.rank}-${card.suit}`));
    
    cards.push(card);
    usedCards.add(`${card.rank}-${card.suit}`);
  }
  
  return cards;
}

/**
 * Simulate opponent action
 */
export function simulateOpponentAction(
  stage: GameStage,
  potSizeBB: number,
  isAggressive: boolean = false
): PostFlopAction | null {
  // More aggressive opponent logic - bet more often
  const rand = Math.random();
  
  if (rand < 0.6) {
    // 60% chance to bet (increased from 30%)
    // Bet sizes relative to pot: 1/3 pot, 1/2 pot, 2/3 pot, or pot
    const betMultipliers = [0.33, 0.5, 0.67, 1.0];
    const multiplier = betMultipliers[Math.floor(Math.random() * betMultipliers.length)];
    const betSize = Math.max(1, Math.round(potSizeBB * multiplier * 10) / 10); // At least 1 BB, rounded to 1 decimal
    return { action: "bet", betSizeBB: betSize };
  } else {
    // 40% chance to check
    return { action: "check" };
  }
}

