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
  actionToFace: null,
  isPlayerTurn: true,
  activePlayers: 0,
  lastAction: null,
  feedback: null,
  isCorrect: null,
  optimalActions: [],
  explanation: null,
  showFeedbackModal: false,
  showBetSizingModal: false,
  pendingAction: null,

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

    set({
      playerHand,
      numPlayers: numPlayers, // Update with actual player count used
      playerSeat,
      playerPosition,
      gameStage: "preflop",
      communityCards: [],
      pot: INITIAL_POT + (numPlayers * 1.5), // Blinds
      currentBet: INITIAL_BET,
      bigBlind: INITIAL_BIG_BLIND,
      playerStackBB: playerStacksBB[playerSeat],
      playerStacksBB,
      actionToFace: null,
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

    state.takeAction(state.pendingAction, betSizeBB);
    set({
      showBetSizingModal: false,
      pendingAction: null,
      betSizeBB,
      betSizeAnalysis,
      postFlopBetSizeAnalysis,
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

      set({
        lastAction: action as Action,
        feedback: result.feedback,
        isCorrect: result.correct,
        optimalActions: result.optimalActions,
        explanation,
        showFeedbackModal: true,
        isPlayerTurn: false,
      });

      // After preflop action, advance to flop if hand continues
      if (action !== "fold") {
        setTimeout(() => {
          useGameStore.getState().advanceToNextStreet();
        }, 2000); // Wait 2 seconds before advancing
      }
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
      
      set({
        lastAction: postFlopAction as Action,
        feedback: result.feedback,
        isCorrect: correct,
        optimalActions: result.optimalActions as Action[],
        postFlopExplanation,
        isPlayerTurn: false,
        showFeedbackModal: true,
      });

      // Process opponent actions and advance street if needed
      setTimeout(() => {
        useGameStore.getState().processOpponentActions();
      }, 2000);
    }
  },

  // Process opponent actions
  processOpponentActions: () => {
    const state = useGameStore.getState();
    if (state.gameStage === "preflop") return;

    // Simulate opponent actions
    // For now, simplified - just check if we should advance to next street
    const shouldAdvance = Math.random() > 0.3; // 70% chance to advance
    
    if (shouldAdvance) {
      state.advanceToNextStreet();
    } else {
      // Opponent bets, now it's player's turn
      const opponentAction = simulateOpponentAction(state.gameStage, state.pot);
      if (opponentAction?.action === "bet") {
        set({
          actionToFace: "bet",
          isPlayerTurn: true,
          pot: state.pot + (opponentAction.betSizeBB || 0),
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
    
    set({
      gameStage: nextStage,
      communityCards: updatedCommunityCards,
      actionToFace: null,
      isPlayerTurn: isPlayerFirst,
      currentBet: 0,
    });

    // If player acts second, simulate opponent action first
    if (!isPlayerFirst) {
      setTimeout(() => {
        const currentState = useGameStore.getState();
        const opponentAction = simulateOpponentAction(nextStage, currentState.pot);
        if (opponentAction?.action === "bet") {
          useGameStore.setState({
            actionToFace: "bet",
            isPlayerTurn: true,
            pot: currentState.pot + (opponentAction.betSizeBB || 0),
            currentBet: opponentAction.betSizeBB || 0,
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
    
    // If preflop, auto-deal new hand after closing modal
    // If post-flop, continue with the hand
    if (state.gameStage === "preflop") {
      setTimeout(() => {
        useGameStore.getState().dealNewHand();
      }, 300);
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

