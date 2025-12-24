import { Hand, Position } from "./gto";
import { formatHand } from "./gto";

export interface BetSizeAnalysis {
  isOptimal: boolean;
  optimalSize: number;
  sizeRange: { min: number; max: number };
  feedback: string;
  reasoning: string;
}

/**
 * GTO bet sizing analysis for preflop raises
 * Standard GTO preflop raise sizes:
 * - Early position: 2.5-3 BB (tighter, value-focused)
 * - Middle position: 2.5-3 BB
 * - Late position: 2-3 BB (can go smaller for bluffs/steals)
 * - Blinds: 2.5-3 BB (standard)
 * 
 * For premium hands (AA, KK, QQ, JJ, AK), can go larger (3-4 BB) for value
 * For medium strength hands, standard 2.5-3 BB is optimal
 */
export function analyzeBetSize(
  hand: Hand,
  position: Position,
  betSizeBB: number,
  numPlayers?: number
): BetSizeAnalysis {
  const handString = formatHand(hand);
  const rank1 = hand.card1.rank;
  const rank2 = hand.card2.rank;
  const isPair = rank1 === rank2;
  const isAce = rank1 === "A" || rank2 === "A";

  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rank1Value = rankOrder.indexOf(rank1);
  const rank2Value = rankOrder.indexOf(rank2);
  const highRankValue = Math.max(rank1Value, rank2Value);

  // Determine if it's a premium hand
  const isPremiumPair = isPair && highRankValue >= rankOrder.indexOf("T");
  const isPremiumAce = isAce && highRankValue >= rankOrder.indexOf("K");
  const isPremiumHand = isPremiumPair || isPremiumAce;

  // Table size adjustments
  const tableSize = numPlayers || 6;
  const isHeadsUp = tableSize === 2;
  const isShortHanded = tableSize <= 4;
  const isFullRing = tableSize >= 7;

  // Position-based optimal sizing
  const isEarlyPosition = ["UTG", "UTG+1"].includes(position);
  const isLatePosition = ["CO", "BTN"].includes(position);
  const isBlind = ["SB", "BB"].includes(position);

  let optimalSize: number;
  let sizeRange: { min: number; max: number };
  let reasoning: string;

  if (isPremiumHand) {
    // Premium hands: 3-4 BB for maximum value
    optimalSize = 3;
    sizeRange = { min: 3, max: 4 };
    reasoning = `Premium hands (${handString}) should be raised larger (3-4 BB) to maximize value and build the pot. In ${position} at a ${tableSize}-handed table, a 3-4 BB raise extracts maximum value from weaker hands while still allowing you to fold if facing a 3-bet from an even stronger hand.`;
  } else if (isEarlyPosition) {
    // Early position: 2.5-3 BB (standard, value-focused)
    optimalSize = 2.5;
    sizeRange = { min: 2.5, max: 3 };
    reasoning = `In early position (${position}) at a ${tableSize}-handed table, a standard raise size of 2.5-3 BB is optimal. This size builds the pot with your value hands while keeping the pot controlled if you need to fold to a 3-bet. Going larger risks building too large a pot out of position.`;
  } else if (isLatePosition) {
    // Late position: 2-3 BB (can go smaller for steals)
    optimalSize = 2.5;
    sizeRange = { min: 2, max: 3 };
    reasoning = `In late position (${position}) at a ${tableSize}-handed table, you can use a slightly wider range of bet sizes (2-3 BB). A 2.5-3 BB raise is standard for value hands, while 2-2.5 BB can be used for lighter raises/steals. Your position advantage allows for more flexibility. ${isHeadsUp ? "Heads-up, you can be even more aggressive." : ""}`;
  } else if (isBlind) {
    // Blinds: 2.5-3 BB (standard)
    optimalSize = 2.5;
    sizeRange = { min: 2.5, max: 3 };
    reasoning = `From the blinds (${position}) at a ${tableSize}-handed table, a standard raise size of 2.5-3 BB is optimal. This size works well for both value hands and lighter raises, balancing pot building with pot control.`;
  } else {
    // Middle position: 2.5-3 BB (standard)
    optimalSize = 2.5;
    sizeRange = { min: 2.5, max: 3 };
    reasoning = `In middle position (${position}) at a ${tableSize}-handed table, a standard raise size of 2.5-3 BB is optimal. This size builds the pot appropriately while maintaining flexibility.`;
  }

  // Check if bet size is optimal
  const isOptimal = betSizeBB >= sizeRange.min && betSizeBB <= sizeRange.max;
  
  let feedback = "";
  if (isOptimal) {
    feedback = `Correct! A ${betSizeBB} BB raise is within the optimal GTO range of ${sizeRange.min}-${sizeRange.max} BB for ${handString} in ${position}.`;
  } else if (betSizeBB < sizeRange.min) {
    feedback = `Too small! A ${betSizeBB} BB raise is below the optimal GTO range of ${sizeRange.min}-${sizeRange.max} BB. You're leaving value on the table with ${handString} in ${position}.`;
  } else {
    feedback = `Too large! A ${betSizeBB} BB raise exceeds the optimal GTO range of ${sizeRange.min}-${sizeRange.max} BB. This builds an unnecessarily large pot out of position and reduces your fold equity.`;
  }

  return {
    isOptimal,
    optimalSize,
    sizeRange,
    feedback,
    reasoning,
  };
}

