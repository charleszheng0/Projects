import { GameStage, evaluateHandStrength } from "./postflop-gto";
import { Hand, Card } from "./gto";
import { OpponentArchetype, getExploitNote } from "./leak-weighting";

export type WhyBetContent = {
  title: string;
  targets: string[];
  foldsOut: string[];
  continues: string[];
  exploitNote: string[];
};

function getSizingBand(betSize: number | undefined, pot: number): "small" | "medium" | "large" {
  if (!betSize || pot <= 0) return "medium";
  const ratio = betSize / pot;
  if (ratio <= 0.45) return "small";
  if (ratio <= 0.85) return "medium";
  return "large";
}

function getHandBand(strength: number): "strong" | "medium" | "weak" {
  if (strength >= 0.7) return "strong";
  if (strength >= 0.4) return "medium";
  return "weak";
}

export function getWhyBetContent(
  playerHand: Hand,
  communityCards: Card[],
  stage: GameStage,
  action: string,
  betSize: number | undefined,
  pot: number,
  archetype: OpponentArchetype,
  includeExploitNote: boolean
): WhyBetContent {
  const handStrength = evaluateHandStrength(playerHand, communityCards, stage);
  const sizingBand = getSizingBand(betSize, pot);
  const handBand = getHandBand(handStrength);
  const sizingLabel = action === "bet" || action === "raise"
    ? (sizingBand === "small" ? "small" : sizingBand === "large" ? "large" : "medium")
    : "standard";

  const targets: string[] = [];
  const foldsOut: string[] = [];
  const continues: string[] = [];

  if (action === "check") {
    targets.push("Keep weaker hands in");
    foldsOut.push("No immediate folds forced");
    continues.push("All holdings continue");
  } else if (action === "call") {
    targets.push("Bluffs and thin value");
    foldsOut.push("None forced");
    continues.push("Value-heavy lines");
  } else if (action === "fold") {
    targets.push("Avoid dominated outcomes");
    foldsOut.push("All pressure removed");
    continues.push("None");
  } else {
    if (handBand === "strong") {
      targets.push("Top pair and strong draws");
      targets.push("Overpairs and two pairs");
    } else if (handBand === "medium") {
      targets.push("One-pair hands");
      targets.push("Weak top pair");
    } else {
      targets.push("Marginal pairs");
      targets.push("Weak draws");
    }

    if (sizingLabel === "large") {
      foldsOut.push("Missed draws");
      foldsOut.push("Low equity bluff-catchers");
      continues.push("Strong top pair+");
      continues.push("Nut draws");
    } else if (sizingLabel === "small") {
      foldsOut.push("Ace-high and underpairs");
      foldsOut.push("Weak gutshots");
      continues.push("Second pair");
      continues.push("Flush draws");
    } else {
      foldsOut.push("Marginal bluff-catchers");
      foldsOut.push("Weak pairs");
      continues.push("Top pair");
      continues.push("Strong draws");
    }
  }

  return {
    title: action === "raise" ? "Why Raise?" : `Why ${action.charAt(0).toUpperCase() + action.slice(1)}?`,
    targets,
    foldsOut,
    continues,
    exploitNote: includeExploitNote ? getExploitNote(archetype) : [],
  };
}
