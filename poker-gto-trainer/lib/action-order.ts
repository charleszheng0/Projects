import { Position } from "./gto";

/**
 * Determine if player acts first based on position
 * In post-flop, action starts from the first player after the big blind (or button in heads-up)
 */
export function getIsPlayerFirst(playerPosition: Position, numPlayers: number): boolean {
  if (numPlayers === 2) {
    // Heads-up: Small blind acts first post-flop
    return playerPosition === "SB";
  }
  
  // Full ring: UTG acts first post-flop
  return playerPosition === "UTG";
}

/**
 * Get action order for post-flop
 */
export function getActionOrder(numPlayers: number): Position[] {
  if (numPlayers === 2) {
    return ["SB", "BB"];
  }
  
  // Post-flop order: UTG -> UTG+1 -> MP -> CO -> BTN -> SB -> BB
  // (First player after button acts first post-flop)
  const positions: Position[] = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"];
  return positions.slice(0, numPlayers);
}

