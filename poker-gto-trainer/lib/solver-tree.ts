import { Card, Hand, Position } from "./gto";
import { GameStage, BettingAction } from "./postflop-gto";

/**
 * Solver Node Structure
 * Represents a decision point in the game tree
 */
export interface SolverNode {
  id: string;
  street: GameStage;
  potSize: number;
  currentBet: number;
  actions: SolverAction[];
  handFrequencies?: Record<string, Record<string, number>>; // hand -> action -> frequency
}

export interface SolverAction {
  type: "check" | "fold" | "call" | "bet" | "raise";
  size?: number; // Bet/raise size as pot multiplier (e.g., 0.33, 0.5, 0.75, 1.0)
  frequency: number; // 0-1 probability
  ev: number; // Expected value
}

/**
 * Game State for Solver Lookup
 */
export interface SolverGameState {
  street: GameStage;
  positionKey: string; // e.g., "BTNvsBB", "SBvsBB"
  boardKey: string; // e.g., "8h7d3s" or "" for preflop
  potKey: string; // e.g., "pot_6.5"
  potSize: number;
  currentBet: number;
  stacks: number[]; // Stack sizes in BBs
  actionHistory: string[]; // History of actions taken
}

/**
 * Solver Tree Storage
 * Maps game state keys to solver nodes
 */
export type SolverTree = Record<string, SolverNode>;

/**
 * Generate a key for solver node lookup
 */
export function generateSolverKey(state: SolverGameState): string {
  const board = state.boardKey || "preflop";
  return `${state.street}:${state.positionKey}:${board}:${state.potKey}`;
}

/**
 * Lookup solver node from game state
 */
export function lookupSolverNode(
  state: SolverGameState,
  solverTree: SolverTree
): SolverNode | null {
  const key = generateSolverKey(state);
  return solverTree[key] || null;
}

/**
 * Sample an action from solver frequencies
 * Uses weighted randomization based on solver frequencies
 */
export function sampleAction(actions: SolverAction[]): SolverAction {
  if (actions.length === 0) {
    throw new Error("No actions available");
  }

  const r = Math.random();
  let cumulative = 0;

  for (const action of actions) {
    cumulative += action.frequency;
    if (r <= cumulative) {
      return action;
    }
  }

  // Fallback to last action (shouldn't happen if frequencies sum to 1)
  return actions[actions.length - 1];
}

/**
 * Get best EV action (deterministic mode)
 */
export function getBestEVAction(actions: SolverAction[]): SolverAction {
  if (actions.length === 0) {
    throw new Error("No actions available");
  }

  return actions.reduce((best, current) => 
    current.ev > best.ev ? current : best
  );
}

/**
 * Create a default solver node for a game state
 * This generates realistic GTO-like frequencies based on game state
 * In production, this would be replaced with actual solver data
 */
export function createDefaultSolverNode(
  state: SolverGameState,
  isInPosition: boolean
): SolverNode {
  const actions: SolverAction[] = [];

  // Determine available actions based on game state
  if (state.currentBet === 0) {
    // No bet to face - can check or bet
    actions.push(
      { type: "check", frequency: 0.6, ev: 0.0 },
      { type: "bet", size: 0.33, frequency: 0.25, ev: 0.1 },
      { type: "bet", size: 0.67, frequency: 0.15, ev: 0.15 }
    );
  } else {
    // Facing a bet - can fold, call, or raise
    const potOdds = state.currentBet / (state.potSize + state.currentBet);
    
    if (potOdds < 0.3) {
      // Good pot odds - more likely to call
      actions.push(
        { type: "fold", frequency: 0.2, ev: -state.currentBet },
        { type: "call", frequency: 0.6, ev: 0.05 },
        { type: "raise", size: 0.5, frequency: 0.2, ev: 0.1 }
      );
    } else {
      // Poor pot odds - more likely to fold
      actions.push(
        { type: "fold", frequency: 0.5, ev: -state.currentBet },
        { type: "call", frequency: 0.4, ev: -0.05 },
        { type: "raise", size: 0.67, frequency: 0.1, ev: 0.05 }
      );
    }
  }

  // Normalize frequencies to sum to 1
  const totalFreq = actions.reduce((sum, a) => sum + a.frequency, 0);
  if (totalFreq > 0) {
    actions.forEach(a => a.frequency /= totalFreq);
  }

  return {
    id: generateSolverKey(state),
    street: state.street,
    potSize: state.potSize,
    currentBet: state.currentBet,
    actions,
  };
}

/**
 * Generate position key from player positions
 */
export function generatePositionKey(
  heroPosition: Position,
  villainPosition: Position,
  numPlayers: number
): string {
  // For heads-up, use simple format
  if (numPlayers === 2) {
    return heroPosition === "SB" ? "SBvsBB" : "BBvsSB";
  }

  // For multiway, use hero vs first opponent format
  // This is simplified - full implementation would track all positions
  return `${heroPosition}vs${villainPosition}`;
}

/**
 * Generate board key from community cards
 */
export function generateBoardKey(communityCards: Card[]): string {
  if (communityCards.length === 0) return "";
  
  return communityCards
    .map(c => `${c.rank}${c.suit[0]}`)
    .join("");
}

/**
 * Generate pot key for lookup
 */
export function generatePotKey(potSize: number): string {
  // Round to nearest 0.5 for bucketing
  const rounded = Math.round(potSize * 2) / 2;
  return `pot_${rounded}`;
}

