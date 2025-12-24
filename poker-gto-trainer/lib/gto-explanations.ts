import { Hand, Position, Action } from "./gto";
import { formatHand } from "./gto";
import gtoRanges from "./gto-ranges.json";

export interface GTOExplanation {
  correctActions: Action[];
  explanation: string;
  reasoning: string;
}

export function getGTOExplanation(
  hand: Hand,
  position: Position,
  actionTaken: Action,
  optimalActions: Action[]
): GTOExplanation {
  const handString = formatHand(hand);
  const rank1 = hand.card1.rank;
  const rank2 = hand.card2.rank;
  const suit1 = hand.card1.suit;
  const suit2 = hand.card2.suit;
  const isPair = rank1 === rank2;
  const isSuited = suit1 === suit2;
  const isAce = rank1 === "A" || rank2 === "A";

  // Get the rank values for comparison
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rank1Value = rankOrder.indexOf(rank1);
  const rank2Value = rankOrder.indexOf(rank2);
  const highRankValue = Math.max(rank1Value, rank2Value);

  // Get the optimal action from GTO ranges
  const positionRanges = gtoRanges[position as keyof typeof gtoRanges] as Record<string, string>;
  const optimalActionRaw = positionRanges[handString] as Action | undefined;
  // Convert "all-in" to "raise" since we removed all-in button
  const optimalAction = optimalActionRaw === "all-in" ? "raise" : optimalActionRaw;
  
  // Store original for explanation purposes
  const wasAllIn = optimalActionRaw === "all-in";

  // Position-based reasoning
  const isEarlyPosition = ["UTG", "UTG+1"].includes(position);
  const isMiddlePosition = position === "MP";
  const isLatePosition = ["CO", "BTN"].includes(position);
  const isBlind = ["SB", "BB"].includes(position);

  // Use the optimalActions passed in (from getGTOAction)
  const correctActions = optimalActions;
  let explanation = "";
  let reasoning = "";

  if (!optimalAction || (optimalActions.length === 1 && optimalActions[0] === "fold")) {
    // Hand not in range - should fold
    explanation = `${handString} is not in the GTO range for ${position}.`;
    reasoning = `This hand is too weak to play from ${position}. GTO strategy recommends folding weak hands in early positions to avoid being dominated by stronger hands.`;
  } else if (optimalAction) {

    // Generate explanation based on hand type and action
    // Note: "all-in" from ranges is converted to "raise" for UI
    if (wasAllIn || optimalAction === "raise") {
      if (wasAllIn && isPair && highRankValue >= rankOrder.indexOf("T")) {
        explanation = `${handString} is a premium pair.`;
        reasoning = `Premium pairs (TT+) have the strongest equity preflop. Raising aggressively (or going all-in) maximizes value and puts maximum pressure on opponents. In ${position}, this aggressive play builds a large pot when you're likely ahead and can force folds from weaker hands.`;
      } else if (wasAllIn && isAce && highRankValue >= rankOrder.indexOf("K")) {
        explanation = `${handString} is a premium ace hand.`;
        reasoning = `AK is one of the strongest non-pair hands preflop. It has high card value, pairs well, and can dominate weaker ace hands. Raising aggressively (or going all-in) maximizes value and puts maximum pressure on opponents. In ${position}, this aggressive play is optimal because you're likely ahead or have good equity even when behind.`;
      } else if (optimalAction === "raise") {
        if (isPair && highRankValue >= rankOrder.indexOf("7") && highRankValue < rankOrder.indexOf("T")) {
          explanation = `${handString} is a medium pair.`;
          reasoning = `Medium pairs (77-99) have decent equity but are vulnerable to overcards. Raising builds the pot when ahead and can force folds from weaker hands. In ${position}, raising is preferred over calling because it builds value and gives you initiative. ${correctActions.includes("call") ? "However, calling can also be acceptable to control pot size." : ""}`;
        } else if (isAce && highRankValue >= rankOrder.indexOf("Q")) {
          if (isSuited) {
            explanation = `${handString} is a strong ace-suited hand.`;
            reasoning = `AQs has excellent high card value and flush potential. Raising builds the pot and can get value from weaker hands. In ${position}, raising is optimal because you have a strong hand that plays well post-flop and can dominate weaker ace hands.`;
          } else {
            explanation = `${handString} is a strong ace offsuit hand.`;
            reasoning = `AQo has good high card value but is vulnerable to AK and pairs. In ${position}, raising builds the pot when ahead, but you need to be cautious of stronger hands. ${isEarlyPosition ? "In early position, this is more marginal." : ""}`;
          }
        } else if (!isAce && isSuited && highRankValue >= rankOrder.indexOf("K")) {
          explanation = `${handString} is a strong suited hand.`;
          reasoning = `Strong suited hands like KQs have good high card value and flush potential. Raising builds the pot and can get value from weaker hands. In ${position}, raising is optimal because you have a hand that plays well post-flop.`;
        } else {
          // Default explanation for raise
          explanation = `${handString} is a strong hand from ${position}.`;
          reasoning = `Raising builds the pot and can get value from weaker hands. In ${position}, raising is the optimal GTO play for this hand.`;
        }
      }
    } else if (optimalAction === "call") {
      if (isPair && highRankValue < rankOrder.indexOf("7")) {
        explanation = `${handString} is a small pair.`;
        reasoning = `Small pairs (22-66) need to hit a set to be profitable. Calling allows you to see a flop with good implied odds if you hit your set. In ${position}, calling is correct because the pot odds justify seeing a flop, and if you hit, you can win a large pot. ${correctActions.includes("fold") ? "However, folding can also be correct if pot odds aren't favorable." : ""}`;
      } else if (isAce && highRankValue < rankOrder.indexOf("Q")) {
        if (isSuited) {
          explanation = `${handString} is a playable ace-suited hand.`;
          reasoning = `Weak ace-suited hands have some value due to flush potential and high card value. Calling allows you to see a flop cheaply. In ${position}, calling is acceptable because you have implied odds if you hit a flush or pair your ace.`;
        } else {
          explanation = `${handString} is a marginal ace offsuit hand.`;
          reasoning = `Weak ace offsuit hands are easily dominated by stronger aces. In ${position}, calling is marginal and depends on pot odds. You're hoping to pair your ace or hit a straight, but you're vulnerable to being dominated.`;
        }
      } else if (!isAce && isSuited) {
        explanation = `${handString} is a suited hand.`;
        reasoning = `Suited hands have flush potential, which gives you good implied odds. Calling allows you to see a flop cheaply. In ${position}, calling is correct because if you hit a flush or strong draw, you can win a large pot.`;
      } else if (!isAce && !isSuited && highRankValue >= rankOrder.indexOf("J")) {
        explanation = `${handString} is a broadway hand.`;
        reasoning = `Broadway hands have decent high card value. Calling allows you to see a flop. In ${position}, calling is acceptable because you have some equity, but you need to be cautious of stronger hands.`;
      } else {
        // Default explanation for call
        explanation = `${handString} is a playable hand from ${position}.`;
        reasoning = `Calling allows you to see a flop with this hand. In ${position}, calling is the correct GTO play based on pot odds and hand strength.`;
      }
    } else if (optimalAction === "fold") {
      explanation = `${handString} is too weak to play from ${position}.`;
      reasoning = `This hand has low equity preflop and is easily dominated. Folding is the correct GTO play to avoid losing chips with a weak hand. In ${position}, ${isEarlyPosition ? "early position requires tight play, so weak hands should be folded." : isBlind ? "even though you're in the blind, this hand is too weak to play." : "this hand doesn't have enough value to justify playing."}`;
    } else {
      // Default explanation
      explanation = `${handString} from ${position}.`;
      reasoning = `The optimal GTO action for this hand in ${position} is ${optimalAction}. This decision is based on hand strength, position, and pot odds.`;
    }
  }

  // Position-specific adjustments to reasoning
  if (isBlind && optimalAction !== "fold") {
    reasoning += ` As a blind, you're already invested in the pot, which slightly improves your pot odds.`;
  } else if (isLatePosition && optimalAction !== "fold") {
    reasoning += ` Late position gives you an advantage post-flop, allowing you to play more hands profitably.`;
  } else if (isEarlyPosition && optimalAction !== "fold") {
    reasoning += ` Early position is challenging because many players act after you, so you need stronger hands to play.`;
  }

  return {
    correctActions,
    explanation,
    reasoning,
  };
}

