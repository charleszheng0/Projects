import { Hand, Card, formatHand } from "./gto";

/**
 * Hand strength categories for weighted generation
 * This ensures we get more playable hands and fewer unplayable ones
 */
const HAND_STRENGTH_CATEGORIES = {
  // Premium hands (pairs 88+, AK, AQ, AJs, KQs, etc.) - 15% frequency
  PREMIUM: [
    "AA", "KK", "QQ", "JJ", "TT", "99", "88",
    "AKs", "AKo", "AQs", "AQo", "AJs", "AJo",
    "KQs", "KQo", "KJs", "KJo", "QJs", "QJo",
  ],
  // Strong hands (pairs 55-77, suited connectors, broadways) - 25% frequency
  STRONG: [
    "77", "66", "55",
    "ATs", "ATo", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    "KTs", "KTo", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
    "QTs", "QTo", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s",
    "JTs", "JTo", "J9s", "J8s", "J7s",
    "T9s", "T8s", "T7s",
    "98s", "97s",
    "87s", "86s",
    "76s", "75s",
    "65s", "64s",
    "54s", "53s",
    "43s", "42s",
    "32s",
  ],
  // Medium hands (small pairs, suited aces, suited kings, etc.) - 30% frequency
  MEDIUM: [
    "44", "33", "22",
    "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
    "K9o", "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
    "Q9o", "Q8o", "Q7o", "Q6o", "Q5o",
    "J9o", "J8o", "J7o",
    "T9o", "T8o", "T7o",
    "98o", "97o",
    "87o", "86o",
    "76o", "75o",
    "65o", "64o",
    "54o", "53o",
    "43o", "42o",
    "32o",
  ],
  // Weak but playable hands (suited connectors, suited one-gappers) - 20% frequency
  WEAK_PLAYABLE: [
    "96s", "95s", "94s", "93s", "92s",
    "85s", "84s", "83s", "82s",
    "74s", "73s", "72s",
    "63s", "62s",
    "52s", "51s",
    "41s", "31s", "21s",
  ],
  // Unplayable hands (72o, 83o, etc.) - 10% frequency (reduced from ~30%)
  UNPLAYABLE: [
    "72o", "73o", "74o", "75o", "76o",
    "82o", "83o", "84o", "85o", "86o", "87o",
    "92o", "93o", "94o", "95o", "96o", "97o", "98o",
    "T2o", "T3o", "T4o", "T5o", "T6o", "T7o", "T8o", "T9o",
    "J2o", "J3o", "J4o", "J5o", "J6o", "J7o", "J8o", "J9o",
    "Q2o", "Q3o", "Q4o", "Q5o", "Q6o", "Q7o", "Q8o", "Q9o",
    "K2o", "K3o", "K4o", "K5o", "K6o", "K7o", "K8o", "K9o",
    "A2o", "A3o", "A4o", "A5o", "A6o", "A7o", "A8o", "A9o",
  ],
};

/**
 * Parse hand string to Hand object
 */
function parseHandString(handString: string): Hand | null {
  if (handString.length < 2) return null;
  
  // Handle pairs (e.g., "AA", "KK")
  if (handString.length === 2 && handString[0] === handString[1]) {
    const rank = handString[0];
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const suit1 = suits[Math.floor(Math.random() * 4)];
    let suit2 = suits[Math.floor(Math.random() * 4)];
    while (suit2 === suit1) {
      suit2 = suits[Math.floor(Math.random() * 4)];
    }
    return {
      card1: { rank, suit: suit1 },
      card2: { rank, suit: suit2 },
    };
  }
  
  // Handle non-pairs (e.g., "AKs", "72o")
  if (handString.length < 3) return null;
  
  const rank1 = handString[0];
  const rank2 = handString[1];
  const suited = handString[2] === "s";
  
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  if (suited) {
    const suit = suits[Math.floor(Math.random() * 4)];
    return {
      card1: { rank: rank1, suit },
      card2: { rank: rank2, suit },
    };
  } else {
    const suit1 = suits[Math.floor(Math.random() * 4)];
    let suit2 = suits[Math.floor(Math.random() * 4)];
    while (suit2 === suit1) {
      suit2 = suits[Math.floor(Math.random() * 4)];
    }
    return {
      card1: { rank: rank1, suit: suit1 },
      card2: { rank: rank2, suit: suit2 },
    };
  }
}

/**
 * Generate a weighted random hand (favors playable hands)
 */
export function generateWeightedRandomHand(): Hand {
  const rand = Math.random();
  
  let category: string[];
  if (rand < 0.15) {
    // 15% premium
    category = HAND_STRENGTH_CATEGORIES.PREMIUM;
  } else if (rand < 0.40) {
    // 25% strong
    category = HAND_STRENGTH_CATEGORIES.STRONG;
  } else if (rand < 0.70) {
    // 30% medium
    category = HAND_STRENGTH_CATEGORIES.MEDIUM;
  } else if (rand < 0.90) {
    // 20% weak but playable
    category = HAND_STRENGTH_CATEGORIES.WEAK_PLAYABLE;
  } else {
    // 10% unplayable (reduced from natural frequency)
    category = HAND_STRENGTH_CATEGORIES.UNPLAYABLE;
  }
  
  const handString = category[Math.floor(Math.random() * category.length)];
  const hand = parseHandString(handString);
  
  // Fallback to truly random if parsing fails
  if (!hand) {
    return generateRandomHand();
  }
  
  return hand;
}

/**
 * Generate truly random hand (for fallback or when needed)
 */
function generateRandomHand(): Hand {
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

/**
 * Generate a hand from a specific range (Set of hand encodings like "AKo", "76s", "22")
 * Returns null if range is empty or no valid hand can be generated
 */
export function generateHandFromRange(
  customRange: Set<string>,
  usedCards: Set<string>,
  maxAttempts: number = 200
): Hand | null {
  if (customRange.size === 0) {
    return null; // Empty range
  }

  // Convert Set to array for random selection
  const rangeArray = Array.from(customRange);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick a random hand encoding from the range
    const handEncoding = rangeArray[Math.floor(Math.random() * rangeArray.length)];
    const hand = parseHandString(handEncoding);
    
    if (!hand) continue; // Invalid encoding, try next
    
    // Check if cards are already used
    const card1Key = `${hand.card1.rank}-${hand.card1.suit}`;
    const card2Key = `${hand.card2.rank}-${hand.card2.suit}`;
    
    if (!usedCards.has(card1Key) && !usedCards.has(card2Key)) {
      return hand; // Found a valid hand from range
    }
  }
  
  // Couldn't find a valid hand from range (all cards already used)
  return null;
}

/**
 * Generate multiple unique hands (for dealing to all players)
 * Uses weighted generation for player hand, random for opponents
 * Optionally filters player hand by custom range
 */
export function generateUniqueHands(
  count: number, 
  excludeCards: Card[] = [], 
  useWeightedForPlayer: boolean = true,
  customRange?: Set<string>,
  useCustomRange: boolean = false
): Hand[] {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  
  const usedCards = new Set<string>();
  excludeCards.forEach(card => {
    usedCards.add(`${card.rank}-${card.suit}`);
  });
  
  const hands: Hand[] = [];
  
  for (let i = 0; i < count; i++) {
    let hand: Hand | null = null;
    let attempts = 0;
    
    do {
      // For player hand (first hand), check if custom range should be used
      if (i === 0 && useCustomRange && customRange && customRange.size > 0) {
        // Try to generate from custom range (pass usedCards to avoid conflicts)
        hand = generateHandFromRange(customRange, usedCards, 200);
        
        // If range generation failed, fall back to weighted/random
        if (!hand) {
          console.warn("Could not generate hand from custom range, falling back to default generation");
          if (useWeightedForPlayer) {
            hand = generateWeightedRandomHand();
          } else {
            hand = generateRandomHand();
          }
        }
      } else {
        // Use weighted generation for first hand (player), random for others
        if (i === 0 && useWeightedForPlayer) {
          hand = generateWeightedRandomHand();
        } else {
          hand = generateRandomHand();
        }
      }
      
      if (!hand) {
        attempts++;
        if (attempts > 100) {
          // Fallback: just generate any hand if we can't find unique cards
          hand = generateRandomHand();
          break;
        }
        continue;
      }
      
      // Check if cards are already used
      const card1Key = `${hand.card1.rank}-${hand.card1.suit}`;
      const card2Key = `${hand.card2.rank}-${hand.card2.suit}`;
      
      if (!usedCards.has(card1Key) && !usedCards.has(card2Key)) {
        usedCards.add(card1Key);
        usedCards.add(card2Key);
        break;
      }
      
      attempts++;
      if (attempts > 100) {
        // Fallback: just generate any hand if we can't find unique cards
        hand = generateRandomHand();
        break;
      }
    } while (true);
    
    if (hand) {
      hands.push(hand);
    } else {
      // Last resort: generate any hand
      hands.push(generateRandomHand());
    }
  }
  
  return hands;
}
