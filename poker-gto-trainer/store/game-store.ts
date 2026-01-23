import { create } from "zustand";
import { Hand, Action, Position, generateRandomHand, getGTOAction, getPositionFromSeat, Card, formatHand } from "@/lib/gto";
import { getGTOExplanation, GTOExplanation } from "@/lib/gto-explanations";
import { analyzeBetSize, BetSizeAnalysis } from "@/lib/bet-sizing";
import { analyzePostFlopBetSize, PostFlopBetSizeAnalysis } from "@/lib/postflop-bet-sizing";
import { GameStage, BettingAction, PostFlopAction, getPostFlopGTOAction, generateCommunityCards, evaluateHandStrength } from "@/lib/postflop-gto";
import { getIsPlayerFirst } from "@/lib/action-order";
import { getPostFlopExplanation, PostFlopExplanation } from "@/lib/postflop-explanations";
import { simulateRealisticPreflopAction, simulateRealisticPostflopAction, OpponentStats, DEFAULT_OPPONENT_STATS, loadOpponentStats } from "@/lib/realistic-opponent";
import { getDataset } from "@/lib/hand-history";
import { generateUniqueHands } from "@/lib/hand-generation";
import { getSessionManager } from "@/lib/session-tracking";
import { PlayerProfileType, getRandomProfile, getProfileStats, PLAYER_PROFILES } from "@/lib/player-profiles";
import { calculateEVLoss } from "@/lib/ev-calculator";
import { roundBB } from "@/lib/utils";
import { SolverTree } from "@/lib/solver-tree";
import { createDefaultSolverTree } from "@/lib/default-solver-tree";
import { convertToActionEngineState, applyActionEngineStateToStore } from "@/lib/game-state-adapter";
import { bettingRoundClosed, runVillainActions, resetBettingForNewStreet } from "@/lib/action-engine";
import { runFlawlessVillainActions } from "@/lib/villain-engine";
import { validateAction, validateAndAdjustBetSize, getAvailableActions } from "@/lib/action-validation";

type GameState = {
  // Hand state
  playerHand: Hand | null;
  opponentHands: (Hand | null)[]; // Opponent hands (index = seat), null if folded or not dealt
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
  foldedPlayers: boolean[]; // Track which players have folded (index = seat)
  lastActorSeat: number | null; // Track who last acted (for visual indication)
  actionHistory: Array<{ player: string; action: string; betSize?: number; seat?: number }>; // History of actions taken
  currentActorSeat: number | null; // Track whose turn it is currently (for animation)
  animationState: "dealing" | "action" | "complete" | null; // Current animation state
  
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
  opponentStats: OpponentStats; // Custom opponent statistics
  opponentProfiles: Map<number, PlayerProfileType>; // Map seat -> profile type
  cumulativeEV: number; // Track cumulative EV across hands (for session stats)
  handEV: number; // Track EV for current hand only
  evLoss: number; // EV loss for the last action (for correctness level determination)
  solverTree: SolverTree; // Solver tree for opponent decisions
  useSolverEngine: boolean; // Whether to use solver-driven opponent AI
  currentHandId: string | null; // Track current hand for data collection
  
  // Training features (opt-in, never blocks input)
  customRange: Set<string>; // Selected hands for training (e.g., "AKo", "76s")
  useCustomRange: boolean; // Whether to use custom range for training feedback
  isPausedForReview: boolean; // Whether game is paused waiting for Continue button
  showEVPanel: boolean; // Whether to show EV panel
  showPlayerHand: boolean; // Whether to show player's hand cards
  canSelectRange: boolean; // Whether range selection is allowed (independent of hand state)
  
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
  loadOpponentStats: (jsonData: string) => void;
  // Training feature actions
  toggleHandInRange: (hand: string) => void;
  setUseCustomRange: (enabled: boolean) => void;
  setShowEVPanel: (show: boolean) => void;
  setPausedForReview: (paused: boolean) => void;
  setShowPlayerHand: (show: boolean) => void;
  setCanSelectRange: (canSelect: boolean) => void;
  userClickedContinue: () => void;
};

const INITIAL_BIG_BLIND = 2;
const INITIAL_POT = 0;
const INITIAL_BET = 0;

// Generate random stack sizes in BBs (between 20 and 200 BBs)
// Returns clean integer values to avoid floating point precision issues
function generateRandomStacks(numPlayers: number): number[] {
  return Array.from({ length: numPlayers }, () => {
    // Generate integer stack sizes to avoid floating point issues
    return Math.floor(Math.random() * 180) + 20; // 20-200 BBs (integers)
  });
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  playerHand: null,
  opponentHands: [],
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
  foldedPlayers: [],
  lastActorSeat: null,
  currentActorSeat: null,
  actionHistory: [],
  animationState: null,
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
  opponentStats: DEFAULT_OPPONENT_STATS,
  opponentProfiles: new Map<number, PlayerProfileType>() as Map<number, PlayerProfileType>,
  cumulativeEV: 0,
  handEV: 0,
  evLoss: 0,
  currentHandId: null,
  solverTree: createDefaultSolverTree(),
  useSolverEngine: true, // Enable solver-driven opponent AI by default
  // Training features initial state
  customRange: new Set<string>(),
  useCustomRange: false,
  isPausedForReview: false,
  showEVPanel: false,
  showPlayerHand: true, // Show hand by default
  canSelectRange: true, // Allow range selection by default

  // Set number of players (minimum 2 to ensure at least one opponent)
  setNumPlayers: (count: number) => {
    if (count >= 2 && count <= 9) {
      set({ numPlayers: count, isRandomPlayers: false });
    } else if (count < 2) {
      // Ensure minimum of 2 players
      set({ numPlayers: 2, isRandomPlayers: false });
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
    // Ensure minimum of 2 players (at least one opponent)
    const numPlayers = state.isRandomPlayers 
      ? Math.max(2, Math.floor(Math.random() * 8) + 2) // 2-9 players, minimum 2
      : Math.max(2, state.numPlayers); // Ensure at least 2 players
    const playerSeat = Math.floor(Math.random() * numPlayers);
    const playerPosition = getPositionFromSeat(playerSeat, numPlayers);
    
    // Generate all hands at once to ensure no duplicate cards
    // Use weighted generation for player hand (more playable hands)
    // Apply custom range filter if enabled
    const allHands = generateUniqueHands(
      numPlayers, 
      [], 
      true, 
      state.customRange, 
      state.useCustomRange
    );
    const playerHand = allHands[playerSeat];
    
    // Validate that player hand is in range if custom range is enabled
    if (state.useCustomRange && state.customRange.size > 0 && playerHand) {
      const handEncoding = formatHand(playerHand);
      if (!state.customRange.has(handEncoding)) {
        console.warn(`Generated hand ${handEncoding} is not in custom range, but continuing anyway`);
      }
    }
    
    // Create opponent hands array
    const opponentHands: (Hand | null)[] = allHands.map((hand, seat) => 
      seat === playerSeat ? null : hand
    );
    
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
    
    // Reduce stacks for blinds (chips go into pot)
    // Round to avoid floating point precision issues
    playerStacksBB[smallBlindSeat] = Math.max(0, roundBB(playerStacksBB[smallBlindSeat] - 0.5));
    playerStacksBB[bigBlindSeat] = Math.max(0, roundBB(playerStacksBB[bigBlindSeat] - 1));
    
    // Calculate initial pot (blinds)
    const initialPot = 1.5; // SB + BB
    
    // Generate unique hand ID for tracking (include session ID for analytics)
    const sessionManager = getSessionManager();
    const sessionId = sessionManager.getCurrentSessionId() || "no-session";
    const handId = `${sessionId}-hand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Assign player profiles to opponents (if not already assigned or if player count changed)
    const currentProfiles = state.opponentProfiles;
    const newProfiles = new Map<number, PlayerProfileType>();
    for (let seat = 0; seat < numPlayers; seat++) {
      if (seat !== playerSeat) {
        // Assign a random profile to each opponent, or keep existing if player count hasn't changed
        if (currentProfiles.has(seat) && currentProfiles.size === numPlayers - 1) {
          newProfiles.set(seat, currentProfiles.get(seat)!);
        } else {
          newProfiles.set(seat, getRandomProfile());
        }
      }
    }
    
    // Simulate preflop actions before player's turn
    // Action order: UTG -> UTG+1 -> MP -> CO -> BTN -> SB -> BB (clockwise)
    // We need to simulate actions from players who act before the player
    let finalBets = [...playerBetsBB];
    let finalPot = initialPot;
    let finalCurrentBet = INITIAL_BIG_BLIND;
    let finalActionToFace: BettingAction | null = null;
    const finalFoldedPlayers = Array(numPlayers).fill(false); // Track folded players
    
    // Map seats to positions to determine action order
    // Create a mapping of seat -> position
    const seatToPosition: Map<number, Position> = new Map();
    for (let seat = 0; seat < numPlayers; seat++) {
      seatToPosition.set(seat, getPositionFromSeat(seat, numPlayers));
    }
    
    // Determine action order based on position (clockwise)
    // Preflop: UTG acts first (first player after BB), then UTG+1, MP, CO, BTN, BB, and finally SB acts last
    // This is because SB already posted a blind, so they get the last action preflop
    const positionOrder: Position[] = ["UTG", "UTG+1", "MP", "CO", "BTN", "BB", "SB"];
    const playerPositionIndex = positionOrder.indexOf(playerPosition);
    
    // Track which seats have acted (for determining if someone must have folded)
    const seatsThatHaveActed = new Set<number>();
    
    // Simulate actions from players who act before the player (clockwise order)
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
      
      // Use realistic opponent simulation based on position and their actual hand
      const seatPosition = seatToPosition.get(actingSeat);
      if (!seatPosition) continue;
      
      // Get opponent's actual hand
      const opponentHand = allHands[actingSeat];
      
      // Use GTO to determine optimal action based on their actual hand
      // This makes opponents play optimally based on their cards
      let opponentAction: "fold" | "call" | "raise";
      
      // Get opponent's profile
      const opponentProfile = newProfiles.get(actingSeat) || "BALANCED";
      const profileStats = getProfileStats(opponentProfile);
      
      if (opponentHand) {
        // Use profile-based simulation with some GTO influence
        // Each profile has different tendencies, but still influenced by GTO
        const gtoResult = getGTOAction(opponentHand, seatPosition, "call", numPlayers);
        
        // Use profile stats with GTO adjustment (don't follow 100% to the tee)
        // Mix profile tendencies (70%) with GTO (30%) for realism
        const profileAction = simulateRealisticPreflopAction(
          seatPosition,
          finalCurrentBet,
          profileStats
        );
        
        // Adjust based on GTO: if GTO says fold and profile says call/raise, fold more often
        if (gtoResult.optimalActions.includes("fold")) {
          if (profileAction === "fold") {
            opponentAction = Math.random() < 0.95 ? "fold" : "call"; // Very high fold rate
          } else {
            opponentAction = Math.random() < 0.70 ? "fold" : profileAction; // Fold more often
          }
        } else if (gtoResult.optimalActions.includes("raise") || gtoResult.optimalActions.includes("all-in")) {
          if (profileAction === "raise") {
            opponentAction = Math.random() < 0.85 ? "raise" : "call"; // High raise rate
          } else {
            opponentAction = Math.random() < 0.40 ? "raise" : profileAction; // Raise sometimes
          }
        } else {
          // GTO says call - use profile action with some variance
          opponentAction = profileAction;
        }
      } else {
        // Fallback to profile-based simulation
        opponentAction = simulateRealisticPreflopAction(
          seatPosition,
          finalCurrentBet,
          profileStats
        );
      }
      
      const previousBet = finalBets[actingSeat] || 0;
      
      if (opponentAction === "raise") {
        // Opponent raises (2.5x to 4x BB) - more realistic sizing
        // SB and BB can raise (they already posted blinds but can raise)
        const raiseSize = Math.round(INITIAL_BIG_BLIND * (2.5 + Math.random() * 1.5) * 10) / 10;
        const additionalAmount = raiseSize - previousBet;
        finalBets[actingSeat] = raiseSize;
        finalCurrentBet = raiseSize;
        // Reduce opponent's stack by the additional amount they're betting
        playerStacksBB[actingSeat] = Math.max(0, roundBB(playerStacksBB[actingSeat] - additionalAmount));
        // Add the additional amount to pot (raiseSize - previousBet)
        finalPot = roundBB(finalPot + additionalAmount);
        finalActionToFace = "call";
        seatsThatHaveActed.add(actingSeat);
        // More raises = harder decisions for player
      } else if (opponentAction === "call") {
        // Opponent calls
        const callAmount = finalCurrentBet;
        const previousBetAmount = previousBet;
        const additionalAmount = callAmount - previousBetAmount;
        finalBets[actingSeat] = callAmount;
        // Reduce opponent's stack by the additional amount they're calling
        playerStacksBB[actingSeat] = Math.max(0, roundBB(playerStacksBB[actingSeat] - additionalAmount));
        // Add the additional amount to pot (callAmount - previousBetAmount)
        finalPot = roundBB(finalPot + additionalAmount);
        if (!finalActionToFace && callAmount > INITIAL_BIG_BLIND) {
          finalActionToFace = "call";
        }
        seatsThatHaveActed.add(actingSeat);
      } else {
        // Opponent folds - mark as folded
        finalFoldedPlayers[actingSeat] = true;
        // If SB/BB folds, their blind stays in pot (already counted in initialPot)
        // If non-blind player folds, their bet (if any) stays in pot
        // Note: We keep their hand visible even if folded (for learning purposes)
        seatsThatHaveActed.add(actingSeat); // They acted by folding
      }
    }
    
    // Mark any players who should have acted but didn't as folded
    // (if someone after them in action order has acted, they must have folded)
    for (let i = 0; i < playerPositionIndex; i++) {
      const actingPosition = positionOrder[i];
      let actingSeat: number | null = null;
      for (const [seat, pos] of seatToPosition.entries()) {
        if (pos === actingPosition) {
          actingSeat = seat;
          break;
        }
      }
      
      if (actingSeat !== null && actingSeat !== playerSeat) {
        // Check if any player after this one in action order has acted
        let someoneAfterActed = false;
        for (let j = i + 1; j < playerPositionIndex; j++) {
          const laterPosition = positionOrder[j];
          let laterSeat: number | null = null;
          for (const [seat, pos] of seatToPosition.entries()) {
            if (pos === laterPosition) {
              laterSeat = seat;
              break;
            }
          }
          if (laterSeat !== null && seatsThatHaveActed.has(laterSeat)) {
            someoneAfterActed = true;
            break;
          }
        }
        
        // If someone after them acted but they didn't, they must have folded
        if (someoneAfterActed && !seatsThatHaveActed.has(actingSeat)) {
          finalFoldedPlayers[actingSeat] = true;
        }
      }
    }
    
    // Determine if player needs to call
    const needsToCallBB = playerSeat !== smallBlindSeat && playerSeat !== bigBlindSeat;
    if (!finalActionToFace && needsToCallBB) {
      finalActionToFace = finalCurrentBet > INITIAL_BIG_BLIND ? "call" : "call";
    }

    set({
      playerHand,
      opponentHands, // Store opponent hands (null for player seat)
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
      canSelectRange: false, // Lock range selection ONLY when actively making a decision (isPlayerTurn: true)
      activePlayers: numPlayers - finalFoldedPlayers.filter(f => f).length,
      foldedPlayers: finalFoldedPlayers, // Mark players who folded
      lastActorSeat: null,
      currentActorSeat: null,
      lastAction: null,
      actionHistory: [],
      animationState: null, // Reset action history for new hand
      opponentStats: state.opponentStats, // Preserve opponent stats
      opponentProfiles: newProfiles, // Assign profiles to opponents
      currentHandId: handId, // Track current hand
      handEV: 0, // Reset hand EV for new hand
      evLoss: 0, // Reset EV loss for new hand
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
      isPausedForReview: false, // CRITICAL: Unpause on new hand
    });
  },

  // Select an action (may require bet sizing)
  selectAction: (action: Action | BettingAction) => {
    const state = useGameStore.getState();
    
    // CRITICAL: Validate action before proceeding
    if (!state.isPlayerTurn) {
      console.warn("Cannot select action - not player's turn");
      return;
    }
    
    if (!state.playerHand) {
      console.warn("Cannot select action - no hand");
      return;
    }
    
    // Check if action requires bet sizing - open modal immediately
    // Don't validate bet size here since user will set it in the modal
    if (action === "raise" || action === "bet") {
      // Basic validation: check if action is available
      const playerCurrentBet = state.playerBetsBB?.[state.playerSeat] || 0;
      const availableActions = getAvailableActions(
        state.gameStage,
        state.actionToFace,
        state.currentBet,
        playerCurrentBet,
        state.gameStage === "preflop"
      );
      
      const canBet = action === "bet" && availableActions.includes("bet");
      const canRaise = action === "raise" && availableActions.includes("raise");
      
      if (!canBet && !canRaise) {
        console.warn("Action not available:", action);
        return;
      }
      
      set({
        showBetSizingModal: true,
        pendingAction: action as Action,
      });
    } else {
      // Fold, call, or check - validate and proceed directly
      const playerCurrentBet = state.playerBetsBB?.[state.playerSeat] || 0;
      
      // Validate action
      const validation = validateAction(
        action,
        state.gameStage,
        state.actionToFace,
        state.currentBet,
        playerCurrentBet,
        state.playerStackBB,
        state.bigBlind
      );
      
      if (!validation.isValid) {
        console.warn("Invalid action:", validation.error);
        return;
      }
      
      // Proceed with action
      useGameStore.getState().takeAction(action);
    }
  },

  // Confirm bet size and take action
  confirmBetSize: (betSizeBB: number) => {
    const state = useGameStore.getState();
    if (!state.pendingAction || !state.playerHand) return;
    
    // CRITICAL: Validate bet size before confirming
    if (state.pendingAction !== "bet" && state.pendingAction !== "raise") {
      console.warn("Invalid pending action for bet sizing");
      return;
    }
    
    const playerCurrentBet = state.playerBetsBB?.[state.playerSeat] || 0;
    
    // CRITICAL: Validate bet size before confirming
    const validation = validateAndAdjustBetSize(
      state.pendingAction,
      betSizeBB,
      state.gameStage,
      state.pot,
      state.currentBet,
      playerCurrentBet,
      state.playerStackBB,
      state.bigBlind
    );
    
    if (!validation.isValid) {
      console.warn("Invalid bet size:", validation.error);
      // Don't proceed - let user adjust
      return;
    }
    
    // Use adjusted size if validation adjusted it
    const finalBetSize = validation.adjustedSize || betSizeBB;

    // Analyze bet size based on game stage
    let betSizeAnalysis: BetSizeAnalysis | null = null;
    let postFlopBetSizeAnalysis: PostFlopBetSizeAnalysis | null = null;
    
    if (state.gameStage === "preflop" && state.pendingAction === "raise") {
      // Preflop: use BB-based sizing
      betSizeAnalysis = analyzeBetSize(
        state.playerHand,
        state.playerPosition,
          finalBetSize,
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
    state.takeAction(state.pendingAction, finalBetSize);
    
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
    
    // CRITICAL: Validate action before applying
    if (!state.isPlayerTurn) {
      console.warn("Cannot take action - not player's turn");
      return;
    }
    
    const playerCurrentBet = state.playerBetsBB?.[state.playerSeat] || 0;
    
    // Validate action
    const validation = validateAction(
      action,
      state.gameStage,
      state.actionToFace,
      state.currentBet,
      playerCurrentBet,
      state.playerStackBB,
      state.bigBlind,
      betSizeBB
    );
    
    if (!validation.isValid) {
      console.error("Invalid action:", validation.error);
      // Don't proceed with invalid action
      return;
    }
    
    // Use adjusted bet size if validation adjusted it
    const finalBetSize = validation.adjustedBetSize || betSizeBB;

    // Handle preflop vs post-flop
    if (state.gameStage === "preflop") {
      // Preflop logic
      const result = getGTOAction(state.playerHand, state.playerPosition, action as Action, state.numPlayers);
      const explanation = getGTOExplanation(state.playerHand, state.playerPosition, action as Action, result.optimalActions, state.numPlayers);

      // Update player bets based on action
      const updatedBets = [...state.playerBetsBB];
      const previousBet = updatedBets[state.playerSeat] || 0;
      let newPot = state.pot;
      const updatedStacks = [...state.playerStacksBB];
      
      if (action === "call") {
        // Call the current bet (BB)
        const callAmount = state.currentBet;
        const additionalAmount = callAmount - previousBet;
        updatedBets[state.playerSeat] = callAmount;
        
        // CRITICAL: Update pot and stack accurately
        newPot = roundBB(newPot + additionalAmount);
        updatedStacks[state.playerSeat] = Math.max(0, roundBB(updatedStacks[state.playerSeat] - additionalAmount));
      } else if (action === "raise" && finalBetSize) {
        // Raise to finalBetSize (validated)
        const additionalAmount = finalBetSize - previousBet;
        updatedBets[state.playerSeat] = finalBetSize;
        
        // CRITICAL: Update pot and stack accurately
        newPot = roundBB(newPot + additionalAmount);
        updatedStacks[state.playerSeat] = Math.max(0, roundBB(updatedStacks[state.playerSeat] - additionalAmount));
        
        // Update current bet to the raise size
        set({ currentBet: finalBetSize });
      } else if (action === "fold") {
        // Player folds, bet stays at previous bet (chips already in pot)
        // Mark player as folded
        const updatedFolded = [...state.foldedPlayers];
        updatedFolded[state.playerSeat] = true;
        set({ foldedPlayers: updatedFolded });
      }
      
      // CRITICAL: Update stacks and pot
      set({
        pot: newPot,
        playerStacksBB: updatedStacks,
        playerStackBB: updatedStacks[state.playerSeat]
      });

      // Add to action history
      const newActionHistory = [
        ...state.actionHistory,
        {
          player: "You",
          action: action as string,
          betSize: finalBetSize || (action === "call" ? state.currentBet : undefined),
        },
      ];

      // Calculate EV loss for this action
      let evLoss = 0;
      try {
        evLoss = calculateEVLoss(
          state.playerHand,
          [],
          "preflop",
          state.pot,
          state.currentBet,
          action as string,
          result.optimalActions,
          finalBetSize,
          state.numPlayers
        );
      } catch (error) {
        // EV calculation failed, continue without it
      }

      // Update hand EV (accumulate, but reset per hand in dealNewHand)
      const newHandEV = state.handEV + evLoss;

      set({
        lastAction: action as Action,
        feedback: result.feedback,
        isCorrect: result.correct, // This will update the color correctly
        optimalActions: result.optimalActions,
        explanation,
        postFlopExplanation: null, // Clear post-flop explanation on preflop action
        showFeedbackModal: false, // Don't show modal - feedback is integrated into buttons
        isPlayerTurn: false,
        canSelectRange: true, // Unlock range selection when player's turn ends
        playerBetsBB: updatedBets,
        lastActorSeat: state.playerSeat, // Track who just acted
        actionHistory: newActionHistory,
        handEV: newHandEV, // Track EV for this hand
        evLoss: evLoss, // Store EV loss for this action
        // Only keep bet sizing analysis if action was actually a raise
        betSizeAnalysis: (action === "raise" && finalBetSize) ? state.betSizeAnalysis : null,
        postFlopBetSizeAnalysis: null, // Clear post-flop bet sizing on preflop action
        betSizeBB: (action === "raise" && finalBetSize) ? finalBetSize : null, // Only keep betSizeBB if action was raise
        isPausedForReview: true, // CRITICAL: Pause for review - user must click Continue
      });

      // CRITICAL: Do NOT auto-advance - user controls progression via Continue button
      // The ContinueButton component will handle progression when user is ready

      // Record action in dataset
      if (state.currentHandId) {
        const dataset = getDataset();
        dataset.addRecord({
          handId: state.currentHandId,
          playerHand: state.playerHand,
          playerPosition: state.playerPosition,
          numPlayers: state.numPlayers,
          playerSeat: state.playerSeat,
          gameStage: "preflop",
          communityCards: [],
          pot: state.pot,
          currentBet: state.currentBet,
          playerStackBB: state.playerStackBB,
          actionToFace: state.actionToFace,
          playerAction: action as Action,
          betSizeBB: (action === "raise" && finalBetSize) ? finalBetSize : undefined,
          optimalActions: result.optimalActions,
          isCorrect: result.correct,
          feedback: result.feedback,
          activePlayers: state.activePlayers,
          foldedPlayers: state.foldedPlayers,
        });
      }

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
      const previousBet = updatedBets[state.playerSeat] || 0;
      let newPot = state.pot;
      const updatedStacks = [...state.playerStacksBB];
      
      if (postFlopAction === "call" && state.actionToFace === "bet") {
        // Call the current bet
        const callAmount = state.currentBet;
        const additionalAmount = callAmount - previousBet;
        updatedBets[state.playerSeat] = callAmount;
        
        // CRITICAL: Update pot accurately
        newPot = roundBB(newPot + additionalAmount);
        
        // CRITICAL: Update player stack
        updatedStacks[state.playerSeat] = Math.max(0, roundBB(updatedStacks[state.playerSeat] - additionalAmount));
      } else if (postFlopAction === "bet" || (postFlopAction === "raise" && finalBetSize)) {
        // Bet or raise - use validated bet size
        const betAmount = finalBetSize || state.currentBet;
        const additionalAmount = betAmount - previousBet;
        updatedBets[state.playerSeat] = betAmount;
        
        // CRITICAL: Update pot accurately
        newPot = roundBB(newPot + additionalAmount);
        
        // CRITICAL: Update player stack
        updatedStacks[state.playerSeat] = Math.max(0, roundBB(updatedStacks[state.playerSeat] - additionalAmount));
        
        set({ currentBet: betAmount });
      } else if (postFlopAction === "check") {
        // Check - no bet change, no pot/stack changes
        updatedBets[state.playerSeat] = 0;
      } else if (postFlopAction === "fold") {
        // Fold - bet stays at previous bet (chips already in pot), mark player as folded
        const updatedFolded = [...state.foldedPlayers];
        updatedFolded[state.playerSeat] = true;
        set({ foldedPlayers: updatedFolded });
      }
      
      // CRITICAL: Update stacks and pot
      set({
        pot: newPot,
        playerStacksBB: updatedStacks,
        playerStackBB: updatedStacks[state.playerSeat]
      });
      
      // Calculate EV loss for this action
      let evLoss = 0;
      try {
        evLoss = calculateEVLoss(
          state.playerHand,
          state.communityCards,
          state.gameStage,
          state.pot,
          state.currentBet,
          postFlopAction as string,
          result.optimalActions,
          finalBetSize,
          state.numPlayers
        );
      } catch (error) {
        // EV calculation failed, continue without it
      }

      // Update hand EV (accumulate, but reset per hand in dealNewHand)
      const newHandEV = state.handEV + evLoss;

      // Add to action history
      const newActionHistory = [
        ...state.actionHistory,
        {
          player: "You",
          action: postFlopAction as string,
          betSize: finalBetSize || (postFlopAction === "call" ? state.currentBet : undefined),
        },
      ];

      set({
        lastAction: postFlopAction as Action,
        feedback: result.feedback,
        isCorrect: correct,
        optimalActions: result.optimalActions as Action[],
        explanation: null, // Clear preflop explanation on post-flop action
        postFlopExplanation,
        isPlayerTurn: false,
        showFeedbackModal: false, // Don't show modal - feedback is integrated into buttons
        playerBetsBB: updatedBets,
        pot: newPot, // Update pot with new bet amounts
        lastActorSeat: state.playerSeat, // Track who just acted
        actionHistory: newActionHistory,
        handEV: newHandEV, // Track EV for this hand
        evLoss: evLoss, // Store EV loss for this action
        // Only keep bet sizing analysis if action was actually a bet or raise
        betSizeAnalysis: null, // Clear preflop bet sizing on post-flop action
        postFlopBetSizeAnalysis: ((postFlopAction === "bet" || postFlopAction === "raise") && finalBetSize) ? state.postFlopBetSizeAnalysis : null,
        betSizeBB: ((postFlopAction === "bet" || postFlopAction === "raise") && finalBetSize) ? finalBetSize : null, // Only keep betSizeBB if action was bet/raise
        isPausedForReview: true, // CRITICAL: Pause for review - user must click Continue
      });

      // CRITICAL: Do NOT auto-advance - user controls progression via Continue button
      // The ContinueButton component will handle progression when user is ready

      // Record action in dataset
      if (state.currentHandId) {
        const dataset = getDataset();
        const handStrength = evaluateHandStrength(state.playerHand, state.communityCards, state.gameStage);
        dataset.addRecord({
          handId: state.currentHandId,
          playerHand: state.playerHand,
          playerPosition: state.playerPosition,
          numPlayers: state.numPlayers,
          playerSeat: state.playerSeat,
          gameStage: state.gameStage,
          communityCards: state.communityCards,
          pot: state.pot,
          currentBet: state.currentBet,
          playerStackBB: state.playerStackBB,
          actionToFace: state.actionToFace,
          playerAction: postFlopAction,
          betSizeBB: ((postFlopAction === "bet" || postFlopAction === "raise") && finalBetSize) ? finalBetSize : undefined,
          optimalActions: result.optimalActions as Action[],
          isCorrect: correct,
          feedback: result.feedback,
          activePlayers: state.activePlayers,
          foldedPlayers: state.foldedPlayers,
          features: {
            handStrength,
            positionValue: state.playerPosition === "BTN" || state.playerPosition === "CO" ? 0.8 : 
                          state.playerPosition === "SB" || state.playerPosition === "BB" ? 0.3 : 0.5,
            potOdds: state.currentBet > 0 ? state.currentBet / (state.pot + state.currentBet) : undefined,
            stackToPotRatio: state.playerStackBB / state.pot,
            isInPosition: state.playerPosition === "BTN" || state.playerPosition === "CO",
            isOutOfPosition: state.playerPosition === "SB" || state.playerPosition === "BB" || state.playerPosition === "UTG",
          },
        });
      }

      // Don't automatically process opponent actions - wait for user to close feedback modal
      // This will be handled in closeFeedbackModal for post-flop actions
    }
  },

  // Process opponent actions using solver engine
  processOpponentActions: async () => {
    const state = useGameStore.getState();
    
    // Use solver engine if enabled
    if (state.useSolverEngine) {
      try {
        // Convert to action engine state
        const engineState = convertToActionEngineState();
        
        // CRITICAL: Use flawless villain engine for perfect behavior
        await runFlawlessVillainActions(engineState);
        
        // Apply changes back to store
        applyActionEngineStateToStore(engineState);
        
        // Check if betting round is closed
        if (bettingRoundClosed(engineState)) {
          // Betting round closed - reset feedback state so Continue button can proceed
          const currentState = useGameStore.getState();
          set({
            isCorrect: null,
            lastAction: null,
            feedback: null,
            evLoss: 0,
          });
          // CRITICAL: Do NOT auto-advance - user controls via Continue button
          // The ContinueButton component will handle progression
        } else {
          // Update action to face based on current bet and reset feedback
          const currentState = useGameStore.getState();
          if (currentState.currentBet > 0 && currentState.isPlayerTurn) {
            set({ 
              actionToFace: "bet",
              // Reset feedback state for new action
              isCorrect: null,
              lastAction: null,
              feedback: null,
              evLoss: 0,
            });
          } else if (currentState.currentBet === 0 && currentState.isPlayerTurn) {
            set({ 
              actionToFace: "check",
              // Reset feedback state for new action
              isCorrect: null,
              lastAction: null,
              feedback: null,
              evLoss: 0,
            });
          }
        }
      } catch (error) {
        console.error("Error in flawless villain engine:", error);
        // Fallback to legacy behavior only as last resort
        processOpponentActionsLegacy();
      }
    } else {
      // Use legacy behavior
      processOpponentActionsLegacy();
    }
    
    function processOpponentActionsLegacy() {
      if (state.gameStage === "preflop") return;
      
      // After player acts, simulate opponent responses and then advance to next street if betting round completes
      const activeOpponents = state.foldedPlayers
        .map((folded, seat) => !folded && seat !== state.playerSeat ? seat : null)
        .filter((seat): seat is number => seat !== null);
      
      if (activeOpponents.length === 0) {
        // No active opponents - CRITICAL: Do NOT auto-advance
        // User controls progression via Continue button
        return;
      }
      
      // Process first active opponent
      const opponentSeat = activeOpponents[0];
      
      // Use opponent's actual hand if available
      const opponentHand = state.opponentHands[opponentSeat] || {
        card1: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
        card2: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
      };
      
      // Get opponent's profile
      const opponentProfile = state.opponentProfiles.get(opponentSeat) || "BALANCED";
      const profileStats = getProfileStats(opponentProfile);
      
      const opponentAction = simulateRealisticPostflopAction(
        opponentHand,
        state.communityCards,
        state.gameStage,
        state.pot,
        state.currentBet,
        state.actionToFace,
        profileStats
      );
      
      const currentBetAmount = state.currentBet || 0;
      
      // Handle opponent fold
      if (opponentAction?.action === "fold" && opponentSeat !== null) {
        const updatedFolded = [...state.foldedPlayers];
        updatedFolded[opponentSeat] = true;
        set({ foldedPlayers: updatedFolded });
        
        // Check if any active opponents remain
        const remainingActive = updatedFolded.filter((folded, seat) => !folded && seat !== state.playerSeat).length;
        if (remainingActive === 0) {
          // Player wins, deal new hand
          // CRITICAL: Do NOT auto-advance - user controls via Continue button
          return;
        }
        
        // Continue betting round - CRITICAL: Do NOT auto-advance
        // User controls progression via Continue button
        return;
      }
      
      // Handle opponent bet - player must respond
      if (opponentAction?.action === "bet" && opponentSeat !== null) {
        const betSize = opponentAction.betSizeBB || Math.max(1, Math.round(state.pot * 0.5 * 10) / 10);
        const updatedBets = [...state.playerBetsBB];
        updatedBets[opponentSeat] = betSize;
        
        set({
          actionToFace: "bet",
          isPlayerTurn: true,
          pot: roundBB(state.pot + betSize),
          currentBet: betSize,
          playerBetsBB: updatedBets,
          lastActorSeat: opponentSeat,
          // Reset feedback state for new action
          isCorrect: null,
          lastAction: null,
          feedback: null,
          evLoss: 0,
        });
        return;
      }
      
      // Handle opponent raise - player must respond
      if (opponentAction?.action === "raise" && opponentSeat !== null) {
        const raiseSize = opponentAction.betSizeBB || Math.max(currentBetAmount * 2, Math.round(state.pot * 0.67 * 10) / 10);
        const updatedBets = [...state.playerBetsBB];
        updatedBets[opponentSeat] = raiseSize;
        
        set({
          actionToFace: "raise",
          isPlayerTurn: true,
          pot: roundBB(state.pot + raiseSize),
          currentBet: raiseSize,
          playerBetsBB: updatedBets,
          lastActorSeat: opponentSeat,
          // Reset feedback state for new action
          isCorrect: null,
          lastAction: null,
          feedback: null,
          evLoss: 0,
        });
        return;
      }
      
      // Handle opponent call/check - betting round completes
      if (opponentAction?.action === "call" && opponentSeat !== null) {
        const callAmount = currentBetAmount || 0;
        const updatedBets = [...state.playerBetsBB];
        updatedBets[opponentSeat] = callAmount;
        set({
          pot: roundBB(state.pot + callAmount),
          playerBetsBB: updatedBets,
          lastActorSeat: opponentSeat,
          // Reset feedback state so Continue button can proceed
          isCorrect: null,
          lastAction: null,
          feedback: null,
          evLoss: 0,
        });
      } else if (opponentAction?.action === "check") {
        // Opponent checks - betting round completes
        set({
          // Reset feedback state so Continue button can proceed
          isCorrect: null,
          lastAction: null,
          feedback: null,
          evLoss: 0,
        });
      }
      
      // Betting round completes - CRITICAL: Do NOT auto-advance
      // User controls progression via Continue button
      // Continue button will call advanceToNextStreet when ready
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
      // River complete - CRITICAL: Do NOT auto-advance
      // User controls progression via Continue button
      return;
    }

    // Determine action order based on position
    const isPlayerFirst = getIsPlayerFirst(state.playerPosition, state.numPlayers);
    
    const updatedCommunityCards = nextStage === "flop" 
      ? newCommunityCards 
      : [...state.communityCards, ...newCommunityCards];
    
    // Reset all bets for new street (but keep folded players tracked)
    const resetBets = Array(state.numPlayers).fill(0);
    
    // If using solver engine, properly reset betting state
    if (state.useSolverEngine) {
      try {
        const engineState = convertToActionEngineState();
        engineState.street = nextStage;
        engineState.communityCards = updatedCommunityCards;
        resetBettingForNewStreet(engineState);
        applyActionEngineStateToStore(engineState);
      } catch (error) {
        console.error("Error resetting betting for new street:", error);
        // Fallback to manual reset
      }
    }
    
    // Set actionToFace based on whether player acts first
    // If player acts first, they can check or bet (actionToFace: "check")
    // If player acts second, opponent may have bet (will be set below)
    const initialActionToFace = isPlayerFirst ? "check" : null;
    
    set({
      gameStage: nextStage,
      communityCards: updatedCommunityCards,
      actionToFace: initialActionToFace,
      isPlayerTurn: isPlayerFirst,
      canSelectRange: true, // Allow range selection when not actively making a decision
      currentBet: 0,
      playerBetsBB: resetBets,
      lastActorSeat: null, // Reset last actor for new street
      // Reset feedback state for new action
      isCorrect: null,
      lastAction: null,
      feedback: null,
      evLoss: 0,
      isPausedForReview: false, // CRITICAL: Unpause when advancing street
      // Don't close feedback modal if it's open - let user close it manually
      // showFeedbackModal: state.showFeedbackModal, // Keep current state
    });

    // If player acts second, simulate opponent action first
    if (!isPlayerFirst) {
      // Process opponent action immediately (no delay)
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
        
        // Use opponent's actual hand if available
        const opponentHand = currentState.opponentHands[opponentSeat] || {
          card1: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
          card2: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
        };
        
        // Get opponent's profile
        const opponentProfile = currentState.opponentProfiles.get(opponentSeat) || "BALANCED";
        const profileStats = getProfileStats(opponentProfile);
        
        const opponentAction = simulateRealisticPostflopAction(
          opponentHand,
          updatedCommunityCards,
          nextStage,
          currentState.pot,
          0, // No current bet on new street
          null, // No action to face
          profileStats
        );
        
        if (opponentAction?.action === "bet" && opponentSeat !== null) {
          const betSize = opponentAction.betSizeBB || Math.max(1, Math.round(currentState.pot * 0.5 * 10) / 10); // At least 1 BB
          const updatedBets = [...resetBets];
          updatedBets[opponentSeat] = betSize;
          
          useGameStore.setState({
            actionToFace: "bet",
            isPlayerTurn: true,
            pot: roundBB(currentState.pot + betSize),
            currentBet: betSize,
            playerBetsBB: updatedBets, // Show opponent's bet visually
            lastActorSeat: opponentSeat,
            // Reset feedback state for new action
            isCorrect: null,
            lastAction: null,
            feedback: null,
            evLoss: 0,
          });
        } else if (opponentAction?.action === "fold" && opponentSeat !== null) {
          // Opponent folds on new street
          const updatedFolded = [...currentState.foldedPlayers];
          updatedFolded[opponentSeat] = true;
          useGameStore.setState({
            foldedPlayers: updatedFolded,
            actionToFace: "check",
            isPlayerTurn: true,
            canSelectRange: false, // Lock range selection when it's player's turn
            // Reset feedback state for new action
            isCorrect: null,
            lastAction: null,
            feedback: null,
            evLoss: 0,
          });
        } else {
          // Opponent checks, player can act
          useGameStore.setState({
            actionToFace: "check",
            isPlayerTurn: true,
            canSelectRange: false, // Lock range selection when it's player's turn
            // Reset feedback state for new action
            isCorrect: null,
            lastAction: null,
            feedback: null,
            evLoss: 0,
          });
        }
      // No setTimeout - process immediately
    }
  },

  // Close feedback modal (legacy - now handled by Continue button)
  closeFeedbackModal: () => {
    const state = useGameStore.getState();
    set({
      showFeedbackModal: false,
    });
    
    // CRITICAL: Do NOT auto-advance - user controls via Continue button
    // This function is kept for backward compatibility but doesn't auto-advance
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
      foldedPlayers: [],
      lastActorSeat: null,
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
      opponentStats: DEFAULT_OPPONENT_STATS,
    });
  },

  // Load custom opponent statistics
  loadOpponentStats: (jsonData: string) => {
    const stats = loadOpponentStats(jsonData);
    set({ opponentStats: stats });
  },
  
  // Training feature actions (opt-in, never blocks input)
  toggleHandInRange: (hand: string) => {
    const state = useGameStore.getState();
    const newRange = new Set(state.customRange);
    if (newRange.has(hand)) {
      newRange.delete(hand);
    } else {
      newRange.add(hand);
    }
    set({ customRange: newRange });
  },
  
  setUseCustomRange: (enabled: boolean) => {
    set({ useCustomRange: enabled });
  },
  
  setShowEVPanel: (show: boolean) => {
    set({ showEVPanel: show });
  },
  
  setShowPlayerHand: (show: boolean) => {
    set({ showPlayerHand: show });
  },
  
  setCanSelectRange: (canSelect: boolean) => {
    set({ canSelectRange: canSelect });
  },
  
  setPausedForReview: (paused: boolean) => {
    set({ isPausedForReview: paused });
  },
  
  userClickedContinue: () => {
    const state = useGameStore.getState();
    // Unpause and allow progression
    set({ isPausedForReview: false });
  },
}));

