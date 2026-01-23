import { Hand, Card } from "./gto";
import { GameStage } from "./postflop-gto";

/**
 * Get the poker hand rank name with specific card details
 * (e.g., "High card King", "Pair of Aces", "Two pair Kings and Tens")
 */
export function getHandRankName(playerHand: Hand, communityCards: Card[], stage: GameStage): string {
  if (communityCards.length === 0 || stage === "preflop") {
    return "Preflop";
  }
  
  const allCards = [playerHand.card1, playerHand.card2, ...communityCards];
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rankNames: Record<string, string> = {
    "2": "Two", "3": "Three", "4": "Four", "5": "Five", "6": "Six", "7": "Seven",
    "8": "Eight", "9": "Nine", "T": "Ten", "J": "Jack", "Q": "Queen", "K": "King", "A": "Ace"
  };
  
  // Count ranks and suits
  const rankCounts: Record<string, number> = {};
  const suitCounts: Record<string, number> = {};
  
  allCards.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  
  // Check for pairs, trips, quads
  const pairs: string[] = [];
  let trips = false;
  let tripsRank = "";
  let quads = false;
  let quadsRank = "";
  
  Object.entries(rankCounts).forEach(([rank, count]) => {
    if (count === 2) pairs.push(rank);
    if (count === 3) {
      trips = true;
      tripsRank = rank;
    }
    if (count === 4) {
      quads = true;
      quadsRank = rank;
    }
  });
  
  // Sort pairs by rank value (highest first)
  pairs.sort((a, b) => rankOrder.indexOf(b) - rankOrder.indexOf(a));
  
  // Check for flush
  const flushSuit = Object.entries(suitCounts).find(([_, count]) => count >= 5)?.[0];
  const hasFlush = !!flushSuit;
  
  // Check for straight (simplified)
  const ranks = Object.keys(rankCounts).map(r => rankOrder.indexOf(r)).sort((a, b) => a - b);
  let hasStraight = false;
  let straightHigh = "";
  for (let i = 0; i <= ranks.length - 5; i++) {
    if (ranks[i + 4] - ranks[i] === 4) {
      hasStraight = true;
      straightHigh = rankOrder[ranks[i + 4]];
      break;
    }
  }
  
  // Get highest card for high card hands
  const getHighestCard = (): string => {
    const allRanks = allCards.map(c => rankOrder.indexOf(c.rank));
    const highestRankIndex = Math.max(...allRanks);
    return rankNames[rankOrder[highestRankIndex]];
  };
  
  // Evaluate hand rank with details
  if (quads) {
    return `Four of a kind ${rankNames[quadsRank]}s`;
  }
  if (trips && pairs.length > 0) {
    return `Full house ${rankNames[tripsRank]}s over ${rankNames[pairs[0]]}s`;
  }
  if (hasFlush && hasStraight) {
    return `Straight flush ${straightHigh} high`;
  }
  if (hasFlush) {
    return `Flush ${getHighestCard()} high`;
  }
  if (hasStraight) {
    return `Straight ${straightHigh} high`;
  }
  if (trips) {
    return `Three of a kind ${rankNames[tripsRank]}s`;
  }
  if (pairs.length >= 2) {
    return `Two pair ${rankNames[pairs[0]]}s and ${rankNames[pairs[1]]}s`;
  }
  if (pairs.length === 1) {
    return `Pair of ${rankNames[pairs[0]]}s`;
  }
  return `High card ${getHighestCard()}`;
}

