"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import { generateRandomHand, Hand, Position, getPositionFromSeat, Card, formatHand } from "@/lib/gto";
import { getAdjustedGTOAction } from "@/lib/gto-table-size";
import { getPostFlopGTOAction, GameStage, generateCommunityCards, evaluateHandStrength } from "@/lib/postflop-gto";
import { Card as UICard } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PokerCard } from "./poker-card";

/**
 * Estimate preflop hand strength (0-1 scale)
 */
function estimatePreflopHandStrength(hand: Hand, position: Position, numPlayers: number): number {
  const handString = formatHand(hand);
  const rank1 = hand.card1.rank;
  const rank2 = hand.card2.rank;
  const suit1 = hand.card1.suit;
  const suit2 = hand.card2.suit;
  const isPair = rank1 === rank2;
  const isSuited = suit1 === suit2;
  
  const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const rank1Value = rankOrder.indexOf(rank1);
  const rank2Value = rankOrder.indexOf(rank2);
  const highRankValue = Math.max(rank1Value, rank2Value);
  const lowRankValue = Math.min(rank1Value, rank2Value);
  
  let strength = 0.5; // Base strength
  
  if (isPair) {
    // Pairs: higher pairs are stronger
    strength = 0.4 + (highRankValue / 13) * 0.5; // 0.4 to 0.9
  } else {
    // Non-pairs: consider ranks and suitedness
    const isAce = rank1 === "A" || rank2 === "A";
    const isBroadway = highRankValue >= rankOrder.indexOf("T");
    const gap = highRankValue - lowRankValue;
    
    if (isAce && isBroadway) {
      // Ace-high broadway (AT+, AK, AQ, AJ)
      strength = isSuited ? 0.75 : 0.65;
    } else if (isAce) {
      // Ace with lower kicker
      strength = isSuited ? 0.55 : 0.45;
    } else if (isBroadway && gap <= 4) {
      // Broadway hands (KQ, KJ, QJ, etc.)
      strength = isSuited ? 0.6 : 0.5;
    } else if (gap <= 3 && highRankValue >= rankOrder.indexOf("7")) {
      // Connected or near-connected hands
      strength = isSuited ? 0.5 : 0.4;
    } else {
      // Weak hands
      strength = isSuited ? 0.4 : 0.3;
    }
  }
  
  // Adjust for position (late position = slightly better)
  const positionValue = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"].indexOf(position);
  const positionBonus = (6 - positionValue) / 6 * 0.05; // Up to 5% bonus for late position
  strength += positionBonus;
  
  // Adjust for table size (fewer players = stronger hands needed)
  const tableSizePenalty = (numPlayers - 2) / 7 * 0.05; // Up to 5% penalty for more players
  strength -= tableSizePenalty;
  
  return Math.max(0.2, Math.min(0.95, strength));
}

/**
 * Calculate Expected Value (EV) for a poker action
 */
function calculateEV(
  action: string,
  handStrength: number,
  pot: number,
  currentBet: number,
  stack: number,
  stage: GameStage,
  position: Position,
  numPlayers: number,
  hand?: Hand
): number {
  // Fold always has 0 EV (you lose nothing, gain nothing)
  if (action === "fold") {
    return 0;
  }

  // For preflop, estimate hand strength if not provided
  let equity = handStrength;
  if (stage === "preflop" && hand) {
    equity = estimatePreflopHandStrength(hand, position, numPlayers);
  } else {
    // Estimate equity based on hand strength
    // Hand strength is 0-1, but we need to convert to win probability
    // Strong hands have higher equity, but also consider position and stage
    equity = handStrength;
    
    // Adjust equity based on position (late position = slightly better)
    const positionMultiplier = ["UTG", "UTG+1", "MP", "CO", "BTN", "SB", "BB"].indexOf(position) / 6;
    equity = equity * (0.9 + positionMultiplier * 0.1);
    
    // Adjust equity based on stage (later stages = more certain)
    const stageMultiplier = { preflop: 0.8, flop: 0.9, turn: 0.95, river: 1.0 }[stage];
    equity = equity * stageMultiplier;
  }
  
  // Clamp equity between 0.1 and 0.9 (never 0% or 100% in poker)
  equity = Math.max(0.1, Math.min(0.9, equity));

  if (action === "call") {
    // EV = (Pot + Bet) * Equity - Bet
    // If we call, we're investing currentBet to win pot + currentBet
    const totalPot = pot + currentBet;
    const ev = totalPot * equity - currentBet;
    return ev;
  }

  if (action === "check") {
    // Checking has no cost, but we might win the pot if opponent folds
    // Simplified: EV = Pot * Equity (no investment, but we might win)
    // Actually, checking is usually 0 EV unless we're ahead, then it's positive
    // For simplicity, if we have a strong hand, checking has positive EV
    if (handStrength >= 0.5) {
      return pot * equity * 0.5; // Conservative estimate
    }
    return 0;
  }

  if (action === "bet") {
    // Betting: we invest betAmount, but have fold equity
    // Typical bet size: 2/3 pot
    const betAmount = pot * 0.67;
    
    // Fold equity: estimate based on hand strength and position
    // Strong hands get called more, weak hands get folded to more
    const foldEquity = handStrength < 0.4 ? 0.6 : handStrength < 0.6 ? 0.4 : 0.2;
    
    // EV = FoldEquity * Pot + (1 - FoldEquity) * [(Pot + Bet) * Equity - Bet]
    const evWhenFolded = pot * foldEquity;
    const evWhenCalled = (pot + betAmount) * equity - betAmount;
    const ev = evWhenFolded + evWhenCalled * (1 - foldEquity);
    
    return ev;
  }

  if (action === "raise") {
    // Raising: similar to betting but larger
    // Minimum raise: 2x current bet, typical: 2.5x current bet
    const raiseAmount = currentBet > 0 ? currentBet * 2.5 : pot * 0.67;
    
    // Higher fold equity for raises (more aggressive)
    const foldEquity = handStrength < 0.4 ? 0.7 : handStrength < 0.6 ? 0.5 : 0.3;
    
    // EV = FoldEquity * Pot + (1 - FoldEquity) * [(Pot + Raise) * Equity - Raise]
    const evWhenFolded = pot * foldEquity;
    const evWhenCalled = (pot + raiseAmount) * equity - raiseAmount;
    const ev = evWhenFolded + evWhenCalled * (1 - foldEquity);
    
    return ev;
  }

  return 0;
}

export function GameStateSimulator() {
  const { dealNewHand, numPlayers } = useGameStore();
  
  // Simulator has its own state for testing different scenarios
  const [simHand, setSimHand] = useState<Hand | null>(null);
  const [simStage, setSimStage] = useState<GameStage>("preflop");
  const [simCommunityCards, setSimCommunityCards] = useState<Card[]>([]);
  const [simPot, setSimPot] = useState<number>(1.5);
  const [simCurrentBet, setSimCurrentBet] = useState<number>(2);
  const [simStack, setSimStack] = useState<number>(100);
  const [simPosition, setSimPosition] = useState<Position>("BTN");
  const [simNumPlayers, setSimNumPlayers] = useState<number>(6);
  
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [simulatedActions, setSimulatedActions] = useState<string[]>([]);
  const [simulatedOutcomes, setSimulatedOutcomes] = useState<{
    action: string;
    pot: number;
    stack: number;
    ev: number;
    feedback: string;
    isCorrect: boolean;
  }[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null);
  
  // Initialize with current game state or create new
  const currentHand = simHand || useGameStore.getState().playerHand;
  const currentStage = simStage || useGameStore.getState().gameStage;
  const currentCommunityCards = simCommunityCards.length > 0 ? simCommunityCards : useGameStore.getState().communityCards;
  const currentPot = simPot || useGameStore.getState().pot;
  const currentBet = simCurrentBet || useGameStore.getState().currentBet;
  const currentStack = simStack || useGameStore.getState().playerStackBB;
  const currentPosition = simPosition || useGameStore.getState().playerPosition;
  const currentNumPlayers = simNumPlayers || numPlayers;

  const redealHand = () => {
    const newHand = generateRandomHand();
    const newPosition = getPositionFromSeat(Math.floor(Math.random() * currentNumPlayers), currentNumPlayers);
    setSimHand(newHand);
    setSimStage("preflop");
    setSimCommunityCards([]);
    setSimPot(1.5);
    setSimCurrentBet(2);
    setSimStack(100);
    setSimPosition(newPosition);
    resetSimulation();
  };

  const advanceToStage = (stage: GameStage | "random") => {
    if (!currentHand) return;
    
    let targetStage: GameStage = stage;
    if (stage === "random") {
      const stages: GameStage[] = ["preflop", "flop", "turn", "river"];
      targetStage = stages[Math.floor(Math.random() * stages.length)];
    }
    
    let newCommunityCards: Card[] = [];
    
    const usedCards: Card[] = [currentHand.card1, currentHand.card2];
    
    if (targetStage === "flop") {
      newCommunityCards = generateCommunityCards(usedCards, "flop");
    } else if (targetStage === "turn") {
      const flopCards = generateCommunityCards(usedCards, "flop");
      const allCards = [...usedCards, ...flopCards];
      const turnCard = generateCommunityCards(allCards, "turn");
      newCommunityCards = [...flopCards, ...turnCard];
    } else if (targetStage === "river") {
      const flopCards = generateCommunityCards(usedCards, "flop");
      const allCardsAfterFlop = [...usedCards, ...flopCards];
      const turnCard = generateCommunityCards(allCardsAfterFlop, "turn");
      const allCardsAfterTurn = [...allCardsAfterFlop, ...turnCard];
      const riverCard = generateCommunityCards(allCardsAfterTurn, "river");
      newCommunityCards = [...flopCards, ...turnCard, ...riverCard];
    }
    
    setSimStage(targetStage);
    setSimCommunityCards(newCommunityCards);
    setSimPot(targetStage === "preflop" ? 1.5 : 10);
    setSimCurrentBet(targetStage === "preflop" ? 2 : 0);
    resetSimulation();
  };

  const simulateAction = (action: string) => {
    if (!currentHand) return;
    
    // Calculate hand strength
    const handStrength = currentStage === "preflop" 
      ? estimatePreflopHandStrength(currentHand, currentPosition, currentNumPlayers)
      : evaluateHandStrength(currentHand, currentCommunityCards, currentStage);
    
    // Calculate EV for all possible actions
    const possibleActions = currentStage === "preflop" 
      ? ["fold", "call", "raise"]
      : currentBet > 0
        ? ["fold", "call", "raise"]
        : ["check", "bet"];
    
    const evs: Record<string, number> = {};
    possibleActions.forEach(act => {
      evs[act] = calculateEV(
        act,
        handStrength,
        currentPot,
        currentBet,
        currentStack,
        currentStage,
        currentPosition,
        currentNumPlayers,
        currentHand
      );
    });
    
    // Find the action with highest EV
    const bestAction = Object.entries(evs).reduce((best, [act, ev]) => 
      ev > best.ev ? { action: act, ev } : best,
      { action: "fold", ev: -Infinity }
    );
    
    // Determine if chosen action is correct
    // Correct if: EV is positive and highest, OR if all EVs are negative then fold is correct
    const allNegative = Object.values(evs).every(ev => ev < 0);
    const chosenEV = evs[action] || 0;
    const isCorrect = allNegative 
      ? action === "fold" || chosenEV >= bestAction.ev * 0.9 // Within 10% of best
      : chosenEV >= bestAction.ev * 0.9 && chosenEV > 0; // Within 10% of best and positive
    
    // Generate feedback
    let feedback = "";
    if (isCorrect) {
      if (chosenEV > 0) {
        feedback = `✓ Correct! ${action.charAt(0).toUpperCase() + action.slice(1)} has an EV of ${chosenEV.toFixed(2)} BB, which is optimal given your hand strength and position.`;
      } else {
        feedback = `✓ Correct! ${action.charAt(0).toUpperCase() + action.slice(1)} is the best option when all actions have negative EV.`;
      }
    } else {
      const bestActionName = bestAction.action.charAt(0).toUpperCase() + bestAction.action.slice(1);
      if (chosenEV < 0) {
        feedback = `✗ Incorrect. ${action.charAt(0).toUpperCase() + action.slice(1)} has a negative EV of ${chosenEV.toFixed(2)} BB. ${bestActionName} would be better with EV of ${bestAction.ev.toFixed(2)} BB.`;
      } else {
        feedback = `✗ Suboptimal. ${action.charAt(0).toUpperCase() + action.slice(1)} has EV of ${chosenEV.toFixed(2)} BB, but ${bestActionName} would be better with EV of ${bestAction.ev.toFixed(2)} BB.`;
      }
    }
    
    setCurrentFeedback(feedback);
    
    const newActions = [...simulatedActions, action];
    setSimulatedActions(newActions);
    
    // Calculate outcomes for each action
    let runningPot = currentPot;
    let runningStack = currentStack;
    let runningBet = currentBet;
    
    const outcomes = newActions.map((act, index) => {
      // Calculate actual EV for this action
      const actionEV = calculateEV(
        act,
        handStrength,
        runningPot,
        runningBet,
        runningStack,
        currentStage,
        currentPosition,
        currentNumPlayers,
        currentHand
      );
      
      // Update running totals
      if (act === "call") {
        runningPot += runningBet;
        runningStack -= runningBet;
        runningBet = 0;
      } else if (act === "bet") {
        const betAmount = runningPot * 0.67;
        runningPot += betAmount;
        runningStack -= betAmount;
        runningBet = betAmount;
      } else if (act === "raise") {
        const raiseAmount = runningBet > 0 ? runningBet * 2.5 : runningPot * 0.67;
        runningPot += raiseAmount;
        runningStack -= raiseAmount;
        runningBet = raiseAmount;
      } else if (act === "check") {
        runningBet = 0;
      }
      
      // Determine correctness for this action
      const actionEVs: Record<string, number> = {};
      const actionsAtThisPoint = currentStage === "preflop" 
        ? ["fold", "call", "raise"]
        : runningBet > 0
          ? ["fold", "call", "raise"]
          : ["check", "bet"];
      
      actionsAtThisPoint.forEach(a => {
        actionEVs[a] = calculateEV(
          a,
          handStrength,
          runningPot,
          runningBet,
          runningStack,
          currentStage,
          currentPosition,
          currentNumPlayers,
          currentHand
        );
      });
      
      const bestActionAtPoint = Object.entries(actionEVs).reduce((best, [a, ev]) => 
        ev > best.ev ? { action: a, ev } : best,
        { action: "fold", ev: -Infinity }
      );
      
      const allNegativeAtPoint = Object.values(actionEVs).every(ev => ev < 0);
      const actionCorrect = allNegativeAtPoint
        ? act === "fold" || actionEV >= bestActionAtPoint.ev * 0.9
        : actionEV >= bestActionAtPoint.ev * 0.9 && actionEV > 0;
      
      return { 
        action: act, 
        pot: runningPot, 
        stack: runningStack, 
        ev: actionEV,
        feedback: actionCorrect 
          ? `EV: ${actionEV.toFixed(2)} BB (optimal)`
          : `EV: ${actionEV.toFixed(2)} BB (best: ${bestActionAtPoint.action} with ${bestActionAtPoint.ev.toFixed(2)} BB)`,
        isCorrect: actionCorrect
      };
    });
    
    setSimulatedOutcomes(outcomes);
    setSimulationStep(newActions.length - 1);
  };

  const resetSimulation = () => {
    setSimulatedActions([]);
    setSimulatedOutcomes([]);
    setSimulationStep(0);
    setCurrentFeedback(null);
  };

  const currentOutcome = simulatedOutcomes[simulationStep];

  if (!currentHand) {
    return (
      <UICard className="p-6 bg-gray-800/50 border-gray-700">
        <div className="text-center space-y-4">
          <div className="text-gray-400">
            No hand loaded. Deal a new hand to start simulating.
          </div>
          <Button
            onClick={redealHand}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Deal New Hand
          </Button>
        </div>
      </UICard>
    );
  }

  return (
    <UICard className="p-6 bg-gray-800/50 border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Game State Simulator</h2>
        <div className="flex gap-2">
          <Button
            onClick={redealHand}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            Redeal Hand
          </Button>
          <Button
            onClick={resetSimulation}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300"
          >
            Reset Simulation
          </Button>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Simulate different actions to see how they affect pot size, stack, and expected value.
      </p>

      {/* Stage Selector */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Select Stage</h3>
        <div className="flex gap-2 flex-wrap">
          {(["preflop", "flop", "turn", "river", "random"] as (GameStage | "random")[]).map((stage) => (
            <Button
              key={stage}
              onClick={() => advanceToStage(stage)}
              variant={currentStage === stage ? "default" : "outline"}
              size="lg"
              className={
                currentStage === stage
                  ? "bg-blue-600 hover:bg-blue-700 text-white text-base px-6 py-3"
                  : "border-gray-600 text-gray-300 text-base px-6 py-3"
              }
            >
              {stage === "random" ? "🎲 Random" : stage.charAt(0).toUpperCase() + stage.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Game State */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Current State</h3>
        
        {/* Player Hand */}
        {currentHand && (
          <div className="mb-4">
            <span className="text-gray-400 text-sm">Your Hand:</span>
            <div className="flex gap-2 mt-2">
              <PokerCard card={currentHand.card1} size="sm" />
              <PokerCard card={currentHand.card2} size="sm" />
            </div>
            <div className="mt-3 flex gap-4 items-center">
              <div>
                <span className="text-gray-400 text-sm">Position:</span>
                <Badge className="bg-purple-600 text-white text-base px-3 py-1 ml-2">
                  {currentPosition}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Players:</span>
                <Badge className="bg-blue-600 text-white text-base px-3 py-1 ml-2">
                  {currentNumPlayers}
                </Badge>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-base">
          <div>
            <span className="text-gray-400">Stage:</span>
            <Badge variant="secondary" className="bg-blue-700 text-white ml-2 capitalize text-sm">
              {currentStage}
            </Badge>
          </div>
          <div>
            <span className="text-gray-400">Pot:</span>
            <span className="text-yellow-300 font-semibold ml-2 text-lg">{currentPot} BB</span>
          </div>
          <div>
            <span className="text-gray-400">Current Bet to Call:</span>
            <span className="text-red-300 font-semibold ml-2 text-lg">
              {currentBet > 0 ? `${currentBet} BB` : "None"}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Stack:</span>
            <span className="text-white ml-2 text-lg">{currentStack} BB</span>
          </div>
        </div>
        
        {/* Betting Info */}
        {currentBet > 0 && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <div className="text-yellow-300 text-sm">
              <strong>To Call:</strong> {currentBet} BB
            </div>
            <div className="text-yellow-300 text-sm mt-1">
              <strong>To Raise:</strong> Minimum {currentBet * 2} BB (typically {Math.round(currentPot * 0.67)} BB for 2/3 pot)
            </div>
          </div>
        )}
        {currentBet === 0 && currentStage !== "preflop" && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <div className="text-green-300 text-sm">
              <strong>No bet to face.</strong> You can check or bet {Math.round(currentPot * 0.67)} BB (2/3 pot).
            </div>
          </div>
        )}

        {/* Community Cards */}
        {currentCommunityCards.length > 0 && (
          <div className="mt-4">
            <span className="text-gray-400 text-sm">Board:</span>
            <div className="flex gap-2 mt-2">
              {currentCommunityCards.map((card, i) => (
                <PokerCard key={i} card={card} size="sm" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Simulate Action</h3>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => simulateAction("fold")}
            variant="destructive"
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-base px-6 py-3"
          >
            Fold
          </Button>
          {currentBet > 0 && (
            <Button
              onClick={() => simulateAction("call")}
              variant="secondary"
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-base px-6 py-3"
            >
              Call {currentBet} BB
            </Button>
          )}
          {currentStage !== "preflop" && currentBet === 0 && (
            <Button
              onClick={() => simulateAction("check")}
              variant="secondary"
              size="lg"
              className="bg-gray-600 hover:bg-gray-700 text-base px-6 py-3"
            >
              Check
            </Button>
          )}
          {currentBet === 0 && (
            <Button
              onClick={() => simulateAction("bet")}
              variant="default"
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-base px-6 py-3"
            >
              Bet {Math.round(currentPot * 0.67)} BB
            </Button>
          )}
          {currentBet > 0 && (
            <Button
              onClick={() => simulateAction("raise")}
              variant="outline"
              size="lg"
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-base px-6 py-3"
            >
              Raise to {currentBet * 2} BB
            </Button>
          )}
        </div>
      </div>
      
      {/* Current Feedback */}
      {currentFeedback && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          simulatedOutcomes[simulationStep]?.isCorrect
            ? "bg-green-900/20 border-green-600"
            : "bg-red-900/20 border-red-600"
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            simulatedOutcomes[simulationStep]?.isCorrect ? "text-green-400" : "text-red-400"
          }`}>
            {simulatedOutcomes[simulationStep]?.isCorrect ? "✓ Correct" : "✗ Incorrect"}
          </h3>
          <p className="text-gray-300">{currentFeedback}</p>
        </div>
      )}

      {/* Simulation Timeline */}
      {simulatedActions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Simulation Timeline</h3>
          <div className="space-y-2">
            {simulatedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setSimulationStep(index)}
                className={`w-full text-left p-3 rounded transition-colors ${
                  index === simulationStep
                    ? "bg-blue-900/50 border-2 border-blue-600"
                    : "bg-gray-900/50 hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={action === "fold" ? "destructive" : "secondary"}
                      className={
                        action === "fold" ? "bg-red-600" :
                        action === "bet" || action === "raise" ? "bg-green-600" :
                        "bg-gray-700"
                      }
                    >
                      Step {index + 1}: {action}
                    </Badge>
                    {simulatedOutcomes[index] && (
                      <>
                        <span className="text-gray-400 text-sm">
                          Pot: <span className="text-yellow-300">{simulatedOutcomes[index].pot.toFixed(1)} BB</span>
                        </span>
                        <span className="text-gray-400 text-sm">
                          Stack: <span className="text-white">{simulatedOutcomes[index].stack.toFixed(1)} BB</span>
                        </span>
                      </>
                    )}
                  </div>
                  {simulatedOutcomes[index] && (
                    <span className={`font-semibold ${
                      simulatedOutcomes[index].ev >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      EV: {simulatedOutcomes[index].ev >= 0 ? "+" : ""}
                      {simulatedOutcomes[index].ev.toFixed(2)} BB
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Outcome */}
      {currentOutcome && (
        <div className="p-4 bg-gray-900/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Current Outcome</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Pot Size</div>
              <div className="text-yellow-300 text-xl font-bold">{currentOutcome.pot.toFixed(1)} BB</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Remaining Stack</div>
              <div className="text-white text-xl font-bold">{currentOutcome.stack.toFixed(1)} BB</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Expected Value</div>
              <div className={`text-xl font-bold ${
                currentOutcome.ev >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {currentOutcome.ev >= 0 ? "+" : ""}{currentOutcome.ev.toFixed(2)} BB
              </div>
            </div>
          </div>
        </div>
      )}
    </UICard>
  );
}


