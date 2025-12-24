import { Hand, Position, Action } from "./gto";
import { formatHand } from "./gto";
import gtoRanges from "./gto-ranges.json";

/**
 * Adjusts GTO ranges based on table size
 * Fewer players = looser ranges (more hands are playable)
 * More players = tighter ranges (fewer hands are playable)
 */
export function getAdjustedGTOAction(
  hand: Hand,
  position: Position,
  numPlayers: number,
  actionTaken: Action
): { correct: boolean; optimalActions: Action[]; feedback: string } {
  const handString = formatHand(hand);
  const rank1 = hand.card1.rank;
  const rank2 = hand.card2.rank;
  const suit1 = hand.card1.suit;
  const suit2 = hand.card2.suit;
  const isPair = rank1 === rank2;
  const isSuited = suit1 === suit2;
  const isAce = rank1 === "A" || rank2 === "A";

  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rank1Value = rankOrder.indexOf(rank1);
  const rank2Value = rankOrder.indexOf(rank2);
  const highRankValue = Math.max(rank1Value, rank2Value);
  const lowRankValue = Math.min(rank1Value, rank2Value);

  // Get base range for position
  const positionRanges = gtoRanges[position as keyof typeof gtoRanges] as Record<string, string>;
  const baseAction = positionRanges[handString] as Action | undefined;

  // Determine table size category
  const isHeadsUp = numPlayers === 2;
  const isShortHanded = numPlayers <= 4;
  const isMidHanded = numPlayers >= 5 && numPlayers <= 6;
  const isFullRing = numPlayers >= 7;

  // Determine position category
  const isEarlyPosition = ["UTG", "UTG+1"].includes(position);
  const isMiddlePosition = position === "MP";
  const isLatePosition = ["CO", "BTN"].includes(position);
  const isBlind = ["SB", "BB"].includes(position);

  // Adjust action based on table size AND position
  // Position is PRIMARY factor - late position allows more aggressive play
  let optimalAction: Action | undefined = baseAction;

  // If hand is not in base range, check if it becomes playable with fewer players
  // BUT respect position - late position can play more hands
  if (!baseAction || baseAction === "fold") {
    // For heads-up, position matters less
    if (isHeadsUp) {
      // Heads-up: Very wide ranges
      optimalAction = getHeadsUpAction(handString, isPair, isSuited, isAce, highRankValue, lowRankValue, rankOrder);
    } else if (isShortHanded) {
      // Short-handed (3-4 players): Wider ranges, but position still matters
      optimalAction = getShortHandedAction(handString, isPair, isSuited, isAce, highRankValue, lowRankValue, rankOrder, position, isEarlyPosition, isLatePosition);
    } else if (isMidHanded) {
      // Mid-handed (5-6 players): Slightly wider than full ring, position matters
      optimalAction = getMidHandedAction(handString, isPair, isSuited, isAce, highRankValue, lowRankValue, rankOrder, position, isEarlyPosition, isLatePosition);
    } else {
      // Full ring (7-9 players): Use base ranges (tightest), but late position can still widen slightly
      if (isLatePosition && !baseAction) {
        // In late position at full ring, some marginal hands become playable
        optimalAction = getLatePositionFullRingAction(handString, isPair, isSuited, isAce, highRankValue, lowRankValue, rankOrder);
      } else {
        optimalAction = baseAction;
      }
    }
  } else {
    // Hand is already in range - might become more aggressive with fewer players OR in late position
    if (isHeadsUp && (optimalAction === "call" || optimalAction === "fold")) {
      // In heads-up, many calling hands become raises
      if (isPair || isAce || highRankValue >= rankOrder.indexOf("K")) {
        optimalAction = "raise";
      }
    } else if (isLatePosition && optimalAction === "call" && (isPair || isAce || highRankValue >= rankOrder.indexOf("J"))) {
      // In late position, some calling hands can become raises
      if (isPair && highRankValue >= rankOrder.indexOf("7")) {
        optimalAction = "raise";
      } else if (isAce && highRankValue >= rankOrder.indexOf("T")) {
        optimalAction = "raise";
      } else if (highRankValue >= rankOrder.indexOf("K")) {
        optimalAction = "raise";
      }
    } else if (isEarlyPosition && optimalAction === "raise" && !isPair && !isAce && highRankValue < rankOrder.indexOf("K")) {
      // In early position, some weaker raising hands should just call or fold
      if (highRankValue < rankOrder.indexOf("Q")) {
        optimalAction = "call";
      }
    }
  }

  // Convert "all-in" to "raise"
  const normalizedOptimalAction = optimalAction === "all-in" ? "raise" : optimalAction;
  const optimalActions: Action[] = normalizedOptimalAction ? [normalizedOptimalAction] : ["fold"];

  // Add alternative actions for certain hands
  if (normalizedOptimalAction === "raise" && (handString.includes("77") || handString.includes("88") || handString.includes("99"))) {
    optimalActions.push("call");
  } else if (normalizedOptimalAction === "call" && (handString.includes("22") || handString.includes("33") || handString.includes("44") || handString.includes("55") || handString.includes("66"))) {
    optimalActions.push("fold");
  }

  const correct = optimalActions.includes(actionTaken);

  let feedback = "";
  if (correct) {
    if (optimalActions.length > 1) {
      feedback = `Correct! For ${handString} in ${position} at a ${numPlayers}-handed table, ${optimalActions.join(" or ")} are acceptable GTO actions.`;
    } else {
      feedback = `Correct! The optimal GTO action for ${handString} in ${position} at a ${numPlayers}-handed table is to ${normalizedOptimalAction}.`;
    }
  } else {
    if (optimalActions.length > 1) {
      feedback = `Incorrect. For ${handString} in ${position} at a ${numPlayers}-handed table, the optimal GTO actions are ${optimalActions.join(" or ")}, but you chose to ${actionTaken}.`;
    } else {
      feedback = `Incorrect. The optimal GTO action for ${handString} in ${position} at a ${numPlayers}-handed table is to ${normalizedOptimalAction}, but you chose to ${actionTaken}.`;
    }
  }

  return {
    correct,
    optimalActions,
    feedback,
  };
}

function getHeadsUpAction(
  handString: string,
  isPair: boolean,
  isSuited: boolean,
  isAce: boolean,
  highRankValue: number,
  lowRankValue: number,
  rankOrder: string[]
): Action {
  // Heads-up: Very wide ranges, almost any ace, any pair, any suited hand, any K-high
  if (isPair) {
    return "raise";
  }
  if (isAce) {
    // Any ace is playable heads-up
    if (highRankValue >= rankOrder.indexOf("T")) {
      return "raise";
    }
    return isSuited ? "raise" : "call";
  }
  if (isSuited && highRankValue >= rankOrder.indexOf("7")) {
    return "call";
  }
  if (highRankValue >= rankOrder.indexOf("K")) {
    return "call";
  }
  if (highRankValue >= rankOrder.indexOf("Q") && lowRankValue >= rankOrder.indexOf("T")) {
    return "call";
  }
  return "fold";
}

function getShortHandedAction(
  handString: string,
  isPair: boolean,
  isSuited: boolean,
  isAce: boolean,
  highRankValue: number,
  lowRankValue: number,
  rankOrder: string[],
  position: Position,
  isEarlyPosition: boolean,
  isLatePosition: boolean
): Action {
  // Short-handed (3-4 players): Wider ranges than full ring, but position still matters
  if (isPair) {
    if (highRankValue >= rankOrder.indexOf("7")) {
      return isLatePosition ? "raise" : (isEarlyPosition ? "call" : "raise");
    }
    return isLatePosition ? "call" : "fold";
  }
  if (isAce) {
    if (highRankValue >= rankOrder.indexOf("Q")) {
      return isLatePosition ? "raise" : (isEarlyPosition ? "raise" : "raise");
    }
    if (highRankValue >= rankOrder.indexOf("T")) {
      // AT-AK
      if (isLatePosition) {
        return isSuited ? "raise" : "call";
      } else if (isEarlyPosition) {
        return isSuited ? "call" : "fold";
      } else {
        return isSuited ? "raise" : "call";
      }
    }
    if (highRankValue >= rankOrder.indexOf("7")) {
      // A7-A9
      if (isLatePosition) {
        return isSuited ? "raise" : "call";
      } else if (isEarlyPosition) {
        return isSuited ? "call" : "fold";
      } else {
        return isSuited ? "call" : "fold";
      }
    }
    // Weak aces (A2-A6) become playable short-handed, but mainly in late position
    if (highRankValue >= rankOrder.indexOf("5")) {
      if (isLatePosition) {
        return isSuited ? "call" : "fold";
      } else {
        return "fold";
      }
    }
    return "fold";
  }
  if (isSuited && highRankValue >= rankOrder.indexOf("8")) {
    return isLatePosition ? "call" : (isEarlyPosition ? "fold" : "call");
  }
  if (highRankValue >= rankOrder.indexOf("K")) {
    // K-high hands
    if (isLatePosition) {
      return "call";
    } else if (isEarlyPosition) {
      return "fold";
    } else {
      return "call";
    }
  }
  if (highRankValue >= rankOrder.indexOf("Q") && lowRankValue >= rankOrder.indexOf("9")) {
    return isLatePosition ? "call" : "fold";
  }
  return "fold";
}

function getMidHandedAction(
  handString: string,
  isPair: boolean,
  isSuited: boolean,
  isAce: boolean,
  highRankValue: number,
  lowRankValue: number,
  rankOrder: string[],
  position: Position,
  isEarlyPosition: boolean,
  isLatePosition: boolean
): Action {
  // Mid-handed (5-6 players): Slightly wider than full ring, position matters significantly
  if (isPair) {
    if (highRankValue >= rankOrder.indexOf("7")) {
      return isLatePosition ? "raise" : (isEarlyPosition ? "raise" : "raise");
    }
    return isLatePosition ? "call" : (isEarlyPosition ? "fold" : "call");
  }
  if (isAce) {
    if (highRankValue >= rankOrder.indexOf("Q")) {
      return isLatePosition ? "raise" : (isEarlyPosition ? "raise" : "raise");
    }
    if (highRankValue >= rankOrder.indexOf("T")) {
      // AT-AK
      if (isLatePosition) {
        return isSuited ? "raise" : "call";
      } else if (isEarlyPosition) {
        return isSuited ? "call" : "fold";
      } else {
        return isSuited ? "raise" : "call";
      }
    }
    if (highRankValue >= rankOrder.indexOf("8")) {
      // A8-A9
      if (isLatePosition) {
        return isSuited ? "raise" : "call";
      } else if (isEarlyPosition) {
        return "fold";
      } else {
        return isSuited ? "call" : "fold";
      }
    }
    // A7 becomes playable mid-handed, but mainly in late position
    if (highRankValue >= rankOrder.indexOf("7")) {
      if (isLatePosition) {
        return isSuited ? "call" : "fold";
      } else {
        return "fold";
      }
    }
    return "fold";
  }
  if (isSuited && highRankValue >= rankOrder.indexOf("9")) {
    return isLatePosition ? "call" : (isEarlyPosition ? "fold" : "call");
  }
  if (highRankValue >= rankOrder.indexOf("K")) {
    return isLatePosition ? "call" : (isEarlyPosition ? "fold" : "call");
  }
  return "fold";
}

function getLatePositionFullRingAction(
  handString: string,
  isPair: boolean,
  isSuited: boolean,
  isAce: boolean,
  highRankValue: number,
  lowRankValue: number,
  rankOrder: string[]
): Action {
  // Late position at full ring: Some marginal hands become playable
  if (isPair) {
    if (highRankValue >= rankOrder.indexOf("6")) {
      return "call";
    }
    return "fold";
  }
  if (isAce) {
    if (highRankValue >= rankOrder.indexOf("T")) {
      return isSuited ? "call" : "fold";
    }
    if (highRankValue >= rankOrder.indexOf("7")) {
      return isSuited ? "call" : "fold";
    }
    return "fold";
  }
  if (isSuited && highRankValue >= rankOrder.indexOf("T")) {
    return "call";
  }
  return "fold";
}

