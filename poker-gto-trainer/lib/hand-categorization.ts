import { Hand, formatHand } from "./gto";
import { GameStage } from "./postflop-gto";

/**
 * Hand strength categories for preflop analysis
 */
export type HandStrengthCategory = "premium" | "strong" | "decent" | "weak" | "trash";

/**
 * Street categorization for betting rounds
 */
export type StreetNumber = "first-street" | "second-street" | "third-street" | "fourth-street";

/**
 * Premium hands - the strongest starting hands
 * AA, KK, QQ, JJ, AKs, AKo
 */
const PREMIUM_HANDS = new Set([
  "AA", "KK", "QQ", "JJ",
  "AKs", "AKo",
]);

/**
 * Strong hands - very playable hands that can be played aggressively
 * TT, 99, 88, AQs, AQo, AJs, KQs, KQo, QJs
 */
const STRONG_HANDS = new Set([
  "TT", "99", "88",
  "AQs", "AQo", "AJs", "AJo",
  "KQs", "KQo", "KJs", "KJo",
  "QJs", "QJo",
  "JTs", "JTo",
]);

/**
 * Decent/Playable hands - hands that are playable in certain situations
 * Medium pairs (77-22), suited aces, suited connectors, broadway cards
 */
const DECENT_HANDS = new Set([
  "77", "66", "55", "44", "33", "22",
  "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
  "ATo", "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
  "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
  "KTo", "K9o", "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
  "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s",
  "QTo", "Q9o", "Q8o", "Q7o", "Q6o", "Q5o",
  "J9s", "J8s", "J7s",
  "J9o", "J8o", "J7o",
  "T9s", "T8s", "T7s",
  "T9o", "T8o", "T7o",
  "98s", "97s", "96s", "95s", "94s", "93s", "92s",
  "98o", "97o", "96o", "95o", "94o", "93o", "92o",
  "87s", "86s", "85s", "84s", "83s", "82s",
  "87o", "86o", "85o", "84o", "83o", "82o",
  "76s", "75s", "74s", "73s", "72s",
  "76o", "75o", "74o", "73o",
  "65s", "64s", "63s", "62s",
  "65o", "64o", "63o", "62o",
  "54s", "53s", "52s", "51s",
  "54o", "53o", "52o", "51o",
  "43s", "42s", "41s", "31s", "21s",
  "43o", "42o", "41o", "31o", "21o",
  "32s",
]);

/**
 * Weak hands - marginal hands that are rarely playable
 * Weak offsuit hands, low cards
 */
const WEAK_HANDS = new Set([
  "72o", "73o", "74o", "75o", "76o",
  "82o", "83o", "84o", "85o", "86o", "87o",
  "92o", "93o", "94o", "95o", "96o", "97o", "98o",
  "T2o", "T3o", "T4o", "T5o", "T6o", "T7o", "T8o", "T9o",
  "J2o", "J3o", "J4o", "J5o", "J6o", "J7o", "J8o", "J9o",
  "Q2o", "Q3o", "Q4o", "Q5o", "Q6o", "Q7o", "Q8o", "Q9o",
  "K2o", "K3o", "K4o", "K5o", "K6o", "K7o", "K8o", "K9o",
  "A2o", "A3o", "A4o", "A5o", "A6o", "A7o", "A8o", "A9o",
  "32o",
]);

/**
 * Categorize a preflop hand by strength
 */
export function categorizeHandStrength(hand: Hand): HandStrengthCategory {
  const handString = formatHand(hand);
  
  if (PREMIUM_HANDS.has(handString)) {
    return "premium";
  }
  
  if (STRONG_HANDS.has(handString)) {
    return "strong";
  }
  
  if (DECENT_HANDS.has(handString)) {
    return "decent";
  }
  
  if (WEAK_HANDS.has(handString)) {
    return "weak";
  }
  
  // Default to trash for any unrecognized hands
  return "trash";
}

/**
 * Get street number from game stage
 * In poker terminology:
 * - Preflop = First Street (first betting round)
 * - Flop = Second Street (second betting round)
 * - Turn = Third Street (third betting round)
 * - River = Fourth Street (fourth betting round)
 */
export function getStreetNumber(gameStage: GameStage): StreetNumber {
  switch (gameStage) {
    case "preflop":
      return "first-street";
    case "flop":
      return "second-street";
    case "turn":
      return "third-street";
    case "river":
      return "fourth-street";
    default:
      return "first-street";
  }
}

/**
 * Get human-readable description of hand strength category
 */
export function getHandStrengthDescription(category: HandStrengthCategory): string {
  switch (category) {
    case "premium":
      return "Premium Hand";
    case "strong":
      return "Strong Hand";
    case "decent":
      return "Decent/Playable Hand";
    case "weak":
      return "Weak Hand";
    case "trash":
      return "Trash/Unplayable Hand";
  }
}

/**
 * Get explanation of what hand strength category means
 */
export function getHandStrengthExplanation(category: HandStrengthCategory): string {
  switch (category) {
    case "premium":
      return "Premium hands (AA, KK, QQ, JJ, AK) are the strongest starting hands in poker. They have the highest win rate and should almost always be played aggressively preflop. These hands make up only about 2.1% of all possible starting hands.";
    case "strong":
      return "Strong hands (TT, 99, 88, AQ, AJ, KQ, KJ, QJ, JT) are very playable and can be played aggressively in most situations. They have good equity and can win pots even when they don't improve. These hands make up about 5-7% of all starting hands.";
    case "decent":
      return "Decent/playable hands include medium pairs (77-22), suited aces, suited connectors, and broadway cards. These hands are playable in certain situations depending on position, table size, and pot odds. They require good postflop play to be profitable.";
    case "weak":
      return "Weak hands are marginal and rarely playable. They include weak offsuit hands and low cards. These hands are easily dominated and should usually be folded unless you're in late position with good pot odds or playing heads-up.";
    case "trash":
      return "Trash/unplayable hands are the worst starting hands (like 72o, 83o). These hands have very low equity and are almost always folded preflop. They make up a significant portion of all possible hands but should rarely be played.";
  }
}

/**
 * Get human-readable description of street number
 */
export function getStreetDescription(street: StreetNumber): string {
  switch (street) {
    case "first-street":
      return "First Street (Preflop)";
    case "second-street":
      return "Second Street (Flop)";
    case "third-street":
      return "Third Street (Turn)";
    case "fourth-street":
      return "Fourth Street (River)";
  }
}

/**
 * Get explanation of what street means in poker
 */
export function getStreetExplanation(street: StreetNumber): string {
  switch (street) {
    case "first-street":
      return "First Street (Preflop) is the initial betting round where players act before any community cards are dealt. This is where you make your first decision based only on your hole cards. Strong hands should be played aggressively here.";
    case "second-street":
      return "Second Street (Flop) is the second betting round after three community cards are dealt. This is where hand strength can change dramatically. Players with strong hands or draws should bet for value or protection, while weak hands should fold.";
    case "third-street":
      return "Third Street (Turn) is the third betting round after the fourth community card is dealt. Pot sizes are larger here, so decisions become more expensive. Strong hands should bet for value, while marginal hands need to consider pot odds carefully.";
    case "fourth-street":
      return "Fourth Street (River) is the final betting round after the fifth and final community card is dealt. This is where you make your final decision with complete information. Betting is often polarized here - either strong value bets or bluffs, with medium-strength hands often checking.";
  }
}

