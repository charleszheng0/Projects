import { Hand, Position, Card } from "./gto";
import { GameStage, BettingAction } from "./postflop-gto";
import { SolverNode, SolverAction, SolverTree, lookupSolverNode, generatePositionKey, generateBoardKey, generatePotKey } from "./solver-tree";
import { evaluateHandStrength } from "./postflop-gto";

/**
 * Analysis data for sidebar display
 */
export interface SidebarAnalysis {
  // Solver node data
  solverNode: SolverNode | null;
  
  // Action frequencies from solver
  actionFrequencies: Array<{
    action: string;
    betSize?: number;
    frequency: number;
    ev: number;
  }>;
  
  // Best EV action
  bestEVAction: SolverAction | null;
  
  // Pot information
  potBefore: number;
  potAfter: number;
  potChange: number;
  
  // Combination breakdowns (if available)
  combinationBreakdown: Record<string, Record<string, number>> | null; // hand -> action -> frequency
  
  // Board texture analysis
  boardTexture: {
    rangeAdvantage: "hero" | "villain" | "neutral";
    nutAdvantage: "hero" | "villain" | "neutral";
    wetness: "dry" | "wet" | "very-wet";
    connectivity: "low" | "medium" | "high";
  } | null;
  
  // Range comparison
  rangeComparison: {
    heroRange: Record<string, number>; // hand -> frequency
    villainRange: Record<string, number>; // hand -> frequency
  } | null;
}

/**
 * Get current solver node for analysis
 */
export function getCurrentSolverNode(
  street: GameStage,
  heroPosition: Position,
  villainPosition: Position,
  communityCards: Card[],
  potSize: number,
  currentBet: number,
  numPlayers: number,
  solverTree: SolverTree
): SolverNode | null {
  const positionKey = generatePositionKey(heroPosition, villainPosition, numPlayers);
  const boardKey = generateBoardKey(communityCards);
  const potKey = generatePotKey(potSize);
  
  const solverState = {
    street,
    positionKey,
    boardKey,
    potKey,
    potSize,
    currentBet,
    stacks: [],
    actionHistory: [],
  };
  
  return lookupSolverNode(solverState, solverTree);
}

/**
 * Extract action frequencies from solver node
 */
export function extractActionFrequencies(node: SolverNode | null): Array<{
  action: string;
  betSize?: number;
  frequency: number;
  ev: number;
}> {
  if (!node) return [];
  
  return node.actions.map(action => ({
    action: action.type,
    betSize: action.size,
    frequency: action.frequency * 100, // Convert to percentage
    ev: action.ev,
  }));
}

/**
 * Get best EV action from solver node
 */
export function getBestEVAction(node: SolverNode | null): SolverAction | null {
  if (!node || node.actions.length === 0) return null;
  
  return node.actions.reduce((best, current) => 
    current.ev > best.ev ? current : best
  );
}

/**
 * Analyze board texture
 */
export function analyzeBoardTexture(
  communityCards: Card[],
  heroHand: Hand | null,
  villainHand: Hand | null
): {
  rangeAdvantage: "hero" | "villain" | "neutral";
  nutAdvantage: "hero" | "villain" | "neutral";
  wetness: "dry" | "wet" | "very-wet";
  connectivity: "low" | "medium" | "high";
} {
  if (communityCards.length === 0) {
    return {
      rangeAdvantage: "neutral",
      nutAdvantage: "neutral",
      wetness: "dry",
      connectivity: "low",
    };
  }
  
  // Analyze wetness (draw potential)
  const ranks = communityCards.map(c => c.rank);
  const suits = communityCards.map(c => c.suit);
  const uniqueRanks = new Set(ranks).size;
  const uniqueSuits = new Set(suits).size;
  
  let wetness: "dry" | "wet" | "very-wet" = "dry";
  if (communityCards.length >= 3) {
    // Check for flush draws
    const suitCounts: Record<string, number> = {};
    suits.forEach(suit => {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    });
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    
    // Check for straight draws
    const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
    const rankIndices = ranks.map(r => rankOrder.indexOf(r)).sort((a, b) => a - b);
    let hasStraightDraw = false;
    for (let i = 0; i < rankIndices.length - 1; i++) {
      if (rankIndices[i + 1] - rankIndices[i] <= 2) {
        hasStraightDraw = true;
        break;
      }
    }
    
    if (maxSuitCount >= 3 || hasStraightDraw) {
      wetness = maxSuitCount >= 4 ? "very-wet" : "wet";
    }
  }
  
  // Analyze connectivity (how connected the board is)
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rankIndices = ranks.map(r => rankOrder.indexOf(r)).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 0; i < rankIndices.length - 1; i++) {
    gaps.push(rankIndices[i + 1] - rankIndices[i]);
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  
  let connectivity: "low" | "medium" | "high" = "low";
  if (avgGap <= 2) connectivity = "high";
  else if (avgGap <= 3.5) connectivity = "medium";
  
  // Analyze range and nut advantage (simplified - would need full range analysis)
  const heroStrength = heroHand ? evaluateHandStrength(heroHand, communityCards, "flop") : 0;
  const villainStrength = villainHand ? evaluateHandStrength(villainHand, communityCards, "flop") : 0;
  
  const rangeAdvantage: "hero" | "villain" | "neutral" = 
    heroStrength > villainStrength + 0.1 ? "hero" :
    villainStrength > heroStrength + 0.1 ? "villain" : "neutral";
  
  const nutAdvantage: "hero" | "villain" | "neutral" = 
    heroStrength > 0.8 ? "hero" :
    villainStrength > 0.8 ? "villain" : "neutral";
  
  return {
    rangeAdvantage,
    nutAdvantage,
    wetness,
    connectivity,
  };
}

/**
 * Generate comprehensive sidebar analysis
 */
export function generateSidebarAnalysis(
  street: GameStage,
  heroPosition: Position,
  villainPosition: Position,
  communityCards: Card[],
  potSize: number,
  potBefore: number,
  currentBet: number,
  heroHand: Hand | null,
  villainHand: Hand | null,
  numPlayers: number,
  solverTree: SolverTree
): SidebarAnalysis {
  // Get solver node
  const solverNode = getCurrentSolverNode(
    street,
    heroPosition,
    villainPosition,
    communityCards,
    potSize,
    currentBet,
    numPlayers,
    solverTree
  );
  
  // Extract frequencies
  const actionFrequencies = extractActionFrequencies(solverNode);
  
  // Get best EV action
  const bestEVAction = getBestEVAction(solverNode);
  
  // Calculate pot changes
  const potAfter = potSize;
  const potChange = potAfter - potBefore;
  
  // Get combination breakdown if available
  const combinationBreakdown = solverNode?.handFrequencies || null;
  
  // Analyze board texture
  const boardTexture = analyzeBoardTexture(communityCards, heroHand, villainHand);
  
  // Range comparison (simplified - would need full range calculation)
  const rangeComparison = {
    heroRange: {} as Record<string, number>,
    villainRange: {} as Record<string, number>,
  };
  
  return {
    solverNode,
    actionFrequencies,
    bestEVAction,
    potBefore,
    potAfter,
    potChange,
    combinationBreakdown,
    boardTexture,
    rangeComparison,
  };
}

