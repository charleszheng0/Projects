import gtoRanges from "./gto-ranges.json";

export type Card = {
  rank: string;
  suit: string;
};

export type Hand = {
  card1: Card;
  card2: Card;
};

export type Position = "UTG" | "UTG+1" | "MP" | "CO" | "BTN" | "SB" | "BB";

export type Action = "fold" | "call" | "bet" | "raise" | "all-in";

export function formatHand(hand: Hand): string {
  const rank1 = hand.card1.rank;
  const rank2 = hand.card2.rank;
  const suit1 = hand.card1.suit;
  const suit2 = hand.card2.suit;

  // Sort ranks (Ace is highest)
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rank1Index = rankOrder.indexOf(rank1);
  const rank2Index = rankOrder.indexOf(rank2);

  let highRank: string;
  let lowRank: string;
  if (rank1Index > rank2Index) {
    highRank = rank1;
    lowRank = rank2;
  } else {
    highRank = rank2;
    lowRank = rank1;
  }

  // Check if suited
  const isSuited = suit1 === suit2;
  const suitedSuffix = isSuited ? "s" : "o";

  // Check if pair
  if (rank1 === rank2) {
    return `${rank1}${rank2}`;
  }

  return `${highRank}${lowRank}${suitedSuffix}`;
}

export function getGTOAction(
  hand: Hand,
  position: Position,
  actionTaken: Action
): { correct: boolean; optimalActions: Action[]; feedback: string } {
  const handString = formatHand(hand);
  const positionRanges = gtoRanges[position as keyof typeof gtoRanges] as Record<string, string>;
  
  const optimalAction = positionRanges[handString] as Action | undefined;

  if (!optimalAction) {
    // Default to fold if not in range
    const correct = actionTaken === "fold";
    return {
      correct,
      optimalActions: ["fold"],
      feedback: correct
        ? "Correct! This hand is not in the GTO range for this position, so folding is optimal."
        : `Incorrect. The optimal GTO action for ${handString} in ${position} is to fold.`,
    };
  }

  // For some hands, multiple actions can be correct (e.g., raise/call for medium pairs)
  // Check if action taken matches the optimal action or is in acceptable alternatives
  // Convert "all-in" to "raise" since we removed all-in button
  const normalizedOptimalAction = optimalAction === "all-in" ? "raise" : optimalAction;
  const optimalActions: Action[] = [normalizedOptimalAction];
  
  // Add alternative actions for certain hands (e.g., raise/call for medium pairs)
  if (normalizedOptimalAction === "raise" && (handString.includes("77") || handString.includes("88") || handString.includes("99"))) {
    optimalActions.push("call");
  } else if (normalizedOptimalAction === "call" && (handString.includes("22") || handString.includes("33") || handString.includes("44") || handString.includes("55") || handString.includes("66"))) {
    // Small pairs can sometimes fold
    optimalActions.push("fold");
  }
  
  // If original was all-in, also accept raise as correct
  if (optimalAction === "all-in" && !optimalActions.includes("raise")) {
    optimalActions.push("raise");
  }

  const correct = optimalActions.includes(actionTaken);

  let feedback = "";
  if (correct) {
    if (optimalActions.length > 1) {
      feedback = `Correct! For ${handString} in ${position}, ${optimalActions.join(" or ")} are acceptable GTO actions.`;
    } else {
      feedback = `Correct! The optimal GTO action for ${handString} in ${position} is to ${normalizedOptimalAction}.`;
    }
  } else {
    if (optimalActions.length > 1) {
      feedback = `Incorrect. For ${handString} in ${position}, the optimal GTO actions are ${optimalActions.join(" or ")}, but you chose to ${actionTaken}.`;
    } else {
      feedback = `Incorrect. The optimal GTO action for ${handString} in ${position} is to ${normalizedOptimalAction}, but you chose to ${actionTaken}.`;
    }
  }

  return {
    correct,
    optimalActions,
    feedback,
  };
}

export function generateRandomHand(): Hand {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const suits = ["hearts", "diamonds", "clubs", "spades"];

  const rank1 = ranks[Math.floor(Math.random() * ranks.length)];
  const suit1 = suits[Math.floor(Math.random() * suits.length)];

  let rank2: string;
  let suit2: string;
  do {
    rank2 = ranks[Math.floor(Math.random() * ranks.length)];
    suit2 = suits[Math.floor(Math.random() * suits.length)];
  } while (rank1 === rank2 && suit1 === suit2);

  return {
    card1: { rank: rank1, suit: suit1 },
    card2: { rank: rank2, suit: suit2 },
  };
}

export function getPositionFromSeat(seat: number, totalPlayers: number): Position {
  // Map seat numbers to positions
  // Positions are: UTG, UTG+1, MP, CO, BTN, SB, BB
  // For preflop, positions are relative to the button/blinds
  
  if (totalPlayers <= 2) {
    // Heads-up: SB and BB only
    return seat === 0 ? "SB" : "BB";
  }
  
  // For 3+ players, map seats to positions
  // The last 3 seats are always BTN, SB, BB
  // Earlier seats are UTG, UTG+1, MP, CO (depending on table size)
  
  const lastThreeSeats = totalPlayers - 3;
  
  if (seat < lastThreeSeats) {
    // Early/middle positions
    const earlyPositions: Position[] = ["UTG", "UTG+1", "MP", "CO"];
    // Map to available early positions, defaulting to UTG if too many players
    return earlyPositions[Math.min(seat, earlyPositions.length - 1)] || "UTG";
  } else if (seat === lastThreeSeats) {
    return "BTN";
  } else if (seat === lastThreeSeats + 1) {
    return "SB";
  } else {
    return "BB";
  }
}

