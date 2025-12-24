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
  optimalActions: Action[],
  numPlayers?: number
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

  // Get the base range action for comparison (to detect if hand became playable)
  const positionRanges = gtoRanges[position as keyof typeof gtoRanges] as Record<string, string>;
  const baseActionRaw = positionRanges[handString] as Action | undefined;
  const baseAction = baseActionRaw === "all-in" ? "raise" : baseActionRaw;
  
  // Determine what the optimal action is based on table size
  // Check if hand became playable due to table size
  const wasNotInBaseRange = !baseAction || baseAction === "fold";
  const becamePlayable = wasNotInBaseRange && optimalActions[0] !== "fold";
  
  // Store original for explanation purposes
  const wasAllIn = baseActionRaw === "all-in";
  
  // Get the actual optimal action (from optimalActions - this is table-size adjusted)
  const optimalAction = optimalActions[0];

  // Table size adjustments
  const tableSize = numPlayers || 6; // Default to 6 if not provided
  const isHeadsUp = tableSize === 2;
  const isShortHanded = tableSize <= 4;
  const isMidHanded = tableSize >= 5 && tableSize <= 6;
  const isFullRing = tableSize >= 7;

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
    explanation = `${handString} is not in the GTO range for ${position} at a ${tableSize}-handed table.`;
    if (isFullRing) {
      reasoning = `At a full ring table (${tableSize} players), GTO strategy requires very tight ranges. With many opponents, the probability that someone has a stronger hand is high. ${handString} is too weak and easily dominated by stronger aces, pairs, or high cards. Folding is correct to avoid losing chips.`;
    } else if (isMidHanded) {
      reasoning = `At a ${tableSize}-handed table, ranges are tighter than short-handed games. ${handString} doesn't have enough equity to justify playing from ${position} with ${tableSize - 1} opponents who could have stronger hands.`;
    } else if (isShortHanded) {
      reasoning = `Even at a short-handed table (${tableSize} players), ${handString} is too weak from ${position}. While ranges are wider than full ring, this hand is still easily dominated and doesn't have enough value.`;
    } else {
      reasoning = `Even heads-up, ${handString} is too weak to play from ${position}. This hand has very low equity and is easily dominated.`;
    }
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
        if (becamePlayable && isAce && highRankValue < rankOrder.indexOf("Q")) {
          // Weak aces that became playable due to table size
          explanation = `${handString} becomes playable at a ${tableSize}-handed table.`;
          if (isHeadsUp) {
            reasoning = `Heads-up, almost any ace is playable. ${handString} has decent high card value and can dominate weaker hands. Raising builds the pot and puts pressure on your opponent. With only one opponent, the risk of being dominated is much lower.`;
          } else if (isShortHanded) {
            reasoning = `At a short-handed table (${tableSize} players), weaker aces like ${handString} become playable. With fewer opponents, the chance of someone having a stronger ace is reduced. ${isSuited ? "Being suited adds flush potential, making this hand even more valuable." : "Raising builds the pot and can get value from weaker hands."}`;
          } else {
            reasoning = `At a ${tableSize}-handed table, ${handString} is on the edge of playability. ${isSuited ? "Being suited gives you flush potential, making it worth raising." : "Raising can work, but you need to be cautious of stronger hands."}`;
          }
        } else if (isPair && highRankValue >= rankOrder.indexOf("7") && highRankValue < rankOrder.indexOf("T")) {
          explanation = `${handString} is a medium pair.`;
          reasoning = `Medium pairs (77-99) have decent equity but are vulnerable to overcards. At a ${tableSize}-handed table, raising builds the pot when ahead and can force folds from weaker hands. In ${position}, raising is preferred over calling because it builds value and gives you initiative. ${correctActions.includes("call") ? "However, calling can also be acceptable to control pot size." : ""}`;
        } else if (isAce && highRankValue >= rankOrder.indexOf("Q")) {
          if (isSuited) {
            explanation = `${handString} is a strong ace-suited hand.`;
            reasoning = `AQs has excellent high card value and flush potential. At a ${tableSize}-handed table, raising builds the pot and can get value from weaker hands. In ${position}, raising is optimal because you have a strong hand that plays well post-flop and can dominate weaker ace hands.`;
          } else {
            explanation = `${handString} is a strong ace offsuit hand.`;
            reasoning = `AQo has good high card value but is vulnerable to AK and pairs. At a ${tableSize}-handed table, raising builds the pot when ahead, but you need to be cautious of stronger hands. ${isEarlyPosition ? "In early position, this is more marginal." : ""}`;
          }
        } else if (!isAce && isSuited && highRankValue >= rankOrder.indexOf("K")) {
          explanation = `${handString} is a strong suited hand.`;
          reasoning = `Strong suited hands like KQs have good high card value and flush potential. At a ${tableSize}-handed table, raising builds the pot and can get value from weaker hands. In ${position}, raising is optimal because you have a hand that plays well post-flop.`;
        } else if (becamePlayable) {
          // Hand became playable due to table size
          explanation = `${handString} becomes playable at a ${tableSize}-handed table.`;
          if (isHeadsUp) {
            reasoning = `Heads-up, ranges are very wide. ${handString} has enough equity to be playable. With only one opponent, you can raise for value or as a bluff, and your position advantage makes this profitable.`;
          } else if (isShortHanded) {
            reasoning = `At a short-handed table (${tableSize} players), ${handString} becomes playable. With fewer opponents, the chance of someone having a stronger hand is reduced, making this hand profitable to raise.`;
          } else {
            reasoning = `At a ${tableSize}-handed table, ${handString} is on the edge of playability. Raising can work, but you need to be selective about when to continue post-flop.`;
          }
        } else {
          // Default explanation for raise
          explanation = `${handString} is a strong hand from ${position}.`;
          reasoning = `At a ${tableSize}-handed table, raising builds the pot and can get value from weaker hands. In ${position}, raising is the optimal GTO play for this hand.`;
        }
      }
    } else if (optimalAction === "call") {
      if (becamePlayable && isAce && highRankValue < rankOrder.indexOf("Q")) {
        // Weak aces that became playable due to table size
        explanation = `${handString} becomes playable at a ${tableSize}-handed table.`;
        if (isHeadsUp) {
          reasoning = `Heads-up, almost any ace is playable. ${handString} has decent high card value. Calling allows you to see a flop cheaply, and if you pair your ace, you can win a significant pot. With only one opponent, the risk is manageable.`;
        } else if (isShortHanded) {
          reasoning = `At a short-handed table (${tableSize} players), weaker aces like ${handString} become playable. ${isSuited ? "Being suited adds flush potential, making calling profitable." : "Calling allows you to see a flop cheaply. If you pair your ace, you can win a pot, but be cautious of stronger aces."}`;
        } else {
          reasoning = `At a ${tableSize}-handed table, ${handString} is marginally playable. ${isSuited ? "Being suited gives you flush potential, making calling acceptable." : "Calling is marginal - you're hoping to pair your ace, but you're vulnerable to being dominated."}`;
        }
      } else if (isPair && highRankValue < rankOrder.indexOf("7")) {
        explanation = `${handString} is a small pair.`;
        reasoning = `Small pairs (22-66) need to hit a set to be profitable. At a ${tableSize}-handed table, calling allows you to see a flop with good implied odds if you hit your set. In ${position}, calling is correct because the pot odds justify seeing a flop, and if you hit, you can win a large pot. ${correctActions.includes("fold") ? "However, folding can also be correct if pot odds aren't favorable." : ""}`;
      } else if (isAce && highRankValue < rankOrder.indexOf("Q")) {
        if (isSuited) {
          explanation = `${handString} is a playable ace-suited hand.`;
          reasoning = `Weak ace-suited hands have some value due to flush potential and high card value. At a ${tableSize}-handed table, calling allows you to see a flop cheaply. In ${position}, calling is acceptable because you have implied odds if you hit a flush or pair your ace.`;
        } else {
          explanation = `${handString} is a marginal ace offsuit hand.`;
          reasoning = `Weak ace offsuit hands are easily dominated by stronger aces. At a ${tableSize}-handed table, calling is marginal and depends on pot odds. You're hoping to pair your ace or hit a straight, but you're vulnerable to being dominated. ${isHeadsUp ? "Heads-up, this is more playable." : isShortHanded ? "Short-handed, this becomes more acceptable." : ""}`;
        }
      } else if (!isAce && isSuited) {
        explanation = `${handString} is a suited hand.`;
        reasoning = `Suited hands have flush potential, which gives you good implied odds. At a ${tableSize}-handed table, calling allows you to see a flop cheaply. In ${position}, calling is correct because if you hit a flush or strong draw, you can win a large pot. ${isHeadsUp ? "Heads-up, suited hands are even more valuable." : ""}`;
      } else if (!isAce && !isSuited && highRankValue >= rankOrder.indexOf("J")) {
        explanation = `${handString} is a broadway hand.`;
        reasoning = `Broadway hands have decent high card value. At a ${tableSize}-handed table, calling allows you to see a flop. In ${position}, calling is acceptable because you have some equity, but you need to be cautious of stronger hands. ${isHeadsUp ? "Heads-up, these hands are more playable." : ""}`;
      } else if (becamePlayable) {
        // Hand became playable due to table size
        explanation = `${handString} becomes playable at a ${tableSize}-handed table.`;
        if (isHeadsUp) {
          reasoning = `Heads-up, ranges are very wide. ${handString} has enough equity to be playable. Calling allows you to see a flop cheaply and potentially win a pot.`;
        } else if (isShortHanded) {
          reasoning = `At a short-handed table (${tableSize} players), ${handString} becomes playable. With fewer opponents, calling becomes profitable as the chance of someone having a stronger hand is reduced.`;
        } else {
          reasoning = `At a ${tableSize}-handed table, ${handString} is marginally playable. Calling is acceptable, but you need to be selective about continuing post-flop.`;
        }
      } else {
        // Default explanation for call
        explanation = `${handString} is a playable hand from ${position}.`;
        reasoning = `At a ${tableSize}-handed table, calling allows you to see a flop with this hand. In ${position}, calling is the correct GTO play based on pot odds and hand strength.`;
      }
    } else if (optimalAction === "fold") {
      explanation = `${handString} is too weak to play from ${position} at a ${tableSize}-handed table.`;
      if (isFullRing) {
        reasoning = `At a full ring table (${tableSize} players), ranges are very tight. ${handString} is too weak and easily dominated by stronger hands. With many opponents, the probability that someone has a stronger hand is high, making folding the correct play.`;
      } else if (isMidHanded) {
        reasoning = `At a ${tableSize}-handed table, ${handString} is still too weak from ${position}. While ranges are wider than full ring, this hand doesn't have enough equity to justify playing with ${tableSize - 1} opponents who could have stronger hands.`;
      } else if (isShortHanded) {
        reasoning = `Even at a short-handed table (${tableSize} players), ${handString} is too weak from ${position}. While ranges are wider, this hand is still easily dominated and doesn't have enough value.`;
      } else {
        reasoning = `Even heads-up, ${handString} is too weak to play from ${position}. This hand has very low equity and is easily dominated.`;
      }
    } else {
      // Default explanation
      explanation = `${handString} from ${position}.`;
      reasoning = `The optimal GTO action for this hand in ${position} is ${optimalAction}. This decision is based on hand strength, position, and pot odds.`;
    }
  }

  // Table size and position-specific adjustments to reasoning
  if (isHeadsUp) {
    reasoning += ` At a heads-up table (2 players), ranges are much wider since there are fewer opponents to worry about.`;
  } else if (isShortHanded) {
    reasoning += ` At a short-handed table (${tableSize} players), ranges are wider than full ring, allowing you to play more hands profitably.`;
  } else if (isFullRing) {
    reasoning += ` At a full ring table (${tableSize} players), ranges are tighter since more players can have strong hands.`;
  }
  
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

