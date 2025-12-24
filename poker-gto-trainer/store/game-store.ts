import { create } from "zustand";
import { Hand, Action, Position, generateRandomHand, getGTOAction, getPositionFromSeat, Card } from "@/lib/gto";
import { getGTOExplanation, GTOExplanation } from "@/lib/gto-explanations";
import { analyzeBetSize, BetSizeAnalysis } from "@/lib/bet-sizing";
import { analyzePostFlopBetSize, PostFlopBetSizeAnalysis } from "@/lib/postflop-bet-sizing";
import { GameStage, BettingAction, PostFlopAction, getPostFlopGTOAction, generateCommunityCards, simulateOpponentAction, evaluateHandStrength } from "@/lib/postflop-gto";
import { getIsPlayerFirst } from "@/lib/action-order";
import { getPostFlopExplanation, PostFlopExplanation } from "@/lib/postflop-explanations";

type GameState = {
  // Hand state
  playerHand: Hand | null;
  numPlayers: number;
  isRandomPlayers: boolean;
  playerPosition: Position;
  playerSeat: number;
  
  // Game state
  gameStage: GameStage;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  bigBlind: number;
  playerStackBB: number;
  playerStacksBB: number[]; // All player stacks in BBs
  playerBetsBB: number[]; // Current bets for each player in BBs
  smallBlindSeat: number | null; // Seat number of small blind
  bigBlindSeat: number | null; // Seat number of big blind
  buttonSeat: number | null; // Seat number of button
  actionToFace: BettingAction | null; // What action the player needs to respond to
  isPlayerTurn: boolean; // Whether it's the player's turn to act
  activePlayers: number; // Number of players still in the hand
  
  // Action state
  lastAction: Action | null;
  feedback: string | null;
  isCorrect: boolean | null;
  optimalActions: Action[];
  explanation: GTOExplanation | null;
  postFlopExplanation: PostFlopExplanation | null;
  showFeedbackModal: boolean;
  showBetSizingModal: boolean;
  pendingAction: Action | null;
  betSizeBB: number | null;
  betSizeAnalysis: BetSizeAnalysis | null;
  postFlopBetSizeAnalysis: PostFlopBetSizeAnalysis | null;
  
  // Actions
  setNumPlayers: (count: number) => void;
  setRandomPlayers: (random: boolean) => void;
  dealNewHand: () => void;
  selectAction: (action: Action | BettingAction) => void;
  confirmBetSize: (betSizeBB: number) => void;
  cancelBetSize: () => void;
  takeAction: (action: Action | BettingAction, betSizeBB?: number) => void;
  processOpponentActions: () => void;
  advanceToNextStreet: () => void;
  closeFeedbackModal: () => void;
  resetGame: () => void;
};

const INITIAL_BIG_BLIND = 2;
const INITIAL_POT = 0;
const INITIAL_BET = 0;

// Generate random stack sizes in BBs (between 20 and 200 BBs)
function generateRandomStacks(numPlayers: number): number[] {
  return Array.from({ length: numPlayers }, () => 
    Math.floor(Math.random() * 180) + 20 // 20-200 BBs
  );
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  playerHand: null,
  numPlayers: 6,
  isRandomPlayers: false,
  playerPosition: "UTG",
  playerSeat: 0,
  gameStage: "preflop",
  communityCards: [],
  pot: INITIAL_POT,
  currentBet: INITIAL_BET,
  bigBlind: INITIAL_BIG_BLIND,
  playerStackBB: 100,
  playerStacksBB: [],
  playerBetsBB: [],
  smallBlindSeat: null,
  bigBlindSeat: null,
  buttonSeat: null,
  actionToFace: null,
  isPlayerTurn: true,
  activePlayers: 0,
  lastAction: null,
  feedback: null,
  isCorrect: null,
  optimalActions: [],
  explanation: null,
  postFlopExplanation: null,
  showFeedbackModal: false,
  showBetSizingModal: false,
  pendingAction: null,
  betSizeBB: null,
  betSizeAnalysis: null,
  postFlopBetSizeAnalysis: null,

  // Set number of players
  setNumPlayers: (count: number) => {
    if (count >= 2 && count <= 9) {
      set({ numPlayers: count, isRandomPlayers: false });
    }
  },

  // Set random players mode
  setRandomPlayers: (random: boolean) => {
    set({ isRandomPlayers: random });
  },

  // Deal a new hand
  dealNewHand: () => {
    const state = useGameStore.getState();
    // Use random player count if random mode is enabled, otherwise use selected count
    const numPlayers = state.isRandomPlayers 
      ? Math.floor(Math.random() * 8) + 2 // 2-9 players
      : state.numPlayers;
    const playerSeat = Math.floor(Math.random() * numPlayers);
    const playerPosition = getPositionFromSeat(playerSeat, numPlayers);
    const playerHand = generateRandomHand();
    const playerStacksBB = generateRandomStacks(numPlayers);
    
    // Determine button, small blind, and big blind seats
    // Button is always the last seat (seat numPlayers - 1)
    // Small blind is seat 0 (or button - 1 if button is not last)
    // Big blind is seat 1 (or button if heads-up)
    const buttonSeat = numPlayers - 1;
    const smallBlindSeat = numPlayers === 2 ? buttonSeat : 0;
    const bigBlindSeat = numPlayers === 2 ? (buttonSeat === 0 ? 1 : 0) : 1;
    
    // Initialize player bets (blinds are posted)
    const playerBetsBB = Array(numPlayers).fill(0);
    playerBetsBB[smallBlindSeat] = 0.5; // Small blind
    playerBetsBB[bigBlindSeat] = 1; // Big blind
    
    // Calculate initial pot (blinds)
    const initialPot = 1.5; // SB + BB
    
    // Simulate preflop actions before player's turn
    // Action order: UTG -> UTG+1 -> MP -> CO -> BTN -> SB -> BB
    // We need to simulate actions from players who act before the player
    let finalBets = [...playerBetsBB];
    let finalPot = initialPot;
    let finalCurrentBet = INITIAL_BIG_BLIND;
    let finalActionToFace: BettingAction | null = null;
    
    // Map seats to positions to determine action order
    // Create a mapping of seat -> position
    const seatToPosition: Map<number, Position> = new Map();
    for (let seat = 0; seat < numPlayers; seat++) {
      seatToPosition.set(seat, getPositionFromSeat(seat, numPlayers));
    }
    
    // Determine action order based on position
    const positionOrder: Position[] = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"];
    const playerPositionIndex = positionOrder.indexOf(playerPosition);
    
    // Simulate actions from players who act before the player
    for (let i = 0; i < playerPositionIndex; i++) {
      const actingPosition = positionOrder[i];
      
      // Find the seat with this position
      let actingSeat: number | null = null;
      for (const [seat, pos] of seatToPosition.entries()) {
        if (pos === actingPosition) {
          actingSeat = seat;
          break;
        }
      }
      
      if (actingSeat === null || actingSeat === playerSeat) continue;
      
      // Simulate opponent action (30% chance to raise, 40% chance to call, 30% chance to fold)
      const actionRoll = Math.random();
      const previousBet = finalBets[actingSeat] || 0;
      
      if (actionRoll < 0.3 && actingSeat !== smallBlindSeat && actingSeat !== bigBlindSeat) {
        // Opponent raises (2.5x to 4x BB)
        const raiseSize = Math.round(INITIAL_BIG_BLIND * (2.5 + Math.random() * 1.5) * 10) / 10;
        finalBets[actingSeat] = raiseSize;
        finalCurrentBet = raiseSize;
        // Add the additional amount to pot (raiseSize - previousBet)
        finalPot += raiseSize - previousBet;
        finalActionToFace = "call";
      } else if (actionRoll < 0.7) {
        // Opponent calls
        const callAmount = finalCurrentBet;
        const previousBetAmount = previousBet;
        finalBets[actingSeat] = callAmount;
        // Add the additional amount to pot (callAmount - previousBetAmount)
        finalPot += callAmount - previousBetAmount;
        if (!finalActionToFace && callAmount > INITIAL_BIG_BLIND) {
          finalActionToFace = "call";
        }
      } else {
        // Opponent folds - keep their blind if they're SB/BB, otherwise remove bet
        if (actingSeat !== smallBlindSeat && actingSeat !== bigBlindSeat) {
          // Non-blind player folds - their bet stays in pot (already counted)
          finalBets[actingSeat] = 0;
        }
        // If SB/BB folds, their blind stays in pot
      }
    }
    
    // Determine if player needs to call
    const needsToCallBB = playerSeat !== smallBlindSeat && playerSeat !== bigBlindSeat;
    if (!finalActionToFace && needsToCallBB) {
      finalActionToFace = finalCurrentBet > INITIAL_BIG_BLIND ? "call" : "call";
    }

    set({
      playerHand,
      numPlayers: numPlayers, // Update with actual player count used
      playerSeat,
      playerPosition,
      gameStage: "preflop",
      communityCards: [],
      pot: finalPot,
      currentBet: finalCurrentBet, // Current bet to call
      bigBlind: INITIAL_BIG_BLIND,
      playerStackBB: playerStacksBB[playerSeat],
      playerStacksBB,
      playerBetsBB: finalBets, // Include opponent bets
      smallBlindSeat,
      bigBlindSeat,
      buttonSeat,
      actionToFace: finalActionToFace, // Need to call if there's a bet
      isPlayerTurn: true,
      activePlayers: numPlayers,
      lastAction: null,
      feedback: null,
      isCorrect: null,
      optimalActions: [],
      explanation: null,
      showFeedbackModal: false,
      showBetSizingModal: false,
      pendingAction: null,
      betSizeBB: null,
      betSizeAnalysis: null,
      postFlopBetSizeAnalysis: null,
    });
  },

  // Select an action (may require bet sizing)
  selectAction: (action: Action | BettingAction) => {
    // Check if action requires bet sizing
    if (action === "raise" || action === "bet") {
      set({
        showBetSizingModal: true,
        pendingAction: action as Action,
      });
    } else {
      // Fold, call, or check - no bet sizing needed
      useGameStore.getState().takeAction(action);
    }
  },

  // Confirm bet size and take action
  confirmBetSize: (betSizeBB: number) => {
    const state = useGameStore.getState();
    if (!state.pendingAction || !state.playerHand) return;

    // Analyze bet size based on game stage
    let betSizeAnalysis: BetSizeAnalysis | null = null;
    let postFlopBetSizeAnalysis: PostFlopBetSizeAnalysis | null = null;
    
    if (state.gameStage === "preflop" && state.pendingAction === "raise") {
      // Preflop: use BB-based sizing
      betSizeAnalysis = analyzeBetSize(
        state.playerHand,
        state.playerPosition,
        betSizeBB,
        state.numPlayers
      );
    } else if (state.gameStage !== "preflop" && (state.pendingAction === "bet" || state.pendingAction === "raise")) {
      // Post-flop: use pot-relative sizing
      postFlopBetSizeAnalysis = analyzePostFlopBetSize(
        state.playerHand,
        state.communityCards,
        state.gameStage,
        betSizeBB,
        state.pot,
        state.playerPosition
      );
    }

    // Set bet sizing analysis before calling takeAction so it can access it
    set({
      betSizeAnalysis,
      postFlopBetSizeAnalysis,
      betSizeBB,
    });

    // Now take the action (which will preserve bet sizing analysis if action was bet/raise)
    state.takeAction(state.pendingAction, betSizeBB);
    
    // Close bet sizing modal
    set({
      showBetSizingModal: false,
      pendingAction: null,
    });
  },

  // Cancel bet sizing
  cancelBetSize: () => {
    set({
      showBetSizingModal: false,
      pendingAction: null,
    });
  },

  // Take an action
  takeAction: (action: Action | BettingAction, betSizeBB?: number) => {
    const state = useGameStore.getState();
    if (!state.playerHand) return;

    // Handle preflop vs post-flop
    if (state.gameStage === "preflop") {
      // Preflop logic
      const result = getGTOAction(state.playerHand, state.playerPosition, action as Action, state.numPlayers);
      const explanation = getGTOExplanation(state.playerHand, state.playerPosition, action as Action, result.optimalActions, state.numPlayers);

      // Update player bets based on action
      const updatedBets = [...state.playerBetsBB];
      if (action === "call") {
        // Call the current bet (BB)
        updatedBets[state.playerSeat] = state.currentBet;
      } else if (action === "raise" && betSizeBB) {
        // Raise to betSizeBB
        updatedBets[state.playerSeat] = betSizeBB;
        // Update current bet to the raise size
        set({ currentBet: betSizeBB });
      } else if (action === "fold") {
        // Player folds, bet stays at 0 (or previous bet if they had one)
        // No change needed
      }

      set({
        lastAction: action as Action,
        feedback: result.feedback,
        isCorrect: result.correct,
        optimalActions: result.optimalActions,
        explanation,
        postFlopExplanation: null, // Clear post-flop explanation on preflop action
        showFeedbackModal: true,
        isPlayerTurn: false,
        playerBetsBB: updatedBets,
        // Only keep bet sizing analysis if action was actually a raise
        betSizeAnalysis: (action === "raise" && betSizeBB) ? state.betSizeAnalysis : null,
        postFlopBetSizeAnalysis: null, // Clear post-flop bet sizing on preflop action
        betSizeBB: (action === "raise" && betSizeBB) ? betSizeBB : null, // Only keep betSizeBB if action was raise
      });

      // Don't automatically advance to next street - wait for user to close feedback modal
      // This will be handled in closeFeedbackModal for preflop actions
    } else {
      // Post-flop logic
      const postFlopAction = action as BettingAction;
      const result = getPostFlopGTOAction(
        state.playerHand,
        state.communityCards,
        state.gameStage,
        state.playerPosition,
        state.actionToFace,
        state.numPlayers,
        state.pot,
        betSizeBB
      );

      const correct = result.optimalActions.includes(postFlopAction);
      const handStrength = evaluateHandStrength(state.playerHand, state.communityCards, state.gameStage);
      const postFlopExplanation = getPostFlopExplanation(
        state.playerHand,
        state.communityCards,
        state.gameStage,
        state.playerPosition,
        postFlopAction,
        result.optimalActions,
        handStrength
      );
      
      // Update player bets based on action
      const updatedBets = [...state.playerBetsBB];
      if (postFlopAction === "call" && state.actionToFace === "bet") {
        // Call the current bet
        updatedBets[state.playerSeat] = state.currentBet;
      } else if (postFlopAction === "bet" || (postFlopAction === "raise" && betSizeBB)) {
        // Bet or raise
        const betAmount = betSizeBB || state.currentBet;
        updatedBets[state.playerSeat] = betAmount;
        set({ currentBet: betAmount });
      } else if (postFlopAction === "check") {
        // Check - no bet change
        updatedBets[state.playerSeat] = 0;
      } else if (postFlopAction === "fold") {
        // Fold - bet stays at 0
        updatedBets[state.playerSeat] = 0;
      }
      
      set({
        lastAction: postFlopAction as Action,
        feedback: result.feedback,
        isCorrect: correct,
        optimalActions: result.optimalActions as Action[],
        explanation: null, // Clear preflop explanation on post-flop action
        postFlopExplanation,
        isPlayerTurn: false,
        showFeedbackModal: true,
        playerBetsBB: updatedBets,
        // Only keep bet sizing analysis if action was actually a bet or raise
        betSizeAnalysis: null, // Clear preflop bet sizing on post-flop action
        postFlopBetSizeAnalysis: ((postFlopAction === "bet" || postFlopAction === "raise") && betSizeBB) ? state.postFlopBetSizeAnalysis : null,
        betSizeBB: ((postFlopAction === "bet" || postFlopAction === "raise") && betSizeBB) ? betSizeBB : null, // Only keep betSizeBB if action was bet/raise
      });

      // Don't automatically process opponent actions - wait for user to close feedback modal
      // This will be handled in closeFeedbackModal for post-flop actions
    }
  },

  // Process opponent actions
  processOpponentActions: () => {
    const state = useGameStore.getState();
    if (state.gameStage === "preflop") return;

    // Simulate opponent actions
    // More random - 50% chance to advance, 50% chance opponent bets
    const shouldAdvance = Math.random() > 0.5; // 50% chance to advance
    
    if (shouldAdvance) {
      state.advanceToNextStreet();
    } else {
      // Opponent bets, now it's player's turn
      // Determine which opponent acts before player based on position
      const positionOrder: Position[] = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"];
      const playerPositionIndex = positionOrder.indexOf(state.playerPosition);
      
      // Find the opponent who acts before the player (or after if player acts first)
      let opponentSeat: number | null = null;
      if (playerPositionIndex > 0) {
        // Player doesn't act first, find the opponent who acts before
        const prevPositionIndex = playerPositionIndex - 1;
        if (prevPositionIndex < state.numPlayers) {
          opponentSeat = prevPositionIndex;
        }
      } else {
        // Player acts first, opponent acts after (for post-flop, this would be next in order)
        // For simplicity, use a random opponent seat
        opponentSeat = Math.floor(Math.random() * state.numPlayers);
        if (opponentSeat === state.playerSeat) {
          opponentSeat = (opponentSeat + 1) % state.numPlayers;
        }
      }
      
      const opponentAction = simulateOpponentAction(state.gameStage, state.pot);
      if (opponentAction?.action === "bet" && opponentSeat !== null) {
        const betSize = opponentAction.betSizeBB || Math.max(1, Math.round(state.pot * 0.5 * 10) / 10); // Default to half pot, at least 1 BB
        const updatedBets = [...state.playerBetsBB];
        updatedBets[opponentSeat] = betSize;
        
        set({
          actionToFace: "bet",
          isPlayerTurn: true,
          pot: state.pot + betSize,
          currentBet: betSize,
          playerBetsBB: updatedBets, // Update opponent's bet visually
        });
      } else if (opponentAction?.action === "check") {
        set({
          actionToFace: "check",
          isPlayerTurn: true,
        });
      }
    }
  },

  // Advance to next street
  advanceToNextStreet: () => {
    const state = useGameStore.getState();
    if (!state.playerHand) return;

    let nextStage: GameStage;
    let newCommunityCards: Card[] = [];

    if (state.gameStage === "preflop") {
      nextStage = "flop";
      newCommunityCards = generateCommunityCards(
        [state.playerHand.card1, state.playerHand.card2],
        "flop"
      );
    } else if (state.gameStage === "flop") {
      nextStage = "turn";
      newCommunityCards = generateCommunityCards(
        [state.playerHand.card1, state.playerHand.card2, ...state.communityCards],
        "turn"
      );
    } else if (state.gameStage === "turn") {
      nextStage = "river";
      newCommunityCards = generateCommunityCards(
        [state.playerHand.card1, state.playerHand.card2, ...state.communityCards],
        "river"
      );
    } else {
      // River complete, deal new hand
      setTimeout(() => {
        useGameStore.getState().dealNewHand();
      }, 1000);
      return;
    }

    // Determine action order based on position
    const isPlayerFirst = getIsPlayerFirst(state.playerPosition, state.numPlayers);
    
    const updatedCommunityCards = nextStage === "flop" 
      ? newCommunityCards 
      : [...state.communityCards, ...newCommunityCards];
    
    // Reset all bets for new street
    const resetBets = Array(state.numPlayers).fill(0);
    
    set({
      gameStage: nextStage,
      communityCards: updatedCommunityCards,
      actionToFace: null,
      isPlayerTurn: isPlayerFirst,
      currentBet: 0,
      playerBetsBB: resetBets,
      // Don't close feedback modal if it's open - let user close it manually
      // showFeedbackModal: state.showFeedbackModal, // Keep current state
    });

    // If player acts second, simulate opponent action first
    if (!isPlayerFirst) {
      setTimeout(() => {
        const currentState = useGameStore.getState();
        const positionOrder: Position[] = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"];
        const playerPositionIndex = positionOrder.indexOf(currentState.playerPosition);
        
        // Find the opponent who acts before the player
        let opponentSeat: number | null = null;
        if (playerPositionIndex > 0) {
          const prevPositionIndex = playerPositionIndex - 1;
          if (prevPositionIndex < currentState.numPlayers) {
            opponentSeat = prevPositionIndex;
          }
        }
        
        // If we can't find a previous position, use a random opponent
        if (opponentSeat === null || opponentSeat === currentState.playerSeat) {
          opponentSeat = Math.floor(Math.random() * currentState.numPlayers);
          if (opponentSeat === currentState.playerSeat) {
            opponentSeat = (opponentSeat + 1) % currentState.numPlayers;
          }
        }
        
        const opponentAction = simulateOpponentAction(nextStage, currentState.pot);
        if (opponentAction?.action === "bet" && opponentSeat !== null) {
          const betSize = opponentAction.betSizeBB || Math.max(1, Math.round(currentState.pot * 0.5 * 10) / 10); // At least 1 BB
          const updatedBets = [...resetBets];
          updatedBets[opponentSeat] = betSize;
          
          useGameStore.setState({
            actionToFace: "bet",
            isPlayerTurn: true,
            pot: currentState.pot + betSize,
            currentBet: betSize,
            playerBetsBB: updatedBets, // Show opponent's bet visually
          });
        } else {
          // Opponent checks, player can act
          useGameStore.setState({
            actionToFace: "check",
            isPlayerTurn: true,
          });
        }
      }, 1000);
    }
  },

  // Close feedback modal
  closeFeedbackModal: () => {
    const state = useGameStore.getState();
    set({
      showFeedbackModal: false,
    });
    
    // Determine what action to use for game progression
    // If user made wrong action, use the correct action instead
    const actionToUse = state.isCorrect === false && state.optimalActions.length > 0 
      ? state.optimalActions[0] // Use first optimal action if user was wrong
      : state.lastAction; // Use actual action if correct
    
    // If preflop, advance to flop if hand continues (player didn't fold)
    if (state.gameStage === "preflop") {
      // Convert action to Action type for comparison
      const action = actionToUse as Action;
      if (action !== "fold") {
        // Hand continues - advance to flop (as if correct action was taken)
        setTimeout(() => {
          useGameStore.getState().advanceToNextStreet();
        }, 300);
      } else {
        // Player folded (or should have folded) - deal new hand
        setTimeout(() => {
          useGameStore.getState().dealNewHand();
        }, 300);
      }
    } else {
      // Post-flop: process opponent actions and advance street if needed
      // Use correct action for progression
      const postFlopAction = actionToUse as BettingAction;
      if (postFlopAction === "fold") {
        // Player folded (or should have) - deal new hand
        setTimeout(() => {
          useGameStore.getState().dealNewHand();
        }, 300);
      } else {
        // Continue hand - process opponent actions
        setTimeout(() => {
          useGameStore.getState().processOpponentActions();
        }, 300);
      }
    }
  },

  // Reset game
  resetGame: () => {
    set({
      playerHand: null,
      numPlayers: 6,
      isRandomPlayers: false,
      playerPosition: "UTG",
      playerSeat: 0,
      gameStage: "preflop",
      communityCards: [],
      pot: INITIAL_POT,
      currentBet: INITIAL_BET,
      bigBlind: INITIAL_BIG_BLIND,
      playerStackBB: 100,
      playerStacksBB: [],
      actionToFace: null,
      isPlayerTurn: true,
      activePlayers: 0,
      lastAction: null,
      feedback: null,
      isCorrect: null,
      optimalActions: [],
      explanation: null,
      postFlopExplanation: null,
      showFeedbackModal: false,
      showBetSizingModal: false,
      pendingAction: null,
      betSizeBB: null,
      betSizeAnalysis: null,
      postFlopBetSizeAnalysis: null,
    });
  },
}));

