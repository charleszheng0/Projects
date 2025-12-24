import { create } from "zustand";
import { Hand, Action, Position, generateRandomHand, getGTOAction, getPositionFromSeat } from "@/lib/gto";
import { getGTOExplanation, GTOExplanation } from "@/lib/gto-explanations";
import { analyzeBetSize, BetSizeAnalysis } from "@/lib/bet-sizing";

type GameState = {
  // Hand state
  playerHand: Hand | null;
  numPlayers: number;
  playerPosition: Position;
  playerSeat: number;
  
  // Game state
  pot: number;
  currentBet: number;
  bigBlind: number;
  playerStackBB: number;
  playerStacksBB: number[]; // All player stacks in BBs
  
  // Action state
  lastAction: Action | null;
  feedback: string | null;
  isCorrect: boolean | null;
  optimalActions: Action[];
  explanation: GTOExplanation | null;
  showFeedbackModal: boolean;
  showBetSizingModal: boolean;
  pendingAction: Action | null;
  betSizeBB: number | null;
  betSizeAnalysis: BetSizeAnalysis | null;
  
  // Actions
  dealNewHand: () => void;
  selectAction: (action: Action) => void;
  confirmBetSize: (betSizeBB: number) => void;
  cancelBetSize: () => void;
  takeAction: (action: Action, betSizeBB?: number) => void;
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
  playerPosition: "UTG",
  playerSeat: 0,
  pot: INITIAL_POT,
  currentBet: INITIAL_BET,
  bigBlind: INITIAL_BIG_BLIND,
  playerStackBB: 100,
  playerStacksBB: [],
  lastAction: null,
  feedback: null,
  isCorrect: null,
  optimalActions: [],
  explanation: null,
  showFeedbackModal: false,
  showBetSizingModal: false,
  pendingAction: null,

  // Deal a new hand
  dealNewHand: () => {
    const numPlayers = Math.floor(Math.random() * 8) + 2; // 2-9 players
    const playerSeat = Math.floor(Math.random() * numPlayers);
    const playerPosition = getPositionFromSeat(playerSeat, numPlayers);
    const playerHand = generateRandomHand();
    const playerStacksBB = generateRandomStacks(numPlayers);

    set({
      playerHand,
      numPlayers,
      playerSeat,
      playerPosition,
      pot: INITIAL_POT,
      currentBet: INITIAL_BET,
      bigBlind: INITIAL_BIG_BLIND,
      playerStackBB: playerStacksBB[playerSeat],
      playerStacksBB,
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
  selectAction: (action: Action) => {
    if (action === "raise") {
      set({
        showBetSizingModal: true,
        pendingAction: action,
      });
    } else {
      // Fold or call - no bet sizing needed
      useGameStore.getState().takeAction(action);
    }
  },

  // Confirm bet size and take action
  confirmBetSize: (betSizeBB: number) => {
    const state = useGameStore.getState();
    if (!state.pendingAction || !state.playerHand) return;

    // Analyze bet size
    const betSizeAnalysis = analyzeBetSize(
      state.playerHand,
      state.playerPosition,
      betSizeBB
    );

    state.takeAction(state.pendingAction, betSizeBB);
    set({
      showBetSizingModal: false,
      pendingAction: null,
      betSizeBB,
      betSizeAnalysis,
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
  takeAction: (action: Action, betSizeBB?: number) => {
    const state = useGameStore.getState();
    if (!state.playerHand) return;

    const result = getGTOAction(state.playerHand, state.playerPosition, action);
    const explanation = getGTOExplanation(state.playerHand, state.playerPosition, action, result.optimalActions);

    set({
      lastAction: action,
      feedback: result.feedback,
      isCorrect: result.correct,
      optimalActions: result.optimalActions,
      explanation,
      showFeedbackModal: true,
    });
  },

  // Close feedback modal and auto-deal new hand
  closeFeedbackModal: () => {
    set({
      showFeedbackModal: false,
    });
    // Auto-deal new hand after closing modal
    setTimeout(() => {
      useGameStore.getState().dealNewHand();
    }, 300); // Small delay for smooth transition
  },

  // Reset game
  resetGame: () => {
    set({
      playerHand: null,
      numPlayers: 6,
      playerPosition: "UTG",
      playerSeat: 0,
      pot: INITIAL_POT,
      currentBet: INITIAL_BET,
      bigBlind: INITIAL_BIG_BLIND,
      playerStackBB: 100,
      playerStacksBB: [],
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
}));

