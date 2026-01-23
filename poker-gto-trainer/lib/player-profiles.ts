import { OpponentStats } from "./realistic-opponent";
import { Position } from "./gto";

/**
 * Player Profile Types
 */
export type PlayerProfileType = 
  | "TAG" 
  | "LAG" 
  | "NIT" 
  | "MANIAC" 
  | "CALLING_STATION" 
  | "ONLINE_REG" 
  | "LIVE_CASINO_INTERMEDIATE" 
  | "HIGH_ROLLER_PRO"
  | "BALANCED";

/**
 * Player Profile with metadata
 */
export interface PlayerProfile {
  type: PlayerProfileType;
  name: string;
  description: string;
  stats: OpponentStats;
}

/**
 * Master Player Profiles Dataset
 * Based on realistic poker player archetypes
 */
export const PLAYER_PROFILES: Record<PlayerProfileType, PlayerProfile> = {
  TAG: {
    type: "TAG",
    name: "Tight-Aggressive",
    description: "Plays tight ranges but aggressive when entering pots. Balanced postflop play.",
    stats: {
      preflop: {
        UTG: { fold: 0.82, call: 0.09, raise: 0.09 },
        MP: { fold: 0.76, call: 0.13, raise: 0.11 },
        CO: { fold: 0.63, call: 0.18, raise: 0.19 },
        BTN: { fold: 0.55, call: 0.25, raise: 0.20 },
        SB: { fold: 0.72, call: 0.16, raise: 0.12 },
        BB: { fold: 0.50, call: 0.40, raise: 0.10 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.75, call: 0.17, bet: 0.06, raise: 0.02 },
          "0.3-0.5": { fold: 0.42, call: 0.37, bet: 0.17, raise: 0.04 },
          "0.5-0.7": { fold: 0.12, call: 0.35, bet: 0.41, raise: 0.12 },
          "0.7-1.0": { fold: 0.03, call: 0.10, bet: 0.60, raise: 0.27 }
        },
        turn: {
          "0-0.3": { fold: 0.78, call: 0.15, bet: 0.05, raise: 0.02 },
          "0.3-0.5": { fold: 0.50, call: 0.33, bet: 0.13, raise: 0.04 },
          "0.5-0.7": { fold: 0.17, call: 0.34, bet: 0.37, raise: 0.12 },
          "0.7-1.0": { fold: 0.05, call: 0.12, bet: 0.56, raise: 0.27 }
        },
        river: {
          "0-0.3": { fold: 0.84, call: 0.12, bet: 0.03, raise: 0.01 },
          "0.3-0.5": { fold: 0.57, call: 0.31, bet: 0.10, raise: 0.02 },
          "0.5-0.7": { fold: 0.26, call: 0.33, bet: 0.30, raise: 0.11 },
          "0.7-1.0": { fold: 0.04, call: 0.14, bet: 0.52, raise: 0.30 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.67, 0.75, 1.0],
        bluffBet: [0.33, 0.5]
      }
    }
  },
  LAG: {
    type: "LAG",
    name: "Loose-Aggressive",
    description: "Plays wide ranges and bets/raises frequently. High VPIP, high aggression.",
    stats: {
      preflop: {
        UTG: { fold: 0.70, call: 0.17, raise: 0.13 },
        MP: { fold: 0.63, call: 0.22, raise: 0.15 },
        CO: { fold: 0.50, call: 0.27, raise: 0.23 },
        BTN: { fold: 0.43, call: 0.30, raise: 0.27 },
        SB: { fold: 0.60, call: 0.23, raise: 0.17 },
        BB: { fold: 0.40, call: 0.48, raise: 0.12 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.67, call: 0.20, bet: 0.09, raise: 0.04 },
          "0.3-0.5": { fold: 0.34, call: 0.35, bet: 0.23, raise: 0.08 },
          "0.5-0.7": { fold: 0.10, call: 0.32, bet: 0.43, raise: 0.15 },
          "0.7-1.0": { fold: 0.02, call: 0.07, bet: 0.63, raise: 0.28 }
        },
        turn: {
          "0-0.3": { fold: 0.72, call: 0.18, bet: 0.08, raise: 0.02 },
          "0.3-0.5": { fold: 0.41, call: 0.33, bet: 0.20, raise: 0.06 },
          "0.5-0.7": { fold: 0.14, call: 0.30, bet: 0.40, raise: 0.16 },
          "0.7-1.0": { fold: 0.03, call: 0.09, bet: 0.55, raise: 0.33 }
        },
        river: {
          "0-0.3": { fold: 0.80, call: 0.13, bet: 0.05, raise: 0.02 },
          "0.3-0.5": { fold: 0.52, call: 0.29, bet: 0.15, raise: 0.04 },
          "0.5-0.7": { fold: 0.23, call: 0.30, bet: 0.32, raise: 0.15 },
          "0.7-1.0": { fold: 0.03, call: 0.12, bet: 0.50, raise: 0.35 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.75, 1.0, 1.5],
        bluffBet: [0.33, 0.5, 0.9]
      }
    }
  },
  NIT: {
    type: "NIT",
    name: "Ultra-Tight",
    description: "Extremely tight ranges, rarely bluffs. Folds frequently to aggression.",
    stats: {
      preflop: {
        UTG: { fold: 0.90, call: 0.06, raise: 0.04 },
        MP: { fold: 0.85, call: 0.09, raise: 0.06 },
        CO: { fold: 0.78, call: 0.13, raise: 0.09 },
        BTN: { fold: 0.70, call: 0.18, raise: 0.12 },
        SB: { fold: 0.82, call: 0.13, raise: 0.05 },
        BB: { fold: 0.58, call: 0.38, raise: 0.04 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.88, call: 0.10, bet: 0.01, raise: 0.01 },
          "0.3-0.5": { fold: 0.65, call: 0.29, bet: 0.05, raise: 0.01 },
          "0.5-0.7": { fold: 0.30, call: 0.50, bet: 0.15, raise: 0.05 },
          "0.7-1.0": { fold: 0.05, call: 0.15, bet: 0.60, raise: 0.20 }
        },
        turn: {
          "0-0.3": { fold: 0.92, call: 0.07, bet: 0.01, raise: 0.00 },
          "0.3-0.5": { fold: 0.70, call: 0.26, bet: 0.03, raise: 0.01 },
          "0.5-0.7": { fold: 0.35, call: 0.48, bet: 0.12, raise: 0.05 },
          "0.7-1.0": { fold: 0.08, call: 0.20, bet: 0.50, raise: 0.22 }
        },
        river: {
          "0-0.3": { fold: 0.95, call: 0.05, bet: 0.00, raise: 0.00 },
          "0.3-0.5": { fold: 0.74, call: 0.23, bet: 0.02, raise: 0.01 },
          "0.5-0.7": { fold: 0.40, call: 0.45, bet: 0.10, raise: 0.05 },
          "0.7-1.0": { fold: 0.12, call: 0.18, bet: 0.45, raise: 0.25 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.67],
        bluffBet: [0.25]
      }
    }
  },
  MANIAC: {
    type: "MANIAC",
    name: "Maniac/Whale",
    description: "Extremely loose and aggressive. Bets/raises frequently with wide ranges.",
    stats: {
      preflop: {
        UTG: { fold: 0.50, call: 0.25, raise: 0.25 },
        MP: { fold: 0.45, call: 0.25, raise: 0.30 },
        CO: { fold: 0.38, call: 0.27, raise: 0.35 },
        BTN: { fold: 0.35, call: 0.28, raise: 0.37 },
        SB: { fold: 0.50, call: 0.30, raise: 0.20 },
        BB: { fold: 0.36, call: 0.45, raise: 0.19 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.58, call: 0.19, bet: 0.15, raise: 0.08 },
          "0.3-0.5": { fold: 0.25, call: 0.28, bet: 0.30, raise: 0.17 },
          "0.5-0.7": { fold: 0.07, call: 0.22, bet: 0.45, raise: 0.26 },
          "0.7-1.0": { fold: 0.02, call: 0.08, bet: 0.48, raise: 0.42 }
        },
        turn: {
          "0-0.3": { fold: 0.62, call: 0.18, bet: 0.14, raise: 0.06 },
          "0.3-0.5": { fold: 0.28, call: 0.30, bet: 0.25, raise: 0.17 },
          "0.5-0.7": { fold: 0.10, call: 0.22, bet: 0.40, raise: 0.28 },
          "0.7-1.0": { fold: 0.02, call: 0.09, bet: 0.45, raise: 0.44 }
        },
        river: {
          "0-0.3": { fold: 0.66, call: 0.22, bet: 0.07, raise: 0.05 },
          "0.3-0.5": { fold: 0.30, call: 0.32, bet: 0.25, raise: 0.13 },
          "0.5-0.7": { fold: 0.12, call: 0.26, bet: 0.34, raise: 0.28 },
          "0.7-1.0": { fold: 0.03, call: 0.10, bet: 0.38, raise: 0.49 }
        }
      },
      betSizing: {
        valueBet: [0.75, 1.0, 1.5, 2.0],
        bluffBet: [0.5, 1.0, 2.5]
      }
    }
  },
  CALLING_STATION: {
    type: "CALLING_STATION",
    name: "Calling Station",
    description: "Calls frequently, rarely raises. Passive player who calls down with weak hands.",
    stats: {
      preflop: {
        UTG: { fold: 0.65, call: 0.28, raise: 0.07 },
        MP: { fold: 0.60, call: 0.32, raise: 0.08 },
        CO: { fold: 0.55, call: 0.37, raise: 0.08 },
        BTN: { fold: 0.50, call: 0.40, raise: 0.10 },
        SB: { fold: 0.65, call: 0.30, raise: 0.05 },
        BB: { fold: 0.45, call: 0.50, raise: 0.05 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.55, call: 0.40, bet: 0.03, raise: 0.02 },
          "0.3-0.5": { fold: 0.23, call: 0.63, bet: 0.10, raise: 0.04 },
          "0.5-0.7": { fold: 0.15, call: 0.58, bet: 0.22, raise: 0.05 },
          "0.7-1.0": { fold: 0.08, call: 0.50, bet: 0.22, raise: 0.20 }
        },
        turn: {
          "0-0.3": { fold: 0.60, call: 0.36, bet: 0.02, raise: 0.02 },
          "0.3-0.5": { fold: 0.30, call: 0.55, bet: 0.10, raise: 0.05 },
          "0.5-0.7": { fold: 0.17, call: 0.56, bet: 0.20, raise: 0.07 },
          "0.7-1.0": { fold: 0.10, call: 0.42, bet: 0.25, raise: 0.23 }
        },
        river: {
          "0-0.3": { fold: 0.65, call: 0.32, bet: 0.02, raise: 0.01 },
          "0.3-0.5": { fold: 0.35, call: 0.53, bet: 0.08, raise: 0.04 },
          "0.5-0.7": { fold: 0.20, call: 0.54, bet: 0.18, raise: 0.08 },
          "0.7-1.0": { fold: 0.12, call: 0.40, bet: 0.22, raise: 0.26 }
        }
      },
      betSizing: {
        valueBet: [0.33, 0.5],
        bluffBet: [0.25]
      }
    }
  },
  ONLINE_REG: {
    type: "ONLINE_REG",
    name: "Online Regular",
    description: "Balanced GTO-inspired play. Solid fundamentals with balanced ranges.",
    stats: {
      preflop: {
        UTG: { fold: 0.80, call: 0.10, raise: 0.10 },
        MP: { fold: 0.74, call: 0.14, raise: 0.12 },
        CO: { fold: 0.62, call: 0.20, raise: 0.18 },
        BTN: { fold: 0.50, call: 0.26, raise: 0.24 },
        SB: { fold: 0.68, call: 0.20, raise: 0.12 },
        BB: { fold: 0.47, call: 0.43, raise: 0.10 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.70, call: 0.20, bet: 0.07, raise: 0.03 },
          "0.3-0.5": { fold: 0.40, call: 0.36, bet: 0.19, raise: 0.05 },
          "0.5-0.7": { fold: 0.12, call: 0.34, bet: 0.41, raise: 0.13 },
          "0.7-1.0": { fold: 0.03, call: 0.10, bet: 0.55, raise: 0.32 }
        },
        turn: {
          "0-0.3": { fold: 0.77, call: 0.17, bet: 0.05, raise: 0.01 },
          "0.3-0.5": { fold: 0.46, call: 0.38, bet: 0.13, raise: 0.03 },
          "0.5-0.7": { fold: 0.16, call: 0.34, bet: 0.37, raise: 0.13 },
          "0.7-1.0": { fold: 0.06, call: 0.12, bet: 0.50, raise: 0.32 }
        },
        river: {
          "0-0.3": { fold: 0.82, call: 0.14, bet: 0.03, raise: 0.01 },
          "0.3-0.5": { fold: 0.52, call: 0.35, bet: 0.10, raise: 0.03 },
          "0.5-0.7": { fold: 0.22, call: 0.34, bet: 0.30, raise: 0.14 },
          "0.7-1.0": { fold: 0.07, call: 0.09, bet: 0.47, raise: 0.37 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.67, 0.75, 1.0],
        bluffBet: [0.33, 0.5, 1.1]
      }
    }
  },
  LIVE_CASINO_INTERMEDIATE: {
    type: "LIVE_CASINO_INTERMEDIATE",
    name: "Live Casino Intermediate",
    description: "Typical live player. Calls wide, bets for value, rarely bluffs large.",
    stats: {
      preflop: {
        UTG: { fold: 0.75, call: 0.17, raise: 0.08 },
        MP: { fold: 0.68, call: 0.22, raise: 0.10 },
        CO: { fold: 0.58, call: 0.28, raise: 0.14 },
        BTN: { fold: 0.52, call: 0.30, raise: 0.18 },
        SB: { fold: 0.65, call: 0.25, raise: 0.10 },
        BB: { fold: 0.50, call: 0.40, raise: 0.10 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.70, call: 0.22, bet: 0.06, raise: 0.02 },
          "0.3-0.5": { fold: 0.38, call: 0.42, bet: 0.16, raise: 0.04 },
          "0.5-0.7": { fold: 0.15, call: 0.38, bet: 0.37, raise: 0.10 },
          "0.7-1.0": { fold: 0.03, call: 0.15, bet: 0.60, raise: 0.22 }
        },
        turn: {
          "0-0.3": { fold: 0.75, call: 0.20, bet: 0.03, raise: 0.02 },
          "0.3-0.5": { fold: 0.44, call: 0.40, bet: 0.12, raise: 0.04 },
          "0.5-0.7": { fold: 0.19, call: 0.39, bet: 0.33, raise: 0.09 },
          "0.7-1.0": { fold: 0.05, call: 0.16, bet: 0.50, raise: 0.29 }
        },
        river: {
          "0-0.3": { fold: 0.80, call: 0.17, bet: 0.02, raise: 0.01 },
          "0.3-0.5": { fold: 0.50, call: 0.40, bet: 0.08, raise: 0.02 },
          "0.5-0.7": { fold: 0.26, call: 0.42, bet: 0.24, raise: 0.08 },
          "0.7-1.0": { fold: 0.06, call: 0.15, bet: 0.45, raise: 0.34 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.75],
        bluffBet: [0.33]
      }
    }
  },
  HIGH_ROLLER_PRO: {
    type: "HIGH_ROLLER_PRO",
    name: "High Roller Professional",
    description: "Elite professional player. Balanced ranges, optimal bet sizing, solver-informed play.",
    stats: {
      preflop: {
        UTG: { fold: 0.78, call: 0.13, raise: 0.09 },
        MP: { fold: 0.72, call: 0.17, raise: 0.11 },
        CO: { fold: 0.60, call: 0.23, raise: 0.17 },
        BTN: { fold: 0.52, call: 0.25, raise: 0.23 },
        SB: { fold: 0.68, call: 0.20, raise: 0.12 },
        BB: { fold: 0.48, call: 0.42, raise: 0.10 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.73, call: 0.18, bet: 0.06, raise: 0.03 },
          "0.3-0.5": { fold: 0.41, call: 0.36, bet: 0.19, raise: 0.04 },
          "0.5-0.7": { fold: 0.10, call: 0.34, bet: 0.40, raise: 0.16 },
          "0.7-1.0": { fold: 0.02, call: 0.09, bet: 0.52, raise: 0.37 }
        },
        turn: {
          "0-0.3": { fold: 0.77, call: 0.18, bet: 0.04, raise: 0.01 },
          "0.3-0.5": { fold: 0.45, call: 0.38, bet: 0.14, raise: 0.03 },
          "0.5-0.7": { fold: 0.14, call: 0.33, bet: 0.38, raise: 0.15 },
          "0.7-1.0": { fold: 0.05, call: 0.12, bet: 0.48, raise: 0.35 }
        },
        river: {
          "0-0.3": { fold: 0.82, call: 0.14, bet: 0.03, raise: 0.01 },
          "0.3-0.5": { fold: 0.50, call: 0.35, bet: 0.12, raise: 0.03 },
          "0.5-0.7": { fold: 0.22, call: 0.33, bet: 0.31, raise: 0.14 },
          "0.7-1.0": { fold: 0.05, call: 0.10, bet: 0.43, raise: 0.42 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.67, 0.75, 1.0, 1.5],
        bluffBet: [0.33, 0.5, 1.2]
      }
    }
  },
  BALANCED: {
    type: "BALANCED",
    name: "Balanced",
    description: "Average balanced player. Mix of all styles.",
    stats: {
      preflop: {
        UTG: { fold: 0.78, call: 0.13, raise: 0.09 },
        "UTG+1": { fold: 0.75, call: 0.14, raise: 0.11 },
        MP: { fold: 0.71, call: 0.18, raise: 0.11 },
        CO: { fold: 0.60, call: 0.23, raise: 0.17 },
        BTN: { fold: 0.55, call: 0.26, raise: 0.19 },
        SB: { fold: 0.70, call: 0.20, raise: 0.10 },
        BB: { fold: 0.52, call: 0.38, raise: 0.10 }
      },
      postflop: {
        flop: {
          "0-0.3": { fold: 0.72, call: 0.17, bet: 0.07, raise: 0.04 },
          "0.3-0.5": { fold: 0.46, call: 0.33, bet: 0.17, raise: 0.04 },
          "0.5-0.7": { fold: 0.13, call: 0.34, bet: 0.41, raise: 0.12 },
          "0.7-1.0": { fold: 0.02, call: 0.07, bet: 0.68, raise: 0.23 }
        },
        turn: {
          "0-0.3": { fold: 0.78, call: 0.12, bet: 0.06, raise: 0.04 },
          "0.3-0.5": { fold: 0.52, call: 0.28, bet: 0.16, raise: 0.04 },
          "0.5-0.7": { fold: 0.19, call: 0.32, bet: 0.36, raise: 0.13 },
          "0.7-1.0": { fold: 0.04, call: 0.09, bet: 0.63, raise: 0.24 }
        },
        river: {
          "0-0.3": { fold: 0.83, call: 0.10, bet: 0.04, raise: 0.03 },
          "0.3-0.5": { fold: 0.55, call: 0.27, bet: 0.14, raise: 0.04 },
          "0.5-0.7": { fold: 0.24, call: 0.30, bet: 0.33, raise: 0.13 },
          "0.7-1.0": { fold: 0.03, call: 0.08, bet: 0.54, raise: 0.35 }
        }
      },
      betSizing: {
        valueBet: [0.5, 0.67, 0.75, 1.0, 1.25],
        bluffBet: [0.25, 0.33, 0.5, 1.1]
      }
    }
  }
};

/**
 * Get a random player profile
 */
export function getRandomProfile(): PlayerProfileType {
  const profiles: PlayerProfileType[] = [
    "TAG", "LAG", "NIT", "MANIAC", "CALLING_STATION", 
    "ONLINE_REG", "LIVE_CASINO_INTERMEDIATE", "HIGH_ROLLER_PRO", "BALANCED"
  ];
  return profiles[Math.floor(Math.random() * profiles.length)];
}

/**
 * Get profile stats for a given profile type
 */
export function getProfileStats(profileType: PlayerProfileType): OpponentStats {
  return PLAYER_PROFILES[profileType].stats;
}

/**
 * Get opponent profile recommendation based on their play style
 * Used for feedback and analysis
 */
export function getOpponentProfileRecommendation(
  profileType: PlayerProfileType,
  playerAction: string,
  isCorrect: boolean
): string {
  const profile = PLAYER_PROFILES[profileType];
  let recommendation = "";
  
  if (!isCorrect) {
    switch (profileType) {
      case "NIT":
        recommendation = "Against a NIT (ultra-tight player), you should bet more frequently for value and bluff less. They fold too often, so value betting is highly profitable.";
        break;
      case "MANIAC":
        recommendation = "Against a MANIAC (loose-aggressive), tighten your value range and call down with stronger hands. They bet/raise too frequently, so you can exploit by calling with medium-strength hands.";
        break;
      case "CALLING_STATION":
        recommendation = "Against a CALLING STATION (passive caller), bet for value with strong hands and avoid bluffing. They call too often, so value betting is optimal while bluffs will fail.";
        break;
      case "LAG":
        recommendation = "Against a LAG (loose-aggressive), tighten your calling range and 3-bet more frequently. They play too wide, so you can exploit by playing tighter and raising for value.";
        break;
      case "TAG":
        recommendation = "Against a TAG (tight-aggressive), you need balanced play. They play solid ranges, so avoid obvious exploits. Focus on GTO fundamentals.";
        break;
      default:
        recommendation = `Against a ${profile.name}, adjust your strategy based on their tendencies.`;
    }
  } else {
    recommendation = `Good play against a ${profile.name}! Your decision aligns well with optimal strategy against this player type.`;
  }
  
  return recommendation;
}

