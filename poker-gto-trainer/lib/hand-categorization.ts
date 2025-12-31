import { Hand, formatHand } from "./gto";
import { GameStage } from "./postflop-gto";

/**
 * Hand strength categories for preflop analysis
 * Based on realistic poker hand rankings
 */
export type HandStrengthCategory = 
  | "premium"      // Top 1% - 3%
  | "strong"       // Top 5% - 10%
  | "good-decent"  // Top 10% - 20%
  | "playable"     // Top 20% - 35%
  | "speculative"  // Top 35% - 55%
  | "marginal"     // 55% - 70%
  | "trash";       // 70% - 100%

/**
 * Street categorization for betting rounds
 */
export type StreetNumber = "first-street" | "second-street" | "third-street" | "fourth-street";

/**
 * PREMIUM HANDS (Top 1% – 3%)
 * Definition: Hands that are almost always strong enough to raise from any position,
 * dominate ranges, and perform well against aggression.
 * Examples: AA, KK, QQ, AKs, AKo
 */
const PREMIUM_HANDS = new Set([
  "AA", "KK", "QQ",
  "AKs", "AKo",
]);

/**
 * STRONG HANDS (Top 5% – 10%)
 * Definition: Hands that win often and can value-raise in most positions.
 * Examples: JJ, TT, AQs, AQo, AJs, KQs
 */
const STRONG_HANDS = new Set([
  "JJ", "TT",
  "AQs", "AQo", "AJs",
  "KQs",
]);

/**
 * GOOD / DECENT HANDS (Top 10% – 20%)
 * Definition: Hands that play well in position and frequently flop competitive equity.
 * Examples: 99, 88, 77, ATs, AJo, KQo, KJs, QJs, JTs
 */
const GOOD_DECENT_HANDS = new Set([
  "99", "88", "77",
  "ATs", "AJo",
  "KQo", "KJs",
  "QJs",
  "JTs",
]);

/**
 * PLAYABLE HANDS (Top 20% – 35%)
 * Definition: Hands good enough to call or raise in later positions, especially with deep stacks.
 * Examples: 66, 55, 44, A9s–A2s, KJo, KTs, QTs, J9s, T9s, 98s
 */
const PLAYABLE_HANDS = new Set([
  "66", "55", "44",
  "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
  "KJo", "KTs",
  "QTs",
  "J9s",
  "T9s",
  "98s",
]);

/**
 * SPECULATIVE HANDS (Top 35% – 55%)
 * Definition: Hands that rely on hitting strong draws, two pairs, straights, flushes, or disguised equity.
 * Examples: 33, 22, Suited connectors: 87s, 76s, 65s, 54s, Suited gappers: 97s, 86s, 75s,
 * Offsuit broadways: QJo, KTo, QTo
 */
const SPECULATIVE_HANDS = new Set([
  "33", "22",
  // Suited connectors
  "87s", "76s", "65s", "54s",
  // Suited gappers
  "97s", "86s", "75s",
  // Offsuit broadways
  "QJo", "KTo", "QTo",
]);

/**
 * MARGINAL HANDS (55% – 70%)
 * Definition: Hands that are usually folded except in blinds or versus weak players.
 * Examples: A9o–A2o, K9o, Q9o, J9o, T8o, Suited trash like 94s, J3s
 */
const MARGINAL_HANDS = new Set([
  "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
  "K9o",
  "Q9o",
  "J9o",
  "T8o",
  // Suited trash
  "94s", "J3s",
]);

/**
 * TRASH HANDS (70% – 100%)
 * Definition: Hands that almost always lose money when played.
 * Examples: 72o, 82o, 93o, T4o, J2o, Q4o, K2o, Any hand with large gaps and no suit advantage
 */
const TRASH_HANDS = new Set([
  "72o", "73o", "74o", "75o", "76o", "78o", "79o", "7To", "7Jo", "7Qo", "7Ko", "7Ao",
  "82o", "83o", "84o", "85o", "86o", "87o", "89o", "8To", "8Jo", "8Qo", "8Ko", "8Ao",
  "92o", "93o", "94o", "95o", "96o", "97o", "98o", "9To", "9Jo", "9Qo", "9Ko", "9Ao",
  "T2o", "T3o", "T4o", "T5o", "T6o", "T7o", "T8o", "T9o", "TJo", "TQo", "TKo", "TAo",
  "J2o", "J3o", "J4o", "J5o", "J6o", "J7o", "J8o", "J9o", "JTo", "JQo", "JKo", "JAo",
  "Q2o", "Q3o", "Q4o", "Q5o", "Q6o", "Q7o", "Q8o", "Q9o", "QTo", "QJo", "QKo", "QAo",
  "K2o", "K3o", "K4o", "K5o", "K6o", "K7o", "K8o", "K9o", "KTo", "KJo", "KQo", "KAo",
  "A2o", "A3o", "A4o", "A5o", "A6o", "A7o", "A8o", "A9o", "ATo", "AJo", "AQo", "AKo",
  // Low pairs and other trash
  "32o", "42o", "43o", "52o", "53o", "54o", "62o", "63o", "64o", "65o",
  // Suited trash with large gaps
  "J2s", "J3s", "J4s", "J5s", "J6s", "J7s", "J8s",
  "T2s", "T3s", "T4s", "T5s", "T6s", "T7s", "T8s",
  "92s", "93s", "94s", "95s", "96s", "97s", "98s",
  "82s", "83s", "84s", "85s", "86s", "87s", "89s",
  "72s", "73s", "74s", "75s", "76s", "78s", "79s",
  "62s", "63s", "64s", "65s", "67s", "68s", "69s",
  "52s", "53s", "54s", "56s", "57s", "58s", "59s",
  "42s", "43s", "45s", "46s", "47s", "48s", "49s",
  "32s", "34s", "35s", "36s", "37s", "38s", "39s",
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
  
  if (GOOD_DECENT_HANDS.has(handString)) {
    return "good-decent";
  }
  
  if (PLAYABLE_HANDS.has(handString)) {
    return "playable";
  }
  
  if (SPECULATIVE_HANDS.has(handString)) {
    return "speculative";
  }
  
  if (MARGINAL_HANDS.has(handString)) {
    return "marginal";
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
      return "Premium Hand (Top 1% - 3%)";
    case "strong":
      return "Strong Hand (Top 5% - 10%)";
    case "good-decent":
      return "Good/Decent Hand (Top 10% - 20%)";
    case "playable":
      return "Playable Hand (Top 20% - 35%)";
    case "speculative":
      return "Speculative Hand (Top 35% - 55%)";
    case "marginal":
      return "Marginal Hand (55% - 70%)";
    case "trash":
      return "Trash Hand (70% - 100%)";
  }
}

/**
 * Get explanation of what hand strength category means
 */
export function getHandStrengthExplanation(category: HandStrengthCategory): string {
  switch (category) {
    case "premium":
      return "Premium hands (AA, KK, QQ, AKs, AKo) are the strongest starting hands in poker. They have very high raw equity, few reverse-implied-odds issues, excellent playability postflop, and are strong enough to 3-bet or 4-bet for value. These hands are almost always strong enough to raise from any position, dominate ranges, and perform well against aggression.";
    case "strong":
      return "Strong hands (JJ, TT, AQs, AQo, AJs, KQs) win often and can value-raise in most positions. They have high equity but are slightly more vulnerable than premium hands. They perform well even out of position and against 3-bets. Often at the top of continuing ranges, they can 3-bet for value or call depending on opponent.";
    case "good-decent":
      return "Good/decent hands (99, 88, 77, ATs, AJo, KQo, KJs, QJs, JTs) play well in position and frequently flop competitive equity. Often raised from mid-to-late position; sometimes folded early. These medium equity hands are strong in single-raised pots and often call vs open-raise, with a mixed strategy of raising/calling/folding.";
    case "playable":
      return "Playable hands (66, 55, 44, A9s-A2s, KJo, KTs, QTs, J9s, T9s, 98s) are good enough to call or raise in later positions, especially with deep stacks. Often require position or opponent mistakes to be profitable. These hands have good implied odds, excellent multiway performance, and good draws and combo potential.";
    case "speculative":
      return "Speculative hands (33, 22, suited connectors like 87s, 76s, 65s, 54s, suited gappers like 97s, 86s, 75s, offsuit broadways like QJo, KTo, QTo) rely on hitting strong draws, two pairs, straights, flushes, or disguised equity. Often played by pros in position with deep stacks but folded by weaker players. These hands have high implied odds, low showdown value, good multiway performance, and are great bluffing candidates on good textures.";
    case "marginal":
      return "Marginal hands (A9o-A2o, K9o, Q9o, J9o, T8o, suited trash like 94s, J3s) are usually folded except in blinds or versus weak players. They suffer from domination and reverse implied odds issues. Equity looks decent but plays poorly, and they get dominated easily by better broadways. Should be folded in early positions.";
    case "trash":
      return "Trash hands (72o, 82o, 93o, T4o, J2o, Q4o, K2o, any hand with large gaps and no suit advantage) almost always lose money when played. Rarely good enough to open-raise, call, or even defend. Only exceptions are extreme exploit spots. These hands have very low equity, poor playability, are easily dominated, and are nearly always folded. In realistic poker, players barely limp.";
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
