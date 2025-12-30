import { create } from "zustand";
import { Hand, Action, Position, generateRandomHand, getGTOAction, getPositionFromSeat, Card } from "@/lib/gto";
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
  currentHandId: string | null; // Track current hand for data collection
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
  currentHandId: null,

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
    
    // Generate all hands at once to ensure no duplicate cards
    // Use weighted generation for player hand (more playable hands)
    const allHands = generateUniqueHands(numPlayers, [], true);
    const playerHand = allHands[playerSeat];
    
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
    
    // Calculate initial pot (blinds)
    const initialPot = 1.5; // SB + BB
    
    // Generate unique hand ID for tracking (include session ID for analytics)
    const sessionManager = getSessionManager();
    const sessionId = sessionManager.getCurrentSessionId() || "no-session";
    const handId = `${sessionId}-hand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
      
      // Use realistic opponent simulation based on position and their actual hand
      const seatPosition = seatToPosition.get(actingSeat);
      if (!seatPosition) continue;
      
      // Get opponent's actual hand
      const opponentHand = allHands[actingSeat];
      
      // Use GTO to determine optimal action based on their actual hand
      // This makes opponents play optimally based on their cards
      let opponentAction: "fold" | "call" | "raise";
      
      if (opponentHand) {
        // Check what GTO says for this hand in this position
        const gtoResult = getGTOAction(opponentHand, seatPosition, "call", numPlayers);
        
        // More realistic opponent play based on GTO
        // If GTO says fold, fold often but not always (80% fold rate - some players call with bad hands)
        if (gtoResult.optimalActions.includes("fold")) {
          opponentAction = Math.random() < 0.80 ? "fold" : "call";
        } 
        // If GTO says raise/all-in, raise more often (70% raise rate - some slowplay)
        else if (gtoResult.optimalActions.includes("raise") || gtoResult.optimalActions.includes("all-in")) {
          opponentAction = Math.random() < 0.70 ? "raise" : "call";
        }
        // Otherwise call (GTO says call) - but sometimes raise for value
        else {
          const rand = Math.random();
          if (rand < 0.65) {
            opponentAction = "call";
          } else if (rand < 0.85) {
            opponentAction = "fold"; // Some players fold calling hands
          } else {
            opponentAction = "raise"; // Some players raise for value
          }
        }
      } else {
        // Fallback to position-based simulation
        opponentAction = simulateRealisticPreflopAction(
          seatPosition,
          finalCurrentBet,
          state.opponentStats
        );
      }
      
      const previousBet = finalBets[actingSeat] || 0;
      
      if (opponentAction === "raise" && actingSeat !== smallBlindSeat && actingSeat !== bigBlindSeat) {
        // Opponent raises (2.5x to 4x BB) - more realistic sizing
        const raiseSize = Math.round(INITIAL_BIG_BLIND * (2.5 + Math.random() * 1.5) * 10) / 10;
        finalBets[actingSeat] = raiseSize;
        finalCurrentBet = raiseSize;
        // Add the additional amount to pot (raiseSize - previousBet)
        finalPot += raiseSize - previousBet;
        finalActionToFace = "call";
        // More raises = harder decisions for player
      } else if (opponentAction === "call") {
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
      // Opponent folds - mark as folded and clear their hand
      if (actingSeat !== smallBlindSeat && actingSeat !== bigBlindSeat) {
        // Non-blind player folds - their bet stays in pot (already counted)
        finalBets[actingSeat] = 0;
      }
      // If SB/BB folds, their blind stays in pot
      // Note: We keep their hand visible even if folded (for learning purposes)
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
      activePlayers: numPlayers,
      foldedPlayers: Array(numPlayers).fill(false), // Initialize all players as active
      lastActorSeat: null,
      lastAction: null,
      opponentStats: state.opponentStats, // Preserve opponent stats
      currentHandId: handId, // Track current hand
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
        // Mark player as folded
        const updatedFolded = [...state.foldedPlayers];
        updatedFolded[state.playerSeat] = true;
        set({ foldedPlayers: updatedFolded });
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
        lastActorSeat: state.playerSeat, // Track who just acted
        // Only keep bet sizing analysis if action was actually a raise
        betSizeAnalysis: (action === "raise" && betSizeBB) ? state.betSizeAnalysis : null,
        postFlopBetSizeAnalysis: null, // Clear post-flop bet sizing on preflop action
        betSizeBB: (action === "raise" && betSizeBB) ? betSizeBB : null, // Only keep betSizeBB if action was raise
      });

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
          betSizeBB: (action === "raise" && betSizeBB) ? betSizeBB : undefined,
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
      
      if (postFlopAction === "call" && state.actionToFace === "bet") {
        // Call the current bet
        const callAmount = state.currentBet;
        updatedBets[state.playerSeat] = callAmount;
        newPot += callAmount - previousBet; // Add the additional amount to pot
      } else if (postFlopAction === "bet" || (postFlopAction === "raise" && betSizeBB)) {
        // Bet or raise
        const betAmount = betSizeBB || state.currentBet;
        updatedBets[state.playerSeat] = betAmount;
        newPot += betAmount - previousBet; // Add the additional amount to pot
        set({ currentBet: betAmount });
      } else if (postFlopAction === "check") {
        // Check - no bet change
        updatedBets[state.playerSeat] = 0;
      } else if (postFlopAction === "fold") {
        // Fold - bet stays at 0, mark player as folded
        updatedBets[state.playerSeat] = 0;
        const updatedFolded = [...state.foldedPlayers];
        updatedFolded[state.playerSeat] = true;
        set({ foldedPlayers: updatedFolded });
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
        pot: newPot, // Update pot with new bet amounts
        lastActorSeat: state.playerSeat, // Track who just acted
        // Only keep bet sizing analysis if action was actually a bet or raise
        betSizeAnalysis: null, // Clear preflop bet sizing on post-flop action
        postFlopBetSizeAnalysis: ((postFlopAction === "bet" || postFlopAction === "raise") && betSizeBB) ? state.postFlopBetSizeAnalysis : null,
        betSizeBB: ((postFlopAction === "bet" || postFlopAction === "raise") && betSizeBB) ? betSizeBB : null, // Only keep betSizeBB if action was bet/raise
      });

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
          betSizeBB: ((postFlopAction === "bet" || postFlopAction === "raise") && betSizeBB) ? betSizeBB : undefined,
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

  // Process opponent actions (legacy function - logic moved to closeFeedbackModal)
  processOpponentActions: () => {
    const state = useGameStore.getState();
    if (state.gameStage === "preflop") return;
    
    // This function is kept for backwards compatibility but logic is handled in closeFeedbackModal
    // After player acts, simulate opponent responses and then advance to next street
    const activeOpponents = state.foldedPlayers
      .map((folded, seat) => !folded && seat !== state.playerSeat ? seat : null)
      .filter((seat): seat is number => seat !== null);
    
    if (activeOpponents.length === 0) {
      state.advanceToNextStreet();
      return;
    }
    
    const opponentSeat = activeOpponents[0];
    
    // Generate opponent hand for simulation
    const opponentHand: Hand = {
      card1: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
      card2: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
    };
    
    const opponentAction = simulateRealisticPostflopAction(
      opponentHand,
      state.communityCards,
      state.gameStage,
      state.pot,
      state.currentBet,
      state.actionToFace,
      state.opponentStats
    );
    
    if (opponentAction?.action === "bet" && opponentSeat !== null) {
      const betSize = opponentAction.betSizeBB || Math.max(1, Math.round(state.pot * 0.5 * 10) / 10);
      const updatedBets = [...state.playerBetsBB];
      updatedBets[opponentSeat] = betSize;
      
      set({
        actionToFace: "bet",
        isPlayerTurn: true,
        pot: state.pot + betSize,
        currentBet: betSize,
        playerBetsBB: updatedBets,
        lastActorSeat: opponentSeat,
      });
    } else {
      setTimeout(() => {
        state.advanceToNextStreet();
      }, 500);
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
    
    // Reset all bets for new street (but keep folded players tracked)
    const resetBets = Array(state.numPlayers).fill(0);
    
    set({
      gameStage: nextStage,
      communityCards: updatedCommunityCards,
      actionToFace: null,
      isPlayerTurn: isPlayerFirst,
      currentBet: 0,
      playerBetsBB: resetBets,
      lastActorSeat: null, // Reset last actor for new street
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
        
        // Use opponent's actual hand if available
        const opponentHand = currentState.opponentHands[opponentSeat] || {
          card1: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
          card2: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
        };
        
        const opponentAction = simulateRealisticPostflopAction(
          opponentHand,
          updatedCommunityCards,
          nextStage,
          currentState.pot,
          0, // No current bet on new street
          null, // No action to face
          currentState.opponentStats
        );
        
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
            lastActorSeat: opponentSeat,
          });
        } else if (opponentAction?.action === "fold" && opponentSeat !== null) {
          // Opponent folds on new street
          const updatedFolded = [...currentState.foldedPlayers];
          updatedFolded[opponentSeat] = true;
          useGameStore.setState({
            foldedPlayers: updatedFolded,
            actionToFace: "check",
            isPlayerTurn: true,
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
        // Continue hand - complete betting round then advance
        // After player acts, simulate opponent response, then advance to next street
        setTimeout(() => {
          const currentState = useGameStore.getState();
          const activeOpponents = currentState.foldedPlayers
            .map((folded, seat) => !folded && seat !== currentState.playerSeat ? seat : null)
            .filter((seat): seat is number => seat !== null);
          
          if (activeOpponents.length === 0) {
            // No active opponents, advance immediately
            currentState.advanceToNextStreet();
            return;
          }
          
          // Simulate realistic opponent action based on their actual hand
          // Use their actual hand from opponentHands if available
          const opponentSeat = activeOpponents[0];
          const opponentHand = currentState.opponentHands[opponentSeat];
          
          if (!opponentHand) {
            // Fallback: generate random hand if not available
            const fallbackHand: Hand = {
              card1: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
              card2: { rank: ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)], suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)] },
            };
            
            // Update opponent hands if missing
            const updatedOpponentHands = [...currentState.opponentHands];
            updatedOpponentHands[opponentSeat] = fallbackHand;
            useGameStore.setState({ opponentHands: updatedOpponentHands });
            
            const opponentAction = simulateRealisticPostflopAction(
              fallbackHand,
              currentState.communityCards,
              currentState.gameStage,
              currentState.pot,
              currentState.currentBet,
              currentState.actionToFace,
              currentState.opponentStats
            );
            
            // Continue with rest of logic...
            const currentBetAmount = currentState.currentBet || 0;
            
            // Check if opponent folds
            if (opponentAction?.action === "fold" && opponentSeat !== null) {
              const updatedFolded = [...currentState.foldedPlayers];
              updatedFolded[opponentSeat] = true;
              useGameStore.setState({ foldedPlayers: updatedFolded });
              
              const remainingActive = updatedFolded.filter((folded, seat) => !folded && seat !== currentState.playerSeat).length;
              if (remainingActive === 0) {
                setTimeout(() => {
                  currentState.dealNewHand();
                }, 1000);
                return;
              }
              
              setTimeout(() => {
                currentState.advanceToNextStreet();
              }, 800);
              return;
            }
            
            // Check if opponent raises significantly
            const opponentRaises = opponentAction?.action === "bet" && 
              opponentAction.betSizeBB && 
              opponentAction.betSizeBB > currentBetAmount * 1.5;
            
            if (opponentRaises && opponentSeat !== null && Math.random() < 0.25) {
              const betSize = opponentAction.betSizeBB;
              const updatedBets = [...currentState.playerBetsBB];
              updatedBets[opponentSeat] = betSize;
              
              useGameStore.setState({
                actionToFace: "bet",
                isPlayerTurn: true,
                pot: currentState.pot + betSize,
                currentBet: betSize,
                playerBetsBB: updatedBets,
                lastActorSeat: opponentSeat,
              });
            } else {
              if (opponentAction?.action === "bet" && opponentSeat !== null) {
                const betSize = opponentAction.betSizeBB || currentBetAmount;
                const updatedBets = [...currentState.playerBetsBB];
                updatedBets[opponentSeat] = betSize;
                useGameStore.setState({
                  pot: currentState.pot + betSize,
                  playerBetsBB: updatedBets,
                  lastActorSeat: opponentSeat,
                });
              }
              setTimeout(() => {
                currentState.advanceToNextStreet();
              }, 800);
            }
            return;
          }
          
          const opponentAction = simulateRealisticPostflopAction(
            opponentHand,
            currentState.communityCards,
            currentState.gameStage,
            currentState.pot,
            currentState.currentBet,
            currentState.actionToFace,
            currentState.opponentStats
          );
          const currentBetAmount = currentState.currentBet || 0;
          
          // Check if opponent folds
          if (opponentAction?.action === "fold" && opponentSeat !== null) {
            // Opponent folds - mark as folded and advance if no more active opponents
            const updatedFolded = [...currentState.foldedPlayers];
            updatedFolded[opponentSeat] = true;
            useGameStore.setState({ foldedPlayers: updatedFolded });
            
            // Check if any active opponents remain
            const remainingActive = updatedFolded.filter((folded, seat) => !folded && seat !== currentState.playerSeat).length;
            if (remainingActive === 0) {
              // Player wins, deal new hand
              setTimeout(() => {
                currentState.dealNewHand();
              }, 1000);
              return;
            }
            
            // Continue with betting round
            setTimeout(() => {
              currentState.advanceToNextStreet();
            }, 800);
            return;
          }
          
          // Check if opponent raises significantly
          const opponentRaises = opponentAction?.action === "bet" && 
            opponentAction.betSizeBB && 
            opponentAction.betSizeBB > currentBetAmount * 1.5; // Significant raise > 50% of current bet
          
          if (opponentRaises && opponentSeat !== null && Math.random() < 0.25) {
            // Opponent raises (30% chance) - player needs to respond one more time
            const betSize = opponentAction.betSizeBB;
            const updatedBets = [...currentState.playerBetsBB];
            updatedBets[opponentSeat] = betSize;
            
            useGameStore.setState({
              actionToFace: "bet",
              isPlayerTurn: true,
              pot: currentState.pot + betSize,
              currentBet: betSize,
              playerBetsBB: updatedBets,
              lastActorSeat: opponentSeat,
            });
          } else {
            // Opponent calls/checks (70% chance) - betting round completes, advance to next street
            // Update pot with any call amount
            if (opponentAction?.action === "bet" && opponentSeat !== null) {
              const betSize = opponentAction.betSizeBB || currentBetAmount;
              const updatedBets = [...currentState.playerBetsBB];
              updatedBets[opponentSeat] = betSize;
              useGameStore.setState({
                pot: currentState.pot + betSize,
                playerBetsBB: updatedBets,
                lastActorSeat: opponentSeat,
              });
            }
            // Advance to next street after a short delay
            setTimeout(() => {
              currentState.advanceToNextStreet();
            }, 800);
          }
        }, 500);
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
}));

