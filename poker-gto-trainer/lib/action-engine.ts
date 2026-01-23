import { Card, Hand, Position } from "./gto";
import { GameStage, BettingAction } from "./postflop-gto";
import { SolverNode, SolverAction, SolverGameState, lookupSolverNode, sampleAction, getBestEVAction, generatePositionKey, generateBoardKey, generatePotKey, SolverTree } from "./solver-tree";
import { roundBB } from "./utils";

/**
 * Player State in Game
 */
export interface PlayerState {
  seat: number;
  stack: number; // Stack size in BBs
  currentBet: number; // Current bet amount in BBs
  folded: boolean;
  isVillain: boolean; // true for opponents, false for hero
  position: Position;
  hand: Hand | null;
}

/**
 * Game State for Action Engine
 */
export interface ActionEngineGameState {
  street: GameStage;
  pot: number; // Pot size in BBs
  currentBet: number; // Highest bet to call in BBs
  players: PlayerState[];
  communityCards: Card[];
  heroSeat: number;
  nextToActIndex: number; // Index of next player to act
  actionHistory: Array<{ seat: number; action: string; betSize?: number }>;
  solverTree: SolverTree;
  deterministicMode?: boolean; // If true, use best EV action instead of sampling
}

/**
 * Apply a solver action to the game state
 * Updates pot, stacks, and player bets
 */
export function applySolverAction(
  game: ActionEngineGameState,
  player: PlayerState,
  action: SolverAction
): void {
  const toCall = game.currentBet - player.currentBet;

  switch (action.type) {
    case "check":
      if (toCall > 0) {
        throw new Error("Cannot check when facing a bet");
      }
      break;

    case "fold":
      player.folded = true;
      break;

    case "call":
      if (toCall === 0) {
        throw new Error("Cannot call nothing");
      }
      const callAmount = Math.min(toCall, player.stack);
      player.stack = Math.max(0, roundBB(player.stack - callAmount));
      player.currentBet += callAmount;
      game.pot = roundBB(game.pot + callAmount);
      break;

    case "bet":
      if (!action.size) {
        throw new Error("Bet action requires size");
      }
      const betAmount = Math.floor(game.pot * action.size);
      if (betAmount <= 0) {
        throw new Error("Invalid bet size");
      }
      if (betAmount > player.stack) {
        // All-in bet
        const allInAmount = player.stack;
        player.stack = 0;
        player.currentBet += allInAmount;
        game.currentBet = Math.max(game.currentBet, player.currentBet);
        game.pot = roundBB(game.pot + allInAmount);
      } else {
        player.stack = Math.max(0, roundBB(player.stack - betAmount));
        player.currentBet += betAmount;
        game.currentBet = player.currentBet;
        game.pot = roundBB(game.pot + betAmount);
      }
      break;

    case "raise":
      if (!action.size) {
        throw new Error("Raise action requires size");
      }
      const raiseAmount = Math.floor(game.pot * action.size);
      const totalBet = game.currentBet + raiseAmount;
      const additionalAmount = totalBet - player.currentBet;
      
      if (additionalAmount > player.stack) {
        // All-in raise
        const allInAmount = player.stack;
        player.stack = 0;
        player.currentBet += allInAmount;
        game.currentBet = Math.max(game.currentBet, player.currentBet);
        game.pot = roundBB(game.pot + allInAmount);
      } else {
        player.stack = Math.max(0, roundBB(player.stack - additionalAmount));
        player.currentBet = totalBet;
        game.currentBet = totalBet;
        game.pot = roundBB(game.pot + additionalAmount);
      }
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }

  // Record action in history
  game.actionHistory.push({
    seat: player.seat,
    action: action.type,
    betSize: action.size ? Math.floor(game.pot * action.size) : undefined,
  });
}

/**
 * Check if betting round is closed
 * A round ends when all active players have matched the highest bet or folded
 */
export function bettingRoundClosed(game: ActionEngineGameState): boolean {
  const activePlayers = game.players.filter(p => !p.folded && p.stack > 0);
  
  if (activePlayers.length <= 1) {
    return true; // Only one player left
  }

  // Check if all active players have matched the current bet
  for (const player of activePlayers) {
    if (player.currentBet !== game.currentBet) {
      return false; // Someone hasn't matched
    }
  }

  return true;
}

/**
 * Get next player to act
 * Returns the seat index of the next active player
 */
export function getNextToAct(
  game: ActionEngineGameState,
  startIndex: number
): number | null {
  const numPlayers = game.players.length;
  let currentIndex = startIndex;

  // Try each player in order
  for (let i = 0; i < numPlayers; i++) {
    currentIndex = (startIndex + i) % numPlayers;
    const player = game.players[currentIndex];

    // Skip folded players and all-in players
    if (!player.folded && player.stack > 0) {
      // Check if this player needs to act (hasn't matched the bet)
      if (player.currentBet < game.currentBet) {
        return currentIndex;
      }
    }
  }

  // All players have acted - round should be closed
  return null;
}

/**
 * Run villain actions automatically
 * Processes all villain actions until it's hero's turn or betting round closes
 * Uses flawless villain engine for perfect behavior
 */
export async function runVillainActions(
  game: ActionEngineGameState
): Promise<void> {
  // Import and use flawless villain engine
  const { runFlawlessVillainActions } = await import("./villain-engine");
  return runFlawlessVillainActions(game);
}

/**
 * Create solver game state from current game state
 */
function createSolverGameState(
  game: ActionEngineGameState,
  player: PlayerState
): SolverGameState {
  // Find opponent position (simplified - assumes heads-up or first opponent)
  const opponent = game.players.find(p => p.isVillain && !p.folded && p.seat !== player.seat);
  const opponentPosition = opponent?.position || "BB";

  const positionKey = generatePositionKey(
    player.position,
    opponentPosition,
    game.players.length
  );

  const boardKey = generateBoardKey(game.communityCards);
  const potKey = generatePotKey(game.pot);

  return {
    street: game.street,
    positionKey,
    boardKey,
    potKey,
    potSize: game.pot,
    currentBet: game.currentBet,
    stacks: game.players.map(p => p.stack),
    actionHistory: game.actionHistory.map(a => a.action),
  };
}

/**
 * Validate that an action is legal in the current game state
 */
function validateAction(
  game: ActionEngineGameState,
  player: PlayerState,
  action: SolverAction
): void {
  const toCall = game.currentBet - player.currentBet;

  switch (action.type) {
    case "check":
      if (toCall > 0) {
        throw new Error(`Cannot check when facing bet of ${toCall} BB`);
      }
      break;

    case "call":
      if (toCall === 0) {
        throw new Error("Cannot call when no bet to face");
      }
      break;

    case "bet":
      if (toCall > 0) {
        throw new Error("Cannot bet when facing a bet (must call or raise)");
      }
      if (!action.size || action.size <= 0) {
        throw new Error("Bet requires valid size");
      }
      break;

    case "raise":
      if (toCall === 0) {
        throw new Error("Cannot raise when no bet to face (must bet)");
      }
      if (!action.size || action.size <= 0) {
        throw new Error("Raise requires valid size");
      }
      break;

    case "fold":
      // Fold is always legal
      break;
  }
}

/**
 * Reset betting state for new street
 */
export function resetBettingForNewStreet(game: ActionEngineGameState): void {
  // Reset all player bets to 0
  game.players.forEach(player => {
    player.currentBet = 0;
  });
  
  // Reset current bet
  game.currentBet = 0;
  
  // Determine who acts first on new street
  // In position acts first postflop (simplified - assumes hero is in position)
  const hero = game.players[game.heroSeat];
  const isHeroInPosition = hero.position === "BTN" || hero.position === "CO";
  
  if (isHeroInPosition) {
    game.nextToActIndex = game.heroSeat;
  } else {
    // Find first opponent to act
    const opponent = game.players.find(p => p.isVillain && !p.folded);
    game.nextToActIndex = opponent?.seat ?? game.heroSeat;
  }
}

