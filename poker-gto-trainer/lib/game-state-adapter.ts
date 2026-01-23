import { Card, Hand, Position, getPositionFromSeat } from "./gto";
import { GameStage } from "./postflop-gto";
import { ActionEngineGameState, PlayerState, resetBettingForNewStreet } from "./action-engine";
import { SolverTree } from "./solver-tree";
import { useGameStore } from "@/store/game-store";

/**
 * Convert Zustand game store state to ActionEngineGameState
 */
export function convertToActionEngineState(): ActionEngineGameState {
  const state = useGameStore.getState();
  
  // Convert players array
  const players: PlayerState[] = [];
  for (let seat = 0; seat < state.numPlayers; seat++) {
    const isHero = seat === state.playerSeat;
    const position = isHero 
      ? state.playerPosition 
      : getPositionFromSeat(seat, state.numPlayers);
    
    players.push({
      seat,
      stack: state.playerStacksBB[seat] || 0,
      currentBet: state.playerBetsBB[seat] || 0,
      folded: state.foldedPlayers[seat] || false,
      isVillain: !isHero,
      position,
      hand: isHero ? state.playerHand : state.opponentHands[seat] || null,
    });
  }

  // Determine next to act
  let nextToActIndex = state.playerSeat;
  if (!state.isPlayerTurn) {
    // Find first opponent who needs to act
    const opponent = players.find(p => p.isVillain && !p.folded && p.stack > 0);
    nextToActIndex = opponent?.seat ?? state.playerSeat;
  }

  return {
    street: state.gameStage,
    pot: state.pot,
    currentBet: state.currentBet,
    players,
    communityCards: state.communityCards,
    heroSeat: state.playerSeat,
    nextToActIndex,
    actionHistory: state.actionHistory.map(a => ({
      seat: a.seat ?? state.playerSeat,
      action: a.action,
      betSize: a.betSize,
    })),
    solverTree: state.solverTree,
  };
}

/**
 * Apply ActionEngineGameState changes back to Zustand store
 */
export function applyActionEngineStateToStore(
  engineState: ActionEngineGameState
): void {
  const state = useGameStore.getState();
  
  // Update stacks and bets
  const playerStacksBB = [...state.playerStacksBB];
  const playerBetsBB = [...state.playerBetsBB];
  const foldedPlayers = [...state.foldedPlayers];

  engineState.players.forEach(player => {
    playerStacksBB[player.seat] = player.stack;
    playerBetsBB[player.seat] = player.currentBet;
    foldedPlayers[player.seat] = player.folded;
  });

  // Determine if it's player's turn
  const isPlayerTurn = engineState.nextToActIndex === state.playerSeat;
  
  // Update store
  useGameStore.setState({
    pot: engineState.pot,
    currentBet: engineState.currentBet,
    playerStacksBB,
    playerBetsBB,
    foldedPlayers,
    actionHistory: engineState.actionHistory.map(a => ({
      player: a.seat === state.playerSeat ? "You" : `Player ${a.seat + 1}`,
      action: a.action,
      betSize: a.betSize,
      seat: a.seat,
    })),
    isPlayerTurn,
    // CRITICAL: Reset feedback state when it becomes player's turn
    // This ensures action buttons are enabled after Continue button is clicked
    ...(isPlayerTurn ? {
      isCorrect: null,
      lastAction: null,
      feedback: null,
      evLoss: 0,
    } : {}),
  });
}


