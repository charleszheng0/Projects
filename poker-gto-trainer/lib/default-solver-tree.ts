import { SolverTree, SolverNode } from "./solver-tree";
import { createDefaultSolverNode, generatePositionKey, generateBoardKey, generatePotKey } from "./solver-tree";
import { Position } from "./gto";
import { GameStage } from "./postflop-gto";

/**
 * Create a default solver tree with realistic GTO-like frequencies
 * In production, this would be replaced with actual solver data from PioSolver, GTO+, etc.
 */
export function createDefaultSolverTree(): SolverTree {
  const tree: SolverTree = {};

  // Preflop nodes for common positions
  const preflopPositions: Position[] = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"];
  
  for (const heroPos of preflopPositions) {
    for (const villainPos of preflopPositions) {
      if (heroPos === villainPos) continue;
      
      const positionKey = generatePositionKey(heroPos, villainPos, 2);
      
      // Preflop facing BB (no raise)
      const preflopNoBetKey = `preflop:${positionKey}::pot_1.5`;
      tree[preflopNoBetKey] = createPreflopNode(heroPos, false);
      
      // Preflop facing raise
      const preflopRaiseKey = `preflop:${positionKey}::pot_4`;
      tree[preflopRaiseKey] = createPreflopNode(heroPos, true);
    }
  }

  // Postflop nodes for common scenarios
  const commonBoards = [
    "8h7d3s", // Dry board
    "Kh9d2c", // High card board
    "QhJdTc", // Connected board
    "AhKd5c", // High pair board
  ];

  for (const board of commonBoards) {
    // Parse board string (e.g., "8h7d3s") into Card objects
    const boardCards = board.match(/.{2}/g)!.map(match => ({
      rank: match[0],
      suit: match[1] === "h" ? "hearts" : match[1] === "d" ? "diamonds" : match[1] === "c" ? "clubs" : "spades",
    }));
    const boardKey = generateBoardKey(boardCards);

    for (const heroPos of ["BTN", "BB"]) {
      for (const villainPos of ["BB", "BTN"]) {
        if (heroPos === villainPos) continue;
        
        const positionKey = generatePositionKey(heroPos, villainPos, 2);
        
        // Flop - no bet
        const flopNoBetKey = `flop:${positionKey}:${board}:pot_6`;
        tree[flopNoBetKey] = createPostflopNode("flop", false, heroPos === "BTN");
        
        // Flop - facing bet
        const flopBetKey = `flop:${positionKey}:${board}:pot_10`;
        tree[flopBetKey] = createPostflopNode("flop", true, heroPos === "BTN");
        
        // Turn - no bet
        const turnNoBetKey = `turn:${positionKey}:${board}:pot_20`;
        tree[turnNoBetKey] = createPostflopNode("turn", false, heroPos === "BTN");
        
        // Turn - facing bet
        const turnBetKey = `turn:${positionKey}:${board}:pot_30`;
        tree[turnBetKey] = createPostflopNode("turn", true, heroPos === "BTN");
        
        // River - no bet
        const riverNoBetKey = `river:${positionKey}:${board}:pot_40`;
        tree[riverNoBetKey] = createPostflopNode("river", false, heroPos === "BTN");
        
        // River - facing bet
        const riverBetKey = `river:${positionKey}:${board}:pot_60`;
        tree[riverBetKey] = createPostflopNode("river", true, heroPos === "BTN");
      }
    }
  }

  return tree;
}

/**
 * Create a preflop solver node
 */
function createPreflopNode(position: Position, facingRaise: boolean): SolverNode {
  if (facingRaise) {
    // Facing a raise - tighter ranges
    return {
      id: `preflop:${position}:facing_raise`,
      street: "preflop",
      potSize: 4,
      currentBet: 3,
      actions: [
        { type: "fold", frequency: 0.7, ev: -1 },
        { type: "call", frequency: 0.2, ev: 0.1 },
        { type: "raise", size: 0.5, frequency: 0.1, ev: 0.3 },
      ],
    };
  } else {
    // No raise - can open or call
    const isLatePosition = position === "BTN" || position === "CO";
    
    if (isLatePosition) {
      return {
        id: `preflop:${position}:no_bet`,
        street: "preflop",
        potSize: 1.5,
        currentBet: 0,
        actions: [
          { type: "check", frequency: 0.3, ev: 0 },
          { type: "bet", size: 0.33, frequency: 0.4, ev: 0.15 },
          { type: "bet", size: 0.67, frequency: 0.3, ev: 0.2 },
        ],
      };
    } else {
      return {
        id: `preflop:${position}:no_bet`,
        street: "preflop",
        potSize: 1.5,
        currentBet: 0,
        actions: [
          { type: "check", frequency: 0.6, ev: 0 },
          { type: "bet", size: 0.33, frequency: 0.25, ev: 0.1 },
          { type: "bet", size: 0.67, frequency: 0.15, ev: 0.15 },
        ],
      };
    }
  }
}

/**
 * Create a postflop solver node
 */
function createPostflopNode(
  stage: GameStage,
  facingBet: boolean,
  isInPosition: boolean
): SolverNode {
  if (facingBet) {
    // Facing a bet
    return {
      id: `${stage}:facing_bet:${isInPosition ? "IP" : "OOP"}`,
      street: stage,
      potSize: stage === "flop" ? 10 : stage === "turn" ? 30 : 60,
      currentBet: stage === "flop" ? 5 : stage === "turn" ? 15 : 30,
      actions: [
        { type: "fold", frequency: 0.4, ev: -5 },
        { type: "call", frequency: 0.45, ev: 0.2 },
        { type: "raise", size: 0.5, frequency: 0.15, ev: 0.5 },
      ],
    };
  } else {
    // No bet to face - can check or bet
    if (isInPosition) {
      return {
        id: `${stage}:no_bet:IP`,
        street: stage,
        potSize: stage === "flop" ? 6 : stage === "turn" ? 20 : 40,
        currentBet: 0,
        actions: [
          { type: "check", frequency: 0.5, ev: 0 },
          { type: "bet", size: 0.33, frequency: 0.3, ev: 0.2 },
          { type: "bet", size: 0.67, frequency: 0.2, ev: 0.3 },
        ],
      };
    } else {
      return {
        id: `${stage}:no_bet:OOP`,
        street: stage,
        potSize: stage === "flop" ? 6 : stage === "turn" ? 20 : 40,
        currentBet: 0,
        actions: [
          { type: "check", frequency: 0.65, ev: 0 },
          { type: "bet", size: 0.33, frequency: 0.2, ev: 0.15 },
          { type: "bet", size: 0.67, frequency: 0.15, ev: 0.25 },
        ],
      };
    }
  }
}

