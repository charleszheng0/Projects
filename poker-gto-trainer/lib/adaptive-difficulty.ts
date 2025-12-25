import { PerformanceMetrics } from "./session-tracking";

/**
 * Adaptive Difficulty System
 * Adjusts game complexity based on user performance
 */

export interface DifficultySettings {
  level: "beginner" | "intermediate" | "advanced" | "expert";
  bluffFrequency: number; // 0-1, how often opponents bluff
  aggressionLevel: number; // 0-1, how aggressive opponents are
  rangeComplexity: number; // 0-1, how complex ranges are
  betSizingVariety: number; // 0-1, variety in bet sizing
  positionAwareness: number; // 0-1, how position-aware opponents are
}

export const DIFFICULTY_PRESETS: Record<string, DifficultySettings> = {
  beginner: {
    level: "beginner",
    bluffFrequency: 0.2,
    aggressionLevel: 0.3,
    rangeComplexity: 0.4,
    betSizingVariety: 0.3,
    positionAwareness: 0.5,
  },
  intermediate: {
    level: "intermediate",
    bluffFrequency: 0.4,
    aggressionLevel: 0.5,
    rangeComplexity: 0.6,
    betSizingVariety: 0.5,
    positionAwareness: 0.7,
  },
  advanced: {
    level: "advanced",
    bluffFrequency: 0.6,
    aggressionLevel: 0.7,
    rangeComplexity: 0.8,
    betSizingVariety: 0.7,
    positionAwareness: 0.9,
  },
  expert: {
    level: "expert",
    bluffFrequency: 0.8,
    aggressionLevel: 0.9,
    rangeComplexity: 1.0,
    betSizingVariety: 0.9,
    positionAwareness: 1.0,
  },
};

/**
 * Calculate adaptive difficulty based on performance metrics
 */
export function calculateAdaptiveDifficulty(
  metrics: PerformanceMetrics
): DifficultySettings {
  const { currentSession, allTimeStats } = metrics;
  
  // Use current session if available, otherwise use all-time stats
  const accuracy = currentSession?.accuracy ?? allTimeStats.lifetimeAccuracy;
  const mistakesPer100 = currentSession?.mistakesPer100Hands ?? 
    (allTimeStats.totalHands > 0 
      ? ((allTimeStats.totalDecisions - allTimeStats.totalDecisions * allTimeStats.lifetimeAccuracy) / allTimeStats.totalHands) * 100
      : 50);
  
  // Determine base level
  let level: DifficultySettings["level"] = "beginner";
  
  if (accuracy >= 0.8 && mistakesPer100 < 20) {
    level = "expert";
  } else if (accuracy >= 0.7 && mistakesPer100 < 30) {
    level = "advanced";
  } else if (accuracy >= 0.6 && mistakesPer100 < 40) {
    level = "intermediate";
  } else {
    level = "beginner";
  }
  
  // Get base preset
  const base = DIFFICULTY_PRESETS[level];
  
  // Adjust based on recent trends
  const recentAccuracy = metrics.trends.accuracyTrend.slice(-3);
  const avgRecentAccuracy = recentAccuracy.length > 0
    ? recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length
    : accuracy;
  
  // If improving, slightly increase difficulty
  if (avgRecentAccuracy > accuracy + 0.05) {
    // User is improving - increase difficulty slightly
    return {
      ...base,
      bluffFrequency: Math.min(1.0, base.bluffFrequency + 0.1),
      aggressionLevel: Math.min(1.0, base.aggressionLevel + 0.1),
    };
  }
  
  // If declining, decrease difficulty
  if (avgRecentAccuracy < accuracy - 0.05) {
    return {
      ...base,
      bluffFrequency: Math.max(0.1, base.bluffFrequency - 0.1),
      aggressionLevel: Math.max(0.1, base.aggressionLevel - 0.1),
    };
  }
  
  return base;
}

/**
 * Get difficulty description
 */
export function getDifficultyDescription(settings: DifficultySettings): string {
  const descriptions: Record<string, string> = {
    beginner: "Opponents play straightforward poker with simple ranges. Good for learning fundamentals.",
    intermediate: "Opponents mix in some bluffs and have more complex ranges. Standard online play.",
    advanced: "Opponents are aggressive with sophisticated strategies. High-stakes style play.",
    expert: "Opponents play near-optimal GTO strategies. Maximum challenge for advanced players.",
  };
  
  return descriptions[settings.level] || descriptions.beginner;
}

