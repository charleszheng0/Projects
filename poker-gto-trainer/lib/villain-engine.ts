import { Card, Hand, Position } from "./gto";
import { GameStage } from "./postflop-gto";
import { SolverNode, SolverAction, SolverGameState, lookupSolverNode, sampleAction, getBestEVAction, generatePositionKey, generateBoardKey, generatePotKey, createDefaultSolverNode, SolverTree } from "./solver-tree";
import { ActionEngineGameState, PlayerState, bettingRoundClosed, getNextToAct, applyAction } from "./action-engine";
import { roundBB } from "./utils";

/**
 * Filter solver actions to only include those legal in current game state
 * CRITICAL: This ensures villains never use illegal actions
 */
export function filterLegalActions(
  actions: SolverAction[],
  game: ActionEngineGameState,
  player: PlayerState
): SolverAction[] {
  const toCall = game.currentBet - player.currentBet;
  const legalActions: SolverAction[] = [];
  
  for (const action of actions) {
    let isLegal = false;
    
    switch (action.type) {
      case "check":
        // Can only check if no bet to face
        isLegal = toCall === 0;
        break;
        
      case "fold":
        // Fold is always legal
        isLegal = true;
        break;
        
      case "call":
        // Can only call if facing a bet
        isLegal = toCall > 0;
        break;
        
      case "bet":
        // Can only bet if no bet to face
        if (toCall === 0 && action.size) {
          // Validate bet size is reasonable and player has enough chips
          const betAmount = Math.floor(game.pot * action.size);
          isLegal = betAmount > 0 && betAmount <= player.stack;
        }
        break;
        
      case "raise":
        // Can only raise if facing a bet
        if (toCall > 0 && action.size) {
          // Validate raise meets minimum raise requirement
          const raiseAmount = Math.floor(game.pot * action.size);
          const totalBet = game.currentBet + raiseAmount;
          const minRaise = game.currentBet + game.lastRaiseIncrement; // Minimum raise to
          
          // Raise must be at least min-raise, and player must have enough chips
          const additionalNeeded = totalBet - player.currentBet;
          isLegal = totalBet >= minRaise && additionalNeeded <= player.stack;
        }
        break;
    }
    
    if (isLegal) {
      legalActions.push(action);
    }
  }
  
  // If no legal actions found, create fallback actions based on game state
  if (legalActions.length === 0) {
    if (toCall > 0) {
      // Must call or fold if facing a bet
      legalActions.push(
        { type: "fold", frequency: 0.5, ev: -toCall },
        { type: "call", frequency: 0.5, ev: 0 }
      );
    } else {
      // Can check or bet
      legalActions.push(
        { type: "check", frequency: 0.7, ev: 0 },
        { type: "bet", size: 0.5, frequency: 0.3, ev: 0.1 }
      );
    }
  }
  
  // Normalize frequencies to sum to 1
  const totalFreq = legalActions.reduce((sum, a) => sum + a.frequency, 0);
  if (totalFreq > 0) {
    legalActions.forEach(a => a.frequency /= totalFreq);
  }
  
  return legalActions;
}

/**
 * Get solver node with fallback and action filtering
 * CRITICAL: Ensures we always have valid actions, never throw errors
 */
export function getSolverNodeForVillain(
  game: ActionEngineGameState,
  player: PlayerState,
  solverTree: SolverTree
): { node: SolverNode; actions: SolverAction[] } {
  // Create solver game state
  const solverState = createSolverGameState(game, player);
  
  // Try to lookup solver node
  let solverNode = lookupSolverNode(solverState, solverTree);
  
  // If no node found, create default
  if (!solverNode) {
    const isInPosition = player.position === "BTN" || player.position === "CO";
    solverNode = createDefaultSolverNode(solverState, isInPosition);
  }
  
  // Filter actions to only legal ones
  const legalActions = filterLegalActions(solverNode.actions, game, player);
  
  // CRITICAL: If filtering removed all actions, create emergency fallback
  if (legalActions.length === 0) {
    const toCall = game.currentBet - player.currentBet;
    if (toCall > 0) {
      legalActions.push({ type: "call", frequency: 1.0, ev: 0 });
    } else {
      legalActions.push({ type: "check", frequency: 1.0, ev: 0 });
    }
  }
  
  return { node: solverNode, actions: legalActions };
}

/**
 * Validate and apply min-raise rules
 * CRITICAL: Ensures raises meet poker rules
 */
export function validateRaiseSize(
  action: SolverAction,
  game: ActionEngineGameState,
  player: PlayerState
): SolverAction {
  if (action.type !== "raise" || !action.size) {
    return action;
  }
  
  const toCall = game.currentBet - player.currentBet;
  if (toCall === 0) {
    // Not facing a bet, convert to bet
    return { ...action, type: "bet" };
  }
  
  const raiseAmount = Math.floor(game.pot * action.size);
  const totalBet = game.currentBet + raiseAmount;
  const minRaise = game.currentBet + game.lastRaiseIncrement; // Minimum raise total
  
  // If raise doesn't meet minimum, adjust to minimum
  if (totalBet < minRaise) {
    const adjustedRaise = minRaise - game.currentBet;
    const adjustedSize = adjustedRaise / game.pot;
    return { ...action, size: adjustedSize };
  }
  
  // Check if player can afford it
  const additionalNeeded = totalBet - player.currentBet;
  if (additionalNeeded > player.stack) {
    // All-in raise
    const allInSize = (player.stack + player.currentBet) / game.pot;
    return { ...action, size: allInSize };
  }
  
  return action;
}

/**
 * Apply solver action with perfect pot/stack tracking
 * CRITICAL: Ensures mathematical accuracy
 */
export function applyVillainAction(
  game: ActionEngineGameState,
  player: PlayerState,
  action: SolverAction
): void {
  const validatedAction = action.type === "raise"
    ? validateRaiseSize(action, game, player)
    : action;

  if (validatedAction.type === "bet" && validatedAction.size) {
    const betAmount = Math.floor(game.pot * validatedAction.size);
    applyAction(game, player.seat, "bet", betAmount);
    return;
  }
  if (validatedAction.type === "raise" && validatedAction.size) {
    const raiseAmount = Math.floor(game.pot * validatedAction.size);
    const totalBet = game.currentBet + raiseAmount;
    applyAction(game, player.seat, "raise", totalBet);
    return;
  }
  applyAction(game, player.seat, validatedAction.type);
}

/**
 * Create solver game state with full context
 */
function createSolverGameState(
  game: ActionEngineGameState,
  player: PlayerState
): SolverGameState {
  // Find opponent (for position key)
  const opponent = game.players.find(p => !p.isVillain && !p.folded && p.seat !== player.seat);
  const opponentPosition = opponent?.position || (player.position === "SB" ? "BB" : "SB");
  
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
 * Run villain actions with flawless behavior
 * CRITICAL: Ensures villains never skip actions, always respond properly
 * Handles proper turn order, multiple villains, and all edge cases
 */
export async function runFlawlessVillainActions(
  game: ActionEngineGameState
): Promise<void> {
  let actingIndex = game.nextToActIndex;
  let iterations = 0;
  const maxIterations = game.players.length * 20; // Safety limit (allows for multiple betting rounds)
  const startIndex = actingIndex; // Track where we started
  
  while (iterations < maxIterations) {
    iterations++;
    
    // CRITICAL: Check if betting round is closed FIRST
    if (bettingRoundClosed(game)) {
      break;
    }
    
    const player = game.players[actingIndex];
    
    // CRITICAL: Skip folded or all-in players, but continue to next player
    if (player.folded || player.stack === 0) {
      actingIndex = (actingIndex + 1) % game.players.length;
      // If we've wrapped around completely, round should be closed
      if (actingIndex === startIndex) {
        // Double-check round is actually closed
        if (bettingRoundClosed(game)) {
          break;
        } else {
          console.error("Wrapped around but round not closed - possible bug");
          break;
        }
      }
      continue;
    }
    
    // CRITICAL: Stop if it's hero's turn - hero must act
    if (!player.isVillain) {
      game.nextToActIndex = actingIndex;
      break;
    }
    
    // CRITICAL: Check if this villain needs to act (hasn't matched the bet)
    const toCall = game.currentBet - player.currentBet;
    if (toCall === 0 && player.currentBet === game.currentBet && player.hasActedThisStreet) {
      // Villain has already matched the bet - move to next player
      const nextIndex = getNextToAct(game, (actingIndex + 1) % game.players.length);
      if (nextIndex === null) {
        // No one else needs to act - round closed
        break;
      }
      if (nextIndex === game.heroSeat) {
        game.nextToActIndex = nextIndex;
        break;
      }
      actingIndex = nextIndex;
      continue;
    }
    
    // CRITICAL: Get solver node with legal actions only
    const { node: solverNode, actions: legalActions } = getSolverNodeForVillain(
      game,
      player,
      game.solverTree
    );
    
    // CRITICAL: Ensure we have actions (should never be empty due to fallback)
    if (legalActions.length === 0) {
      console.error("No legal actions found for villain - using emergency fallback");
      // Emergency fallback - MUST respond to bet if facing one
      const toCall = game.currentBet - player.currentBet;
      if (toCall > 0) {
        // Must call or fold when facing a bet
        const emergencyAction: SolverAction = { type: "call", frequency: 1.0, ev: 0 };
        applyVillainAction(game, player, emergencyAction);
      } else {
        // Can check or bet
        const emergencyAction: SolverAction = { type: "check", frequency: 1.0, ev: 0 };
        applyVillainAction(game, player, emergencyAction);
      }
    } else {
      // Choose action based on mode
      const chosenAction = game.deterministicMode
        ? getBestEVAction(legalActions)
        : sampleAction(legalActions);
      
      // Apply the action
      applyVillainAction(game, player, chosenAction);
    }
    
    // CRITICAL: Check if round closed after this action
    if (bettingRoundClosed(game)) {
      break;
    }
    
    // CRITICAL: Move to next player who needs to act
    const nextIndex = getNextToAct(game, (actingIndex + 1) % game.players.length);
    if (nextIndex === null) {
      // No one else needs to act - round should be closed
      if (!bettingRoundClosed(game)) {
        console.error("No next player but round not closed - possible bug");
      }
      break;
    }
    
    if (nextIndex === game.heroSeat) {
      // Hero's turn - stop here
      game.nextToActIndex = nextIndex;
      break;
    }
    
    actingIndex = nextIndex;
  }
  
  if (iterations >= maxIterations) {
    console.error("Villain action loop exceeded max iterations - possible infinite loop");
    // Force stop - set next to act to hero if round not closed
    if (!bettingRoundClosed(game)) {
      game.nextToActIndex = game.heroSeat;
    }
  } else {
    game.nextToActIndex = actingIndex;
  }
}

