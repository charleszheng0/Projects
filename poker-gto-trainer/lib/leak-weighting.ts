import { Hand, Card } from "./gto";
import { GameStage, evaluateHandStrength } from "./postflop-gto";

export type OpponentArchetype =
  | "SOLVER_LIKE"
  | "OVER_FOLDS"
  | "STATION"
  | "SCARED_MONEY"
  | "OVER_AGGRO";

export type StrategyMode = "gto" | "exploit";

type LeakWeights = {
  foldEquityMultiplier: number;
  callEquityMultiplier: number;
  bluffCatchMultiplier: number;
};

const BASE_FOLD_EQUITY = 0.3;

const ARCHETYPE_LABELS: Record<OpponentArchetype, string> = {
  SOLVER_LIKE: "Solver-Like Reg",
  OVER_FOLDS: "Over-Folds (esp. river)",
  STATION: "Station / Calls Too Much",
  SCARED_MONEY: "Scared Money",
  OVER_AGGRO: "Over-Aggressive / Over-Bluffs",
};

export function getArchetypeLabel(archetype: OpponentArchetype): string {
  return ARCHETYPE_LABELS[archetype];
}

export function getLeakWeights(archetype: OpponentArchetype, stage: GameStage): LeakWeights {
  const riverBoost = stage === "river" ? 1.15 : stage === "turn" ? 1.1 : 1;
  switch (archetype) {
    case "OVER_FOLDS":
      return {
        foldEquityMultiplier: 1.35 * riverBoost,
        callEquityMultiplier: 0.9,
        bluffCatchMultiplier: 0.85,
      };
    case "STATION":
      return {
        foldEquityMultiplier: 0.65,
        callEquityMultiplier: 1.12,
        bluffCatchMultiplier: 1.2,
      };
    case "SCARED_MONEY":
      return {
        foldEquityMultiplier: 1.2 * riverBoost,
        callEquityMultiplier: 0.88,
        bluffCatchMultiplier: 0.9,
      };
    case "OVER_AGGRO":
      return {
        foldEquityMultiplier: 0.9,
        callEquityMultiplier: 1.05,
        bluffCatchMultiplier: 1.15,
      };
    case "SOLVER_LIKE":
    default:
      return {
        foldEquityMultiplier: 1,
        callEquityMultiplier: 1,
        bluffCatchMultiplier: 1,
      };
  }
}

export function calculateLeakWeightedEV(
  playerHand: Hand,
  communityCards: Card[],
  gameStage: GameStage,
  pot: number,
  currentBet: number,
  action: string,
  betSize: number | undefined,
  numPlayers: number,
  archetype: OpponentArchetype
): number {
  const weights = getLeakWeights(archetype, gameStage);
  const handStrength = evaluateHandStrength(playerHand, communityCards, gameStage);
  let potEquity = handStrength;

  if (numPlayers > 2) {
    potEquity = potEquity * (0.5 + 0.5 / numPlayers);
  }

  const stageMultiplier: Record<GameStage, number> = {
    preflop: 0.7,
    flop: 0.85,
    turn: 0.95,
    river: 1,
  };
  potEquity = potEquity * stageMultiplier[gameStage];
  potEquity = Math.min(1, Math.max(0.05, potEquity * weights.callEquityMultiplier));

  if (action === "fold") return 0;

  if (action === "call") {
    const totalPot = pot + currentBet;
    return potEquity * totalPot - currentBet;
  }

  if (action === "check") {
    return potEquity * pot;
  }

  if (action === "bet" || action === "raise") {
    const betAmount = betSize || currentBet * 2;
    const totalPot = pot + betAmount;
    let foldEquity = BASE_FOLD_EQUITY * weights.foldEquityMultiplier;
    foldEquity = Math.min(0.8, Math.max(0.05, foldEquity));
    return foldEquity * pot + (1 - foldEquity) * (potEquity * totalPot - betAmount);
  }

  return 0;
}

export function getExploitNote(archetype: OpponentArchetype): string[] {
  switch (archetype) {
    case "OVER_FOLDS":
      return ["Over-folders release bluff-catchers too often", "Larger sizing increases fold EV"];
    case "STATION":
      return ["Calling stations stick with weak pairs", "Thin value beats bluffs here"];
    case "SCARED_MONEY":
      return ["Scared money folds to pressure", "Bigger bets win the pot more often"];
    case "OVER_AGGRO":
      return ["Over-aggro players chase bluffs", "Call wider and bluff less"];
    case "SOLVER_LIKE":
    default:
      return [];
  }
}
