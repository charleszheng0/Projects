import { Hand, Position, Action } from "./gto";
import { formatHand } from "./gto";
import { GameStage, BettingAction } from "./postflop-gto";

export interface ActionFrequency {
  action: Action | BettingAction;
  betSize?: number; // For bet/raise actions
  frequency: number; // Percentage (0-100)
  label: string; // Display label
}

/**
 * Calculate GTO action frequencies for a given situation
 * This is a simplified version - in production, this would come from a solver
 */
export function calculateGTOFrequencies(
  hand: Hand,
  position: Position,
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  actionToFace: "bet" | "raise" | "check" | null,
  optimalActions: (Action | BettingAction)[],
  numPlayers?: number
): ActionFrequency[] {
  const handString = formatHand(hand);
  const isPreflop = gameStage === "preflop";
  const facingBet = currentBet > 0 && (actionToFace === "bet" || actionToFace === "raise");
  
  // Calculate bet sizes as percentages of pot
  const betSizes = [
    { label: "33%", size: Math.round((pot * 0.33) * 10) / 10, percent: 33 },
    { label: "50%", size: Math.round((pot * 0.5) * 10) / 10, percent: 50 },
    { label: "66%", size: Math.round((pot * 0.67) * 10) / 10, percent: 66 },
    { label: "100%", size: Math.round(pot * 10) / 10, percent: 100 },
    { label: "130%", size: Math.round((pot * 1.3) * 10) / 10, percent: 130 },
  ];
  
  // Filter bet sizes when facing a bet
  const validBetSizes = facingBet 
    ? betSizes.filter(b => b.size > currentBet && b.size >= currentBet * 2)
    : betSizes;
  
  const frequencies: ActionFrequency[] = [];
  
  // If no optimal actions, all actions are 0% (shouldn't happen, but handle it)
  if (!optimalActions || optimalActions.length === 0) {
    return [];
  }
  
  // Calculate base frequencies based on optimal actions
  // In a real solver, these would come from actual GTO frequencies
  const baseFrequency = 100 / optimalActions.length;
  
  // For each optimal action, distribute frequency
  optimalActions.forEach((action, index) => {
    if (action === "fold") {
      frequencies.push({
        action: "fold",
        frequency: baseFrequency,
        label: "FOLD"
      });
    } else if (action === "check") {
      frequencies.push({
        action: "check",
        frequency: baseFrequency,
        label: "CHECK"
      });
    } else if (action === "call") {
      frequencies.push({
        action: "call",
        frequency: baseFrequency,
        label: `CALL ${currentBet > 0 ? `(${currentBet} bb)` : ""}`
      });
    } else if (action === "bet" || action === "raise") {
      // For bet/raise, distribute frequency across bet sizes
      // In a real solver, each bet size would have its own frequency
      // For now, we'll distribute evenly or use heuristics
      
      if (validBetSizes.length > 0) {
        // Distribute bet/raise frequency across bet sizes
        const betFrequency = baseFrequency / validBetSizes.length;
        
        validBetSizes.forEach((betSize) => {
          frequencies.push({
            action: action as Action,
            betSize: betSize.size,
            frequency: betFrequency,
            label: `${action.toUpperCase()} ${betSize.percent}%`
          });
        });
      } else {
        // Fallback: just show the action without specific size
        frequencies.push({
          action: action as Action,
          frequency: baseFrequency,
          label: action.toUpperCase()
        });
      }
    }
  });
  
  // Add all-in option if it's a valid action
  // All-in typically has low frequency unless it's the only option
  if (optimalActions.includes("raise") || optimalActions.includes("bet")) {
    const hasAllIn = frequencies.some(f => f.label.includes("ALLIN") || f.label.includes("AI"));
    if (!hasAllIn) {
      frequencies.push({
        action: "raise",
        betSize: 0, // Will be set to stack size
        frequency: 0, // Usually 0% unless it's optimal
        label: "ALLIN"
      });
    }
  }
  
  // Sort by frequency (highest first), then by action type
  frequencies.sort((a, b) => {
    if (b.frequency !== a.frequency) {
      return b.frequency - a.frequency;
    }
    // Secondary sort: fold < call < check < bet < raise
    const order: Record<string, number> = {
      fold: 0,
      call: 1,
      check: 2,
      bet: 3,
      raise: 4
    };
    return (order[a.action] || 5) - (order[b.action] || 5);
  });
  
  return frequencies;
}

/**
 * Get more realistic frequencies based on hand strength and situation
 * This is a simplified heuristic - real frequencies come from solvers
 */
export function getRealisticFrequencies(
  hand: Hand,
  position: Position,
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  actionToFace: BettingAction | null,
  optimalActions: (Action | BettingAction)[],
  numPlayers: number = 6,
  playerStackBB?: number
): ActionFrequency[] {
  const handString = formatHand(hand);
  const isPreflop = gameStage === "preflop";
  const facingBet = currentBet > 0 && (actionToFace === "bet" || actionToFace === "raise");
  
  // Calculate bet sizes
  const betSizes = [
    { label: "33%", size: Math.round((pot * 0.33) * 10) / 10, percent: 33 },
    { label: "50%", size: Math.round((pot * 0.5) * 10) / 10, percent: 50 },
    { label: "66%", size: Math.round((pot * 0.67) * 10) / 10, percent: 66 },
    { label: "100%", size: Math.round(pot * 10) / 10, percent: 100 },
    { label: "130%", size: Math.round((pot * 1.3) * 10) / 10, percent: 130 },
  ];
  
  // Filter bet sizes when facing a bet
  const minRaiseSize = facingBet ? currentBet * 2 : 0;
  const validBetSizes = facingBet 
    ? betSizes.filter(b => b.size > currentBet && b.size >= minRaiseSize)
    : betSizes;
  
  const frequencies: ActionFrequency[] = [];
  
  if (!optimalActions || optimalActions.length === 0) {
    return [];
  }
  
  // Heuristic: distribute frequencies based on action type and situation
  // Strong hands favor larger bet sizes, weak hands favor smaller sizes or checks
  
  optimalActions.forEach((action) => {
    if (action === "fold") {
      frequencies.push({
        action: "fold",
        frequency: 100 / optimalActions.length,
        label: "FOLD"
      });
    } else if (action === "check") {
      // Check typically has higher frequency when it's an option
      frequencies.push({
        action: "check",
        frequency: optimalActions.length === 1 ? 100 : 60,
        label: "CHECK"
      });
    } else if (action === "call") {
      frequencies.push({
        action: "call",
        frequency: optimalActions.length === 1 ? 100 : 40,
        label: `CALL ${currentBet > 0 ? `(${currentBet} bb)` : ""}`
      });
    } else if (action === "bet" || action === "raise") {
      // Distribute bet/raise frequency across bet sizes
      // Smaller bet sizes typically have higher frequency
      if (validBetSizes.length > 0) {
        const totalBetFrequency = optimalActions.length === 1 ? 100 : 50;
        
        // Distribute: smaller sizes get more frequency
        const sizeWeights = validBetSizes.map((_, i) => {
          // First size gets most weight, decreasing
          return validBetSizes.length - i;
        });
        const totalWeight = sizeWeights.reduce((a, b) => a + b, 0);
        
        validBetSizes.forEach((betSize, i) => {
          const weight = sizeWeights[i];
          const freq = (totalBetFrequency * weight) / totalWeight;
          
          frequencies.push({
            action: action as Action | BettingAction,
            betSize: betSize.size,
            frequency: Math.round(freq * 10) / 10,
            label: `${action.toUpperCase()} ${betSize.percent}%`
          });
        });
      }
    }
  });
  
  // Normalize frequencies to sum to 100%
  const totalFreq = frequencies.reduce((sum, f) => sum + f.frequency, 0);
  if (totalFreq > 0 && totalFreq !== 100) {
    frequencies.forEach(f => {
      f.frequency = Math.round((f.frequency * 100 / totalFreq) * 10) / 10;
    });
  }
  
  // Add all-in with 0% (unless it's the only option)
  if (optimalActions.includes("raise") || optimalActions.includes("bet")) {
    const hasAllIn = frequencies.some(f => f.label.includes("ALLIN"));
    if (!hasAllIn) {
      frequencies.push({
        action: "raise",
        betSize: 0,
        frequency: 0,
        label: "ALLIN"
      });
    }
  }
  
  // Sort by frequency (highest first)
  frequencies.sort((a, b) => b.frequency - a.frequency);
  
  return frequencies;
}

