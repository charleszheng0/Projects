import { Hand, Card } from "./gto";
import { GameStage } from "./postflop-gto";
import { evaluateHandStrength } from "./postflop-gto";

export interface PostFlopBetSizeAnalysis {
  isOptimal: boolean;
  optimalSizeBB: number;
  optimalSizePotPercent: number;
  sizeRangeBB: { min: number; max: number };
  sizeRangePotPercent: { min: number; max: number };
  feedback: string;
  reasoning: string;
}

/**
 * GTO bet sizing analysis for post-flop bets
 * Bet sizing is pot-relative, not fixed BB amounts
 * 
 * GTO bet sizing by street:
 * - Flop: 33-50% pot (small), 66-100% pot (large/value)
 * - Turn: 50-75% pot (standard), 100%+ pot (large value)
 * - River: 50-100% pot (value bets), 25-50% pot (bluffs/thin value)
 */
export function analyzePostFlopBetSize(
  hand: Hand,
  communityCards: Card[],
  stage: GameStage,
  betSizeBB: number,
  potSizeBB: number,
  position: string
): PostFlopBetSizeAnalysis {
  const handStrength = evaluateHandStrength(hand, communityCards, stage);
  const betSizePotPercent = (betSizeBB / potSizeBB) * 100;
  
  const isInPosition = position === "BTN" || position === "CO";
  const isOutOfPosition = position === "SB" || position === "BB" || position === "UTG" || position === "UTG+1";
  
  let optimalSizePotPercent: number;
  let sizeRangePotPercent: { min: number; max: number };
  let reasoning: string;
  
  // Determine optimal sizing based on street and hand strength
  if (stage === "flop") {
    if (handStrength >= 0.7) {
      // Very strong hand - large bet for value (66-100% pot)
      optimalSizePotPercent = 75;
      sizeRangePotPercent = { min: 66, max: 100 };
      reasoning = `On the flop with a very strong hand, betting 66-100% of the pot maximizes value. Your hand is likely ahead, so you want to build a large pot. ${isInPosition ? "In position, you can bet larger for value." : "Out of position, betting large still extracts value while protecting your hand."}`;
    } else if (handStrength >= 0.5) {
      // Strong hand - medium bet (50-75% pot)
      optimalSizePotPercent = 60;
      sizeRangePotPercent = { min: 50, max: 75 };
      reasoning = `On the flop with a strong hand, betting 50-75% of the pot balances value extraction with pot control. This size gets value from weaker hands while not over-committing with a potentially vulnerable hand.`;
    } else if (handStrength >= 0.4) {
      // Medium hand - small bet (33-50% pot)
      optimalSizePotPercent = 40;
      sizeRangePotPercent = { min: 33, max: 50 };
      reasoning = `On the flop with a medium-strength hand, betting 33-50% of the pot allows you to build the pot while maintaining flexibility. This size works well for both value and protection.`;
    } else {
      // Weak hand - small bet or check (bluff sizing: 33-50% pot)
      optimalSizePotPercent = 40;
      sizeRangePotPercent = { min: 33, max: 50 };
      reasoning = `On the flop with a weak hand, if betting, use a small size (33-50% pot) for bluffs. This keeps your bluffs cheap while still applying pressure.`;
    }
  } else if (stage === "turn") {
    if (handStrength >= 0.7) {
      // Very strong hand - large bet (75-100% pot)
      optimalSizePotPercent = 85;
      sizeRangePotPercent = { min: 75, max: 100 };
      reasoning = `On the turn with a very strong hand, betting 75-100% of the pot maximizes value. The pot is larger now, so bet sizes scale accordingly. You want to extract maximum value from weaker hands.`;
    } else if (handStrength >= 0.5) {
      // Strong hand - medium-large bet (60-80% pot)
      optimalSizePotPercent = 70;
      sizeRangePotPercent = { min: 60, max: 80 };
      reasoning = `On the turn with a strong hand, betting 60-80% of the pot builds the pot effectively. The larger pot size means your bets should be proportionally larger than on the flop.`;
    } else if (handStrength >= 0.4) {
      // Medium hand - medium bet (50-66% pot)
      optimalSizePotPercent = 58;
      sizeRangePotPercent = { min: 50, max: 66 };
      reasoning = `On the turn with a medium-strength hand, betting 50-66% of the pot maintains pot control while still building the pot.`;
    } else {
      // Weak hand - small bet or check (bluff sizing: 50-66% pot)
      optimalSizePotPercent = 58;
      sizeRangePotPercent = { min: 50, max: 66 };
      reasoning = `On the turn with a weak hand, if betting as a bluff, use 50-66% of the pot. Turn bluffs need to be larger than flop bluffs to be credible.`;
    }
  } else if (stage === "river") {
    if (handStrength >= 0.7) {
      // Very strong hand - large value bet (75-100% pot, sometimes overbet)
      optimalSizePotPercent = 85;
      sizeRangePotPercent = { min: 75, max: 100 };
      reasoning = `On the river with a very strong hand, betting 75-100% of the pot maximizes value. The pot has grown significantly, so bet sizes are much larger in absolute terms. You want to extract maximum value from weaker hands that may call.`;
    } else if (handStrength >= 0.5) {
      // Strong hand - medium-large bet (60-80% pot)
      optimalSizePotPercent = 70;
      sizeRangePotPercent = { min: 60, max: 80 };
      reasoning = `On the river with a strong hand, betting 60-80% of the pot is optimal for value. The large pot size means even 60% pot is a substantial bet in BBs.`;
    } else if (handStrength >= 0.4) {
      // Medium hand - medium bet (50-66% pot) for thin value
      optimalSizePotPercent = 58;
      sizeRangePotPercent = { min: 50, max: 66 };
      reasoning = `On the river with a medium-strength hand, betting 50-66% of the pot can work for thin value. However, checking is often better with marginal hands.`;
    } else {
      // Weak hand - small bet or check (bluff sizing: 25-50% pot)
      optimalSizePotPercent = 40;
      sizeRangePotPercent = { min: 25, max: 50 };
      reasoning = `On the river with a weak hand, if betting as a bluff, use 25-50% of the pot. River bluffs can be smaller since you're trying to get folds, not build a pot.`;
    }
  } else {
    // Fallback (shouldn't happen)
    optimalSizePotPercent = 50;
    sizeRangePotPercent = { min: 33, max: 66 };
    reasoning = `Standard bet sizing applies.`;
  }
  
  // Convert pot percentages to BB amounts
  const optimalSizeBB = Math.round((potSizeBB * optimalSizePotPercent) / 100);
  const sizeRangeBB = {
    min: Math.round((potSizeBB * sizeRangePotPercent.min) / 100),
    max: Math.round((potSizeBB * sizeRangePotPercent.max) / 100),
  };
  
  // Check if bet size is optimal
  const isOptimal = betSizeBB >= sizeRangeBB.min && betSizeBB <= sizeRangeBB.max;
  
  let feedback = "";
  if (isOptimal) {
    feedback = `Correct! A ${betSizeBB} BB bet (${betSizePotPercent.toFixed(0)}% pot) is within the optimal GTO range of ${sizeRangeBB.min}-${sizeRangeBB.max} BB (${sizeRangePotPercent.min}-${sizeRangePotPercent.max}% pot) for the ${stage}.`;
  } else if (betSizeBB < sizeRangeBB.min) {
    feedback = `Too small! A ${betSizeBB} BB bet (${betSizePotPercent.toFixed(0)}% pot) is below the optimal GTO range of ${sizeRangeBB.min}-${sizeRangeBB.max} BB (${sizeRangePotPercent.min}-${sizeRangePotPercent.max}% pot). You're leaving value on the table.`;
  } else {
    feedback = `Too large! A ${betSizeBB} BB bet (${betSizePotPercent.toFixed(0)}% pot) exceeds the optimal GTO range of ${sizeRangeBB.min}-${sizeRangeBB.max} BB (${sizeRangePotPercent.min}-${sizeRangePotPercent.max}% pot). This over-commits you with a potentially vulnerable hand.`;
  }
  
  return {
    isOptimal,
    optimalSizeBB,
    optimalSizePotPercent,
    sizeRangeBB,
    sizeRangePotPercent,
    feedback,
    reasoning,
  };
}

