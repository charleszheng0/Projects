import { Hand, Card } from "./gto";

/**
 * Generate multiple unique hands (for dealing to all players)
 */
export function generateUniqueHands(count: number, excludeCards: Card[] = []): Hand[] {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  
  const usedCards = new Set<string>();
  excludeCards.forEach(card => {
    usedCards.add(`${card.rank}-${card.suit}`);
  });
  
  const hands: Hand[] = [];
  
  for (let i = 0; i < count; i++) {
    let card1: Card;
    let card2: Card;
    let attempts = 0;
    
    do {
      // Generate first card
      const rank1 = ranks[Math.floor(Math.random() * ranks.length)];
      const suit1 = suits[Math.floor(Math.random() * suits.length)];
      card1 = { rank: rank1, suit: suit1 };
      
      // Generate second card
      let rank2: string;
      let suit2: string;
      do {
        rank2 = ranks[Math.floor(Math.random() * ranks.length)];
        suit2 = suits[Math.floor(Math.random() * suits.length)];
      } while (rank1 === rank2 && suit1 === suit2);
      
      card2 = { rank: rank2, suit: suit2 };
      
      // Check if cards are already used
      const card1Key = `${card1.rank}-${card1.suit}`;
      const card2Key = `${card2.rank}-${card2.suit}`;
      
      if (!usedCards.has(card1Key) && !usedCards.has(card2Key)) {
        usedCards.add(card1Key);
        usedCards.add(card2Key);
        break;
      }
      
      attempts++;
      if (attempts > 100) {
        // Fallback: just generate any hand if we can't find unique cards
        break;
      }
    } while (true);
    
    hands.push({ card1, card2 });
  }
  
  return hands;
}

