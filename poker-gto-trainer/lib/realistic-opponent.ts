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
    // More realistic VPIP (Voluntarily Put money In Pot) and betting frequencies
    // Typical online poker: VPIP ~20-30%, PFR (Preflop Raise) ~15-20%
    // Increased fold frequencies and raise frequencies for more realistic play
    UTG: { fold: 0.80, call: 0.12, raise: 0.08 }, // Tight early position - fold more
    "UTG+1": { fold: 0.78, call: 0.14, raise: 0.08 },
    MP: { fold: 0.75, call: 0.17, raise: 0.08 }, // Slightly looser but still tight
    CO: { fold: 0.70, call: 0.20, raise: 0.10 }, // More aggressive
    BTN: { fold: 0.60, call: 0.25, raise: 0.15 }, // Most aggressive position
    SB: { fold: 0.65, call: 0.25, raise: 0.10 }, // Defend more often
    BB: { fold: 0.55, call: 0.35, raise: 0.10 }, // Defend wide (already invested)
  },
  postflop: {
    flop: {
      // Increased betting frequency - typical online poker has ~30-40% betting frequency on flop
      // Made opponents bet/raise more often for harder decisions
      "0-0.3": { fold: 0.75, call: 0.15, bet: 0.08, raise: 0.02 }, // Weak hands fold more, but more bluffs
      "0.3-0.5": { fold: 0.40, call: 0.30, bet: 0.22, raise: 0.08 }, // More betting with medium hands
      "0.5-0.7": { fold: 0.10, call: 0.30, bet: 0.45, raise: 0.15 }, // Strong hands bet/raise aggressively
      "0.7-1.0": { fold: 0.02, call: 0.10, bet: 0.70, raise: 0.18 }, // Premium hands bet/raise very aggressively
    },
    turn: {
      // Turn betting frequency increases significantly (value betting and protection)
      "0-0.3": { fold: 0.80, call: 0.12, bet: 0.06, raise: 0.02 },
      "0.3-0.5": { fold: 0.55, call: 0.25, bet: 0.15, raise: 0.05 },
      "0.5-0.7": { fold: 0.15, call: 0.25, bet: 0.45, raise: 0.15 },
      "0.7-1.0": { fold: 0.03, call: 0.12, bet: 0.65, raise: 0.20 },
    },
    river: {
      // River: more polarized betting (value bets and bluffs) - increased betting
      "0-0.3": { fold: 0.85, call: 0.10, bet: 0.04, raise: 0.01 },
      "0.3-0.5": { fold: 0.65, call: 0.20, bet: 0.12, raise: 0.03 },
      "0.5-0.7": { fold: 0.25, call: 0.30, bet: 0.35, raise: 0.10 },
      "0.7-1.0": { fold: 0.05, call: 0.15, bet: 0.60, raise: 0.20 },
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

  // Use the stats-based probabilities for more realistic play
  const rand = Math.random();
  let cumulative = 0;

  // Adjust probabilities based on facing action
  let adjustedStats = { ...rangeStats };
  if (actionToFace === "bet" || actionToFace === "raise") {
    // When facing a bet, adjust probabilities - but keep betting/raising when strong
    if (handStrength < 0.5) {
      adjustedStats.fold = Math.min(0.95, rangeStats.fold + 0.20); // Fold more when weak
      adjustedStats.call = rangeStats.call * 0.7;
      adjustedStats.bet = 0;
      adjustedStats.raise = rangeStats.raise * 0.2; // Rarely raise weak hands
    } else if (handStrength < 0.7) {
      adjustedStats.fold = Math.min(0.75, rangeStats.fold + 0.15);
      adjustedStats.call = rangeStats.call * 0.8;
      adjustedStats.bet = 0;
      adjustedStats.raise = rangeStats.raise * 0.8; // Raise more with medium hands
    } else {
      // Strong hands - increase raise frequency when facing bets
      adjustedStats.fold = rangeStats.fold * 0.5;
      adjustedStats.call = rangeStats.call * 0.7;
      adjustedStats.bet = 0;
      adjustedStats.raise = Math.min(0.4, rangeStats.raise * 1.5); // Raise more often with strong hands
    }
  } else {
    // When checking or no action to face, increase betting frequency
    if (handStrength >= 0.5) {
      adjustedStats.bet = rangeStats.bet * 1.3; // Bet more when strong and no bet to face
      adjustedStats.raise = rangeStats.raise * 1.2;
    }
  }

  // Normalize probabilities
  const total = adjustedStats.fold + adjustedStats.call + adjustedStats.bet + adjustedStats.raise;
  if (total > 0) {
    adjustedStats.fold /= total;
    adjustedStats.call /= total;
    adjustedStats.bet /= total;
    adjustedStats.raise /= total;
  }

  // Determine action based on probabilities
  cumulative += adjustedStats.fold;
  if (rand < cumulative) {
    return { action: "fold" };
  }

  cumulative += adjustedStats.call;
  if (rand < cumulative) {
    return { action: "call" };
  }

  cumulative += adjustedStats.bet;
  if (rand < cumulative) {
    // Betting - use appropriate sizing
    const multiplier = handStrength >= 0.7 
      ? stats.betSizing.valueBet[Math.floor(Math.random() * stats.betSizing.valueBet.length)]
      : stats.betSizing.bluffBet[Math.floor(Math.random() * stats.betSizing.bluffBet.length)];
    const betSize = Math.max(1, Math.round(potSizeBB * multiplier * 10) / 10);
    return { action: "bet", betSizeBB: betSize };
  }

  // Raise
  const multiplier = handStrength >= 0.7
    ? stats.betSizing.valueBet[Math.floor(Math.random() * stats.betSizing.valueBet.length)]
    : stats.betSizing.bluffBet[0];
  const raiseSize = Math.max(currentBet * 2, Math.round(potSizeBB * multiplier * 10) / 10);
  return { action: "raise", betSizeBB: raiseSize };
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

