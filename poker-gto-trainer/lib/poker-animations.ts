/**
 * Poker Animation Utilities
 * Provides smooth, minimalistic animations for poker game flow
 */

export type AnimationType = 
  | "deal-card"
  | "action-glow"
  | "chip-move"
  | "fold"
  | "pot-update"
  | "community-deal";

export interface AnimationState {
  type: AnimationType;
  targetSeat?: number;
  duration: number;
  delay?: number;
}

/**
 * Animation timing constants (in milliseconds)
 */
export const ANIMATION_TIMINGS = {
  CARD_DEAL: 200,
  ACTION_GLOW: 150,
  CHIP_MOVE: 300,
  FOLD: 250,
  POT_UPDATE: 200,
  COMMUNITY_DEAL: 150,
  STAGGER_DELAY: 50, // Delay between sequential animations
};

/**
 * Get animation class for card dealing
 */
export function getCardDealAnimation(index: number, totalCards: number): string {
  const delay = index * ANIMATION_TIMINGS.STAGGER_DELAY;
  return `animate-in fade-in duration-${ANIMATION_TIMINGS.CARD_DEAL} delay-[${delay}ms]`;
}

/**
 * Get animation class for action glow
 */
export function getActionGlowAnimation(): string {
  return "animate-pulse transition-all duration-300";
}

/**
 * Get animation class for chip movement
 */
export function getChipMoveAnimation(): string {
  return "animate-in slide-in-from-bottom fade-in duration-300";
}

/**
 * Get animation class for fold
 */
export function getFoldAnimation(): string {
  return "animate-out fade-out slide-out-to-left duration-250";
}

/**
 * Get animation class for pot update
 */
export function getPotUpdateAnimation(): string {
  return "animate-in zoom-in duration-200";
}

/**
 * Calculate action order for preflop (clockwise from UTG)
 */
export function getPreflopActionOrder(numPlayers: number): number[] {
  // Positions: UTG, UTG+1, MP, CO, BTN, BB, SB (SB acts last)
  // We need to map positions to seat numbers
  // For now, return seat order (0, 1, 2, ...) which should match position order
  // This will be adjusted based on actual position mapping
  return Array.from({ length: numPlayers }, (_, i) => i);
}

/**
 * Calculate action order for postflop (clockwise from first player after button)
 */
export function getPostflopActionOrder(numPlayers: number, buttonSeat: number): number[] {
  // Postflop: First player after button acts first
  const order: number[] = [];
  for (let i = 1; i <= numPlayers; i++) {
    const seat = (buttonSeat + i) % numPlayers;
    order.push(seat);
  }
  return order;
}

