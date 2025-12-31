import { Action } from "./gto";
import { BettingAction, GameStage } from "./postflop-gto";
import { roundBB } from "./utils";

/**
 * Action validation result
 */
export interface ActionValidationResult {
  isValid: boolean;
  error?: string;
  adjustedBetSize?: number;
}

/**
 * Validate action is legal in current game state
 * CRITICAL: Ensures all actions follow poker rules
 */
export function validateAction(
  action: Action | BettingAction,
  gameStage: GameStage,
  actionToFace: BettingAction | null,
  currentBet: number,
  playerCurrentBet: number,
  playerStack: number,
  bigBlind: number,
  betSizeBB?: number
): ActionValidationResult {
  const toCall = currentBet - playerCurrentBet;
  const isPreflop = gameStage === "preflop";

  switch (action) {
    case "fold":
      // Fold is always legal when facing a bet
      if (toCall === 0 && !isPreflop) {
        return { isValid: false, error: "Cannot fold when you can check" };
      }
      return { isValid: true };

    case "check":
      // Can only check if no bet to face
      if (toCall > 0) {
        return { isValid: false, error: "Cannot check when facing a bet" };
      }
      if (isPreflop) {
        return { isValid: false, error: "Cannot check preflop" };
      }
      return { isValid: true };

    case "call":
      // Can only call if facing a bet
      if (toCall === 0) {
        return { isValid: false, error: "Cannot call when no bet to face" };
      }
      // Validate player has enough chips
      if (toCall > playerStack) {
        // All-in call is valid
        return { isValid: true, adjustedBetSize: playerStack };
      }
      return { isValid: true };

    case "bet":
      // Can only bet if no bet to face
      if (toCall > 0) {
        return { isValid: false, error: "Cannot bet when facing a bet (must call or raise)" };
      }
      if (isPreflop) {
        return { isValid: false, error: "Cannot bet preflop (must raise)" };
      }
      if (!betSizeBB || betSizeBB <= 0) {
        return { isValid: false, error: "Bet requires valid size" };
      }
      // Validate bet size meets minimum (typically 1 BB or pot-based minimum)
      const minBet = Math.max(1, bigBlind);
      if (betSizeBB < minBet) {
        return { isValid: false, error: `Bet must be at least ${minBet} BB` };
      }
      // Validate player has enough chips
      if (betSizeBB > playerStack) {
        return { isValid: true, adjustedBetSize: playerStack };
      }
      return { isValid: true };

    case "raise":
      // Can only raise if facing a bet (or preflop)
      if (toCall === 0 && !isPreflop) {
        return { isValid: false, error: "Cannot raise when no bet to face (must bet)" };
      }
      if (!betSizeBB || betSizeBB <= 0) {
        return { isValid: false, error: "Raise requires valid size" };
      }
      
      // Calculate total bet amount (current bet + raise increment)
      const totalBet = isPreflop ? betSizeBB : currentBet + (betSizeBB - currentBet);
      
      // Validate minimum raise
      if (isPreflop) {
        // Preflop: minimum raise is 2x big blind
        const minRaise = bigBlind * 2;
        if (betSizeBB < minRaise) {
          return { isValid: false, error: `Preflop raise must be at least ${minRaise} BB` };
        }
      } else {
        // Postflop: minimum raise is 2x current bet
        const minRaise = currentBet * 2;
        if (totalBet < minRaise) {
          const adjustedRaise = minRaise;
          return { isValid: false, error: `Raise must be at least ${adjustedRaise} BB (minimum raise)`, adjustedBetSize: adjustedRaise };
        }
      }
      
      // Validate player has enough chips
      const additionalNeeded = totalBet - playerCurrentBet;
      if (additionalNeeded > playerStack) {
        // All-in raise
        const allInTotal = playerCurrentBet + playerStack;
        return { isValid: true, adjustedBetSize: allInTotal };
      }
      
      return { isValid: true };

    default:
      return { isValid: false, error: `Unknown action: ${action}` };
  }
}

/**
 * Get available actions for current game state
 * CRITICAL: Only returns actions that are legal
 */
export function getAvailableActions(
  gameStage: GameStage,
  actionToFace: BettingAction | null,
  currentBet: number,
  playerCurrentBet: number,
  isPreflop: boolean
): Array<Action | BettingAction> {
  const toCall = currentBet - playerCurrentBet;
  const available: Array<Action | BettingAction> = [];

  if (isPreflop) {
    // Preflop actions
    if (toCall > 0) {
      available.push("fold", "call", "raise");
    } else {
      // Can check (limping) or raise
      available.push("call", "raise");
    }
  } else {
    // Postflop actions
    if (toCall > 0) {
      // Facing a bet
      available.push("fold", "call", "raise");
    } else {
      // No bet to face
      available.push("check", "bet");
    }
  }

  return available;
}

/**
 * Calculate valid bet sizes for current game state
 * CRITICAL: Ensures all bet sizes meet poker rules
 */
export function calculateValidBetSizes(
  action: "bet" | "raise",
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  playerCurrentBet: number,
  playerStack: number,
  bigBlind: number
): number[] {
  const isPreflop = gameStage === "preflop";
  const toCall = currentBet - playerCurrentBet;
  const validSizes: number[] = [];

  if (action === "bet") {
    // Bet sizes (postflop only)
    if (isPreflop) return [];
    
    const minBet = Math.max(1, bigBlind);
    const maxBet = playerStack;
    
    // Common bet sizes: 33%, 50%, 67%, 100% of pot
    const betSizes = [
      Math.max(minBet, Math.round(pot * 0.33)),
      Math.max(minBet, Math.round(pot * 0.5)),
      Math.max(minBet, Math.round(pot * 0.67)),
      Math.max(minBet, Math.round(pot * 1.0)),
    ];
    
    // Add all-in if different
    betSizes.forEach(size => {
      if (size >= minBet && size <= maxBet && !validSizes.includes(size)) {
        validSizes.push(size);
      }
    });
    
    if (maxBet > 0 && !validSizes.includes(maxBet)) {
      validSizes.push(maxBet);
    }
    
    return validSizes.sort((a, b) => a - b);
  } else {
    // Raise sizes
    if (isPreflop) {
      // Preflop: fixed BB amounts
      const minRaise = bigBlind * 2;
      const maxRaise = playerStack;
      
      const raiseSizes = [minRaise, minRaise * 2, minRaise * 3, minRaise * 5];
      raiseSizes.forEach(size => {
        if (size >= minRaise && size <= maxRaise && !validSizes.includes(size)) {
          validSizes.push(size);
        }
      });
      
      if (maxRaise > 0 && !validSizes.includes(maxRaise)) {
        validSizes.push(maxRaise);
      }
      
      return validSizes.sort((a, b) => a - b);
    } else {
      // Postflop: raises above current bet
      const minRaise = currentBet * 2;
      const maxRaise = playerCurrentBet + playerStack;
      
      // Calculate raise increments
      const raiseIncrements = [
        currentBet, // 2x (minimum)
        currentBet * 1.5, // 2.5x
        currentBet * 2, // 3x
        pot, // Pot-sized raise
      ];
      
      raiseIncrements.forEach(increment => {
        const totalBet = currentBet + increment;
        if (totalBet >= minRaise && totalBet <= maxRaise) {
          if (!validSizes.includes(totalBet)) {
            validSizes.push(totalBet);
          }
        }
      });
      
      // Add all-in if different
      if (maxRaise >= minRaise && !validSizes.includes(maxRaise)) {
        validSizes.push(maxRaise);
      }
      
      return validSizes.sort((a, b) => a - b);
    }
  }
}

/**
 * Validate and adjust bet size to meet poker rules
 */
export function validateAndAdjustBetSize(
  action: "bet" | "raise",
  betSizeBB: number,
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  playerCurrentBet: number,
  playerStack: number,
  bigBlind: number
): { isValid: boolean; adjustedSize: number; error?: string } {
  const isPreflop = gameStage === "preflop";
  
  if (action === "bet") {
    const minBet = Math.max(1, bigBlind);
    if (betSizeBB < minBet) {
      return { isValid: false, adjustedSize: minBet, error: `Bet must be at least ${minBet} BB` };
    }
    if (betSizeBB > playerStack) {
      return { isValid: true, adjustedSize: playerStack };
    }
    return { isValid: true, adjustedSize: betSizeBB };
  } else {
    // Raise
    if (isPreflop) {
      const minRaise = bigBlind * 2;
      if (betSizeBB < minRaise) {
        return { isValid: false, adjustedSize: minRaise, error: `Preflop raise must be at least ${minRaise} BB` };
      }
      if (betSizeBB > playerStack) {
        return { isValid: true, adjustedSize: playerStack };
      }
      return { isValid: true, adjustedSize: betSizeBB };
    } else {
      const totalBet = betSizeBB;
      const minRaise = currentBet * 2;
      if (totalBet < minRaise) {
        return { isValid: false, adjustedSize: minRaise, error: `Raise must be at least ${minRaise} BB (minimum raise)` };
      }
      const additionalNeeded = totalBet - playerCurrentBet;
      if (additionalNeeded > playerStack) {
        const allInTotal = playerCurrentBet + playerStack;
        return { isValid: true, adjustedSize: allInTotal };
      }
      return { isValid: true, adjustedSize: betSizeBB };
    }
  }
}

