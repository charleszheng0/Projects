import { Hand, Card } from "./gto";
import { GameStage, BettingAction } from "./postflop-gto";
import { 
  getStreetNumber, 
  getStreetDescription, 
  getStreetExplanation,
  StreetNumber 
} from "./hand-categorization";

export interface PostFlopExplanation {
  explanation: string;
  reasoning: string;
  streetNumber?: StreetNumber;
  streetDescription?: string;
  streetExplanation?: string;
}

export function getPostFlopExplanation(
  playerHand: Hand,
  communityCards: Card[],
  stage: GameStage,
  position: string,
  actionTaken: BettingAction,
  optimalActions: BettingAction[],
  handStrength: number
): PostFlopExplanation {
  const handDescription = getHandDescription(handStrength);
  const isInPosition = position === "BTN" || position === "CO";
  
  // Get street information
  const streetNumber = getStreetNumber(stage);
  const streetDescription = getStreetDescription(streetNumber);
  const streetExplanation = getStreetExplanation(streetNumber);
  
  let explanation = "";
  let reasoning = "";

  if (optimalActions.includes("bet")) {
    explanation = `Betting is optimal with a ${handDescription} on the ${stage}.`;
    reasoning = `With a ${handDescription}, betting for value builds the pot when you're likely ahead. ${isInPosition ? "Being in position gives you an advantage, allowing you to bet for value and control the pot." : "Even out of position, betting with a strong hand is correct to build the pot."}`;
  } else if (optimalActions.includes("check")) {
    explanation = `Checking is optimal with a ${handDescription} on the ${stage}.`;
    reasoning = `With a ${handDescription}, checking allows you to control pot size and see the next card. ${isInPosition ? "In position, checking gives you flexibility to bet on later streets or call if your opponent bets." : "Out of position, checking prevents you from building a large pot with a marginal hand."}`;
  } else if (optimalActions.includes("call")) {
    explanation = `Calling is optimal with a ${handDescription} on the ${stage}.`;
    reasoning = `With a ${handDescription}, calling allows you to continue in the hand with good pot odds. ${isInPosition ? "In position, calling is often correct as you can see what your opponent does on later streets." : "Out of position, calling is acceptable if the bet size is reasonable relative to the pot."}`;
  } else if (optimalActions.includes("raise")) {
    explanation = `Raising is optimal with a ${handDescription} on the ${stage}.`;
    reasoning = `With a ${handDescription}, raising builds the pot and puts maximum pressure on your opponent. This is especially effective when you have a strong hand and want to extract value.`;
  } else {
    explanation = `Folding is optimal with a ${handDescription} on the ${stage}.`;
    reasoning = `With a ${handDescription}, folding is correct. You don't have enough equity to continue, and calling would be unprofitable.`;
  }

  // Add street information to reasoning
  reasoning = `${reasoning}\n\n**Current Street: ${streetDescription}**\n${streetExplanation}`;

  return {
    explanation,
    reasoning,
    streetNumber,
    streetDescription,
    streetExplanation,
  };
}

function getHandDescription(strength: number): string {
  if (strength >= 0.9) return "very strong hand (two pair+, trips+)";
  if (strength >= 0.7) return "strong hand (top pair, good draws)";
  if (strength >= 0.5) return "medium-strong hand (middle pair)";
  if (strength >= 0.3) return "medium hand (bottom pair, weak draws)";
  return "weak hand (high card, nothing)";
}

