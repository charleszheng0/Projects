import { Card, Hand } from "./gto";
import { GameStage, BettingAction, PostFlopAction, evaluateHandStrength } from "./postflop-gto";
import { Position } from "./gto";

/**
 * Realistic opponent simulation based on hand strength, position, and betting context
 * This can be enhanced with real poker statistics data
 */

export interface OpponentStats {
  // Preflop action frequencies by position
  preflop: {
    [key in Position]?: {
      fold: number; // 0-1 probability
      call: number;
      raise: number;
    };
  };
  // Postflop action frequencies by hand strength
  postflop: {
    [stage in GameStage]?: {
      [handStrengthRange: string]: { // e.g., "0-0.3", "0.3-0.5", "0.5-0.7", "0.7-1.0"
        fold: number;
        call: number;
        bet: number;
        raise: number;
      };
    };
  };
  // Bet sizing preferences
  betSizing: {
    valueBet: number[]; // Multipliers for value betting (e.g., [0.5, 0.67, 1.0])
    bluffBet: number[]; // Multipliers for bluffing (e.g., [0.33, 0.5])
  };
}

/**
 * Default realistic opponent statistics
 * Based on typical online poker behavior
 */
export const DEFAULT_OPPONENT_STATS: OpponentStats = {
  preflop: {
    UTG: { fold: 0.75, call: 0.15, raise: 0.10 },
    "UTG+1": { fold: 0.70, call: 0.18, raise: 0.12 },
    MP: { fold: 0.65, call: 0.20, raise: 0.15 },
    CO: { fold: 0.55, call: 0.25, raise: 0.20 },
    BTN: { fold: 0.45, call: 0.30, raise: 0.25 },
    SB: { fold: 0.50, call: 0.35, raise: 0.15 },
    BB: { fold: 0.40, call: 0.50, raise: 0.10 },
  },
  postflop: {
    flop: {
      "0-0.3": { fold: 0.85, call: 0.10, bet: 0.05, raise: 0.0 }, // Weak hands fold most
      "0.3-0.5": { fold: 0.60, call: 0.30, bet: 0.08, raise: 0.02 },
      "0.5-0.7": { fold: 0.20, call: 0.50, bet: 0.25, raise: 0.05 },
      "0.7-1.0": { fold: 0.05, call: 0.20, bet: 0.60, raise: 0.15 }, // Strong hands bet/raise
    },
    turn: {
      "0-0.3": { fold: 0.90, call: 0.08, bet: 0.02, raise: 0.0 },
      "0.3-0.5": { fold: 0.70, call: 0.25, bet: 0.04, raise: 0.01 },
      "0.5-0.7": { fold: 0.30, call: 0.40, bet: 0.25, raise: 0.05 },
      "0.7-1.0": { fold: 0.10, call: 0.25, bet: 0.50, raise: 0.15 },
    },
    river: {
      "0-0.3": { fold: 0.95, call: 0.04, bet: 0.01, raise: 0.0 },
      "0.3-0.5": { fold: 0.80, call: 0.18, bet: 0.02, raise: 0.0 },
      "0.5-0.7": { fold: 0.40, call: 0.45, bet: 0.12, raise: 0.03 },
      "0.7-1.0": { fold: 0.15, call: 0.30, bet: 0.45, raise: 0.10 },
    },
  },
  betSizing: {
    valueBet: [0.5, 0.67, 0.75, 1.0],
    bluffBet: [0.33, 0.5],
  },
};

/**
 * Get hand strength range key for stats lookup
 */
function getHandStrengthRange(strength: number): string {
  if (strength < 0.3) return "0-0.3";
  if (strength < 0.5) return "0.3-0.5";
  if (strength < 0.7) return "0.5-0.7";
  return "0.7-1.0";
}

/**
 * Simulate realistic preflop opponent action
 */
export function simulateRealisticPreflopAction(
  position: Position,
  currentBet: number,
  stats: OpponentStats = DEFAULT_OPPONENT_STATS
): "fold" | "call" | "raise" {
  const positionStats = stats.preflop[position];
  if (!positionStats) {
    // Fallback to random if position not found
    const rand = Math.random();
    if (rand < 0.5) return "fold";
    if (rand < 0.8) return "call";
    return "raise";
  }

  const rand = Math.random();
  let cumulative = 0;

  // Adjust fold probability if facing a raise (fold more often)
  let foldProb = positionStats.fold;
  if (currentBet > 2) {
    foldProb = Math.min(0.95, foldProb + 0.2); // Fold more when facing raises
  }

  cumulative += foldProb;
  if (rand < cumulative) return "fold";

  cumulative += positionStats.call;
  if (rand < cumulative) return "call";

  return "raise";
}

/**
 * Simulate realistic postflop opponent action
 */
export function simulateRealisticPostflopAction(
  playerHand: Hand,
  communityCards: Card[],
  stage: GameStage,
  potSizeBB: number,
  currentBet: number,
  actionToFace: BettingAction | null,
  stats: OpponentStats = DEFAULT_OPPONENT_STATS
): PostFlopAction | null {
  // Evaluate hand strength
  const handStrength = evaluateHandStrength(playerHand, communityCards, stage);
  const strengthRange = getHandStrengthRange(handStrength);

  // Get stage-specific stats
  const stageStats = stats.postflop[stage];
  if (!stageStats) {
    // Fallback
    return { action: "check" };
  }

  const rangeStats = stageStats[strengthRange];
  if (!rangeStats) {
    return { action: "check" };
  }

  // If facing a bet, adjust probabilities (fold more, call more, raise less)
  let adjustedStats = { ...rangeStats };
  if (actionToFace === "bet" || actionToFace === "raise") {
    // When facing a bet, fold probability increases significantly for weak hands
    if (handStrength < 0.5) {
      adjustedStats.fold = Math.min(0.95, rangeStats.fold + 0.2);
      adjustedStats.call = rangeStats.call * 0.7;
      adjustedStats.bet = 0;
      adjustedStats.raise = 0;
    } else if (handStrength < 0.7) {
      adjustedStats.fold = Math.min(0.85, rangeStats.fold + 0.15);
      adjustedStats.call = rangeStats.call * 0.8;
      adjustedStats.bet = 0;
      adjustedStats.raise = rangeStats.raise * 0.5;
    }
  }

  // More optimal play: bet/raise more aggressively with strong hands
  // Calculate action based on probabilities, but bias towards optimal play
  
  // Strong hands (0.7+) should bet/raise more often
  if (handStrength >= 0.7) {
    if (actionToFace === "bet" || actionToFace === "raise") {
      // Strong hand facing a bet - raise more often (70% chance)
      if (Math.random() < 0.7) {
        const multiplier = stats.betSizing.valueBet[Math.floor(Math.random() * stats.betSizing.valueBet.length)];
        const raiseSize = Math.max(currentBet * 2.5, Math.round(potSizeBB * multiplier * 10) / 10);
        return { action: "raise", betSizeBB: raiseSize };
      }
      // Otherwise call
      return { action: "call" };
    } else {
      // Strong hand, no bet to face - bet aggressively (80% chance)
      if (Math.random() < 0.8) {
        const multiplier = stats.betSizing.valueBet[Math.floor(Math.random() * stats.betSizing.valueBet.length)];
        const betSize = Math.max(1, Math.round(potSizeBB * multiplier * 10) / 10);
        return { action: "bet", betSizeBB: betSize };
      }
      return { action: "check" };
    }
  }
  
  // Medium-strong hands (0.5-0.7) - bet sometimes, call often
  if (handStrength >= 0.5) {
    if (actionToFace === "bet" || actionToFace === "raise") {
      // Call more often with medium hands (80% call, 20% raise)
      if (Math.random() < 0.2) {
        const multiplier = stats.betSizing.valueBet[0]; // Smaller raise
        const raiseSize = Math.max(currentBet * 2, Math.round(potSizeBB * multiplier * 10) / 10);
        return { action: "raise", betSizeBB: raiseSize };
      }
      return { action: "call" };
    } else {
      // Bet sometimes (40% bet, 60% check)
      if (Math.random() < 0.4) {
        const multiplier = stats.betSizing.valueBet[Math.floor(Math.random() * stats.betSizing.valueBet.length)];
        const betSize = Math.max(1, Math.round(potSizeBB * multiplier * 10) / 10);
        return { action: "bet", betSizeBB: betSize };
      }
      return { action: "check" };
    }
  }
  
  // Weak hands (0.3-0.5) - fold more, call sometimes
  if (handStrength >= 0.3) {
    if (actionToFace === "bet" || actionToFace === "raise") {
      // Fold more often with weak hands (60% fold, 40% call)
      if (Math.random() < 0.6) {
        return { action: "fold" };
      }
      return { action: "call" };
    } else {
      // Check with weak hands
      return { action: "check" };
    }
  }
  
  // Very weak hands (<0.3) - fold almost always
  if (actionToFace === "bet" || actionToFace === "raise") {
    // Fold 90% of the time with very weak hands
    if (Math.random() < 0.9) {
      return { action: "fold" };
    }
    return { action: "call" };
  }
  
  // Very weak hand, no bet - check
  return { action: "check" };
}

/**
 * Load custom opponent statistics from JSON
 * Format should match OpponentStats interface
 */
export function loadOpponentStats(jsonData: string): OpponentStats {
  try {
    const parsed = JSON.parse(jsonData);
    // Merge with defaults to ensure all fields are present
    return {
      ...DEFAULT_OPPONENT_STATS,
      ...parsed,
      preflop: {
        ...DEFAULT_OPPONENT_STATS.preflop,
        ...parsed.preflop,
      },
      postflop: {
        ...DEFAULT_OPPONENT_STATS.postflop,
        ...parsed.postflop,
      },
    };
  } catch (error) {
    console.error("Error loading opponent stats:", error);
    return DEFAULT_OPPONENT_STATS;
  }
}

