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
  currentBet: number; // Committed this street in BBs
  committedTotal: number; // Total committed this hand in BBs
  hasActedThisStreet: boolean;
  isAllIn: boolean;
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
  lastRaiseIncrement: number; // Minimum raise increment in BBs
  bigBlind: number;
  smallBlind: number;
}

export type PokerActionType = "check" | "fold" | "call" | "bet" | "raise";

function sumCommittedTotal(players: PlayerState[]): number {
  return roundBB(players.reduce((sum, p) => sum + p.committedTotal, 0));
}

function assertGameIntegrity(game: ActionEngineGameState): void {
  const committedSum = sumCommittedTotal(game.players);
  if (Math.abs(game.pot - committedSum) > 0.01) {
    throw new Error(`Pot mismatch: expected ${committedSum}, got ${game.pot}`);
  }
  const highestCommit = Math.max(...game.players.map(p => p.currentBet));
  if (Math.abs(game.currentBet - highestCommit) > 0.01) {
    throw new Error(`Current bet mismatch: expected ${highestCommit}, got ${game.currentBet}`);
  }
  if (game.street === "preflop") {
    const minPot = roundBB(game.smallBlind + game.bigBlind);
    if (game.pot < minPot - 0.01) {
      throw new Error(`Preflop pot below blinds: ${game.pot} < ${minPot}`);
    }
  }
}

function validateActionTurn(game: ActionEngineGameState, seat: number): void {
  if (game.nextToActIndex !== seat) {
    throw new Error(`Action out of turn: seat ${seat} cannot act`);
  }
  const lastAction = game.actionHistory[game.actionHistory.length - 1];
  if (lastAction && lastAction.seat === seat) {
    throw new Error(`Illegal consecutive action by seat ${seat}`);
  }
}

function validateActionLegality(
  game: ActionEngineGameState,
  player: PlayerState,
  action: PokerActionType,
  amount?: number
): void {
  const toCall = Math.max(0, game.currentBet - player.currentBet);
  if (player.folded || player.isAllIn) {
    throw new Error("Inactive player cannot act");
  }

  if (action === "check") {
    if (toCall > 0) {
      throw new Error(`Cannot check when facing ${toCall} BB`);
    }
    return;
  }
  if (action === "fold") {
    if (toCall === 0 && game.street !== "preflop") {
      throw new Error("Cannot fold when you can check");
    }
    return;
  }
  if (action === "call") {
    if (toCall === 0) {
      throw new Error("Cannot call when no bet to face");
    }
    return;
  }
  if (action === "bet") {
    if (toCall > 0) {
      throw new Error("Cannot bet when facing a bet");
    }
    if (!amount || amount <= 0) {
      throw new Error("Bet requires a valid amount");
    }
    if (amount < game.bigBlind) {
      throw new Error(`Bet must be at least ${game.bigBlind} BB`);
    }
    return;
  }
  if (action === "raise") {
    if (toCall === 0 && game.street !== "preflop") {
      throw new Error("Cannot raise when no bet to face");
    }
    if (!amount || amount <= game.currentBet) {
      throw new Error("Raise requires a valid total bet amount");
    }
    const raiseIncrement = amount - game.currentBet;
    if (raiseIncrement < game.lastRaiseIncrement && amount < player.currentBet + player.stack) {
      throw new Error(`Raise must be at least ${game.currentBet + game.lastRaiseIncrement} BB`);
    }
  }
}

export function applyAction(
  game: ActionEngineGameState,
  seat: number,
  action: PokerActionType,
  amount?: number
): void {
  assertGameIntegrity(game);
  if (bettingRoundClosed(game)) {
    throw new Error("Cannot act after betting round completion");
  }
  validateActionTurn(game, seat);
  const player = game.players[seat];
  validateActionLegality(game, player, action, amount);

  const toCall = Math.max(0, game.currentBet - player.currentBet);
  const stackBefore = player.stack;

  switch (action) {
    case "check":
      player.hasActedThisStreet = true;
      break;
    case "fold":
      player.folded = true;
      player.hasActedThisStreet = true;
      break;
    case "call": {
      const callAmount = Math.min(toCall, player.stack);
      player.stack = roundBB(player.stack - callAmount);
      player.currentBet = roundBB(player.currentBet + callAmount);
      player.committedTotal = roundBB(player.committedTotal + callAmount);
      player.hasActedThisStreet = true;
      if (player.stack === 0) {
        player.isAllIn = true;
      }
      break;
    }
    case "bet": {
      const betAmount = Math.min(amount || 0, player.stack);
      player.stack = roundBB(player.stack - betAmount);
      player.currentBet = roundBB(player.currentBet + betAmount);
      player.committedTotal = roundBB(player.committedTotal + betAmount);
      player.hasActedThisStreet = true;
      game.currentBet = player.currentBet;
      game.lastRaiseIncrement = betAmount;
      if (player.stack === 0) {
        player.isAllIn = true;
      }
      break;
    }
    case "raise": {
      const totalBet = Math.min(amount || 0, player.currentBet + player.stack);
      const additional = roundBB(totalBet - player.currentBet);
      player.stack = roundBB(player.stack - additional);
      player.currentBet = totalBet;
      player.committedTotal = roundBB(player.committedTotal + additional);
      player.hasActedThisStreet = true;
      const raiseIncrement = totalBet - game.currentBet;
      game.currentBet = totalBet;
      if (raiseIncrement > 0) {
        game.lastRaiseIncrement = raiseIncrement;
      }
      if (player.stack === 0) {
        player.isAllIn = true;
      }
      break;
    }
  }

  game.pot = sumCommittedTotal(game.players);

  game.actionHistory.push({
    seat: player.seat,
    action,
    betSize: action === "bet" || action === "raise" ? amount : undefined,
  });

  assertGameIntegrity(game);

  const nextIndex = getNextToAct(game, (seat + 1) % game.players.length);
  if (nextIndex !== null) {
    game.nextToActIndex = nextIndex;
  }

  if (player.stack > stackBefore) {
    throw new Error("Stack increased after action");
  }
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
  const seat = player.seat;
  if (action.type === "bet" && action.size) {
    const betAmount = Math.floor(game.pot * action.size);
    applyAction(game, seat, "bet", betAmount);
    return;
  }
  if (action.type === "raise" && action.size) {
    const raiseAmount = Math.floor(game.pot * action.size);
    const totalBet = game.currentBet + raiseAmount;
    applyAction(game, seat, "raise", totalBet);
    return;
  }
  applyAction(game, seat, action.type);
}

/**
 * Check if betting round is closed
 * A round ends when all active players have matched the highest bet or folded
 */
export function bettingRoundClosed(game: ActionEngineGameState): boolean {
  const activePlayers = game.players.filter(p => !p.folded);
  
  if (activePlayers.length <= 1) {
    return true; // Only one player left
  }

  return activePlayers.every(player => {
    if (player.isAllIn) {
      return true;
    }
    if (!player.hasActedThisStreet) {
      return false;
    }
    return Math.abs(player.currentBet - game.currentBet) < 0.01;
  });
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

    // Skip folded/all-in players
    if (player.folded || player.isAllIn) continue;

    const needsToAct = !player.hasActedThisStreet || player.currentBet < game.currentBet;
    if (needsToAct) {
      return currentIndex;
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
    player.hasActedThisStreet = false;
  });
  
  // Reset current bet
  game.currentBet = 0;
  game.lastRaiseIncrement = game.bigBlind;
  
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

