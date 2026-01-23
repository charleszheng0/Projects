import { HandHistoryRecord } from "./hand-history";

/**
 * Session Tracking and Scoring System
 * Tracks user performance over time with KPIs
 */

export interface SessionStats {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalHands: number;
  totalDecisions: number;
  correctDecisions: number;
  incorrectDecisions: number;
  totalEVLoss: number; // Total EV lost in BB
  totalEVGain: number; // Total EV gained in BB
  netEV: number; // Net EV (gain - loss)
  mistakesPer100Hands: number;
  accuracy: number; // Percentage
  byStage: {
    preflop: { total: number; correct: number; evLoss: number };
    flop: { total: number; correct: number; evLoss: number };
    turn: { total: number; correct: number; evLoss: number };
    river: { total: number; correct: number; evLoss: number };
  };
  byPosition: {
    [key: string]: { total: number; correct: number; evLoss: number };
  };
  handsWon: number;
  handsLost: number;
  handsFolded: number;
}

export interface PerformanceMetrics {
  currentSession: SessionStats | null;
  allTimeStats: {
    totalSessions: number;
    totalHands: number;
    totalDecisions: number;
    lifetimeAccuracy: number;
    lifetimeEVLoss: number;
    lifetimeEVGain: number;
    bestSession: SessionStats | null;
    recentSessions: SessionStats[];
  };
  trends: {
    accuracyTrend: number[]; // Last 10 sessions
    evTrend: number[]; // Last 10 sessions
    mistakesPer100Trend: number[]; // Last 10 sessions
  };
}

/**
 * Calculate session statistics from records
 */
export function calculateSessionStats(
  records: HandHistoryRecord[],
  sessionId: string,
  startTime: number
): SessionStats {
  let totalDecisions = records.length;
  let correctDecisions = 0;
  let incorrectDecisions = 0;
  let totalEVLoss = 0;
  let totalEVGain = 0;
  
  const byStage = {
    preflop: { total: 0, correct: 0, evLoss: 0 },
    flop: { total: 0, correct: 0, evLoss: 0 },
    turn: { total: 0, correct: 0, evLoss: 0 },
    river: { total: 0, correct: 0, evLoss: 0 },
  };
  
  const byPosition: Record<string, { total: number; correct: number; evLoss: number }> = {};
  
  // Get unique hand IDs to count hands
  const uniqueHands = new Set(records.map(r => r.handId));
  const totalHands = uniqueHands.size;
  
  let handsWon = 0;
  let handsLost = 0;
  let handsFolded = 0;
  
  records.forEach(record => {
    // Count decisions
    if (record.isCorrect) {
      correctDecisions++;
    } else {
      incorrectDecisions++;
    }
    
    // Track by stage
    const stage = record.gameStage;
    if (byStage[stage]) {
      byStage[stage].total++;
      if (record.isCorrect) {
        byStage[stage].correct++;
      }
      // Estimate EV loss (simplified - would need actual EV calculation)
      if (!record.isCorrect) {
        byStage[stage].evLoss += 0.5; // Placeholder
      }
    }
    
    // Track by position
    const pos = record.playerPosition;
    if (!byPosition[pos]) {
      byPosition[pos] = { total: 0, correct: 0, evLoss: 0 };
    }
    byPosition[pos].total++;
    if (record.isCorrect) {
      byPosition[pos].correct++;
    }
    if (!record.isCorrect) {
      byPosition[pos].evLoss += 0.5; // Placeholder
    }
    
    // Track hand outcomes
    if (record.handOutcome) {
      if (record.handOutcome.won) {
        handsWon++;
      } else {
        handsLost++;
      }
    }
    
    if (record.playerAction === "fold") {
      handsFolded++;
    }
  });
  
  const accuracy = totalDecisions > 0 ? correctDecisions / totalDecisions : 0;
  const mistakesPer100Hands = totalHands > 0 ? (incorrectDecisions / totalHands) * 100 : 0;
  
  return {
    sessionId,
    startTime,
    totalHands,
    totalDecisions,
    correctDecisions,
    incorrectDecisions,
    totalEVLoss,
    totalEVGain,
    netEV: totalEVGain - totalEVLoss,
    mistakesPer100Hands,
    accuracy,
    byStage,
    byPosition,
    handsWon,
    handsLost,
    handsFolded,
  };
}

/**
 * Session Manager
 */
export class SessionManager {
  private currentSessionId: string | null = null;
  private currentSessionStartTime: number = 0;
  private storageKey = "poker-sessions";
  
  startSession(): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentSessionId = sessionId;
    this.currentSessionStartTime = Date.now();
    return sessionId;
  }
  
  endSession(): void {
    this.currentSessionId = null;
    this.currentSessionStartTime = 0;
  }
  
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
  
  getCurrentSessionStartTime(): number {
    return this.currentSessionStartTime;
  }
  
  /**
   * Get all sessions from storage
   */
  getAllSessions(): SessionStats[] {
    if (typeof window === "undefined") return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
    
    return [];
  }
  
  /**
   * Save session to storage
   */
  saveSession(session: SessionStats): void {
    if (typeof window === "undefined") return;
    
    try {
      const sessions = this.getAllSessions();
      sessions.push(session);
      
      // Keep only last 100 sessions
      if (sessions.length > 100) {
        sessions.shift();
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
    } catch (error) {
      console.error("Error saving session:", error);
    }
  }
  
  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(): PerformanceMetrics {
    const sessions = this.getAllSessions();
    const { getDataset } = require("./hand-history");
    const dataset = getDataset();
    const allRecords = dataset.getAllRecords();
    
    // Calculate current session stats
    const currentSessionId = this.getCurrentSessionId();
    let currentSession: SessionStats | null = null;
    
    if (currentSessionId) {
      // Filter records that belong to this session (handId starts with sessionId)
      const sessionRecords = allRecords.filter((r: HandHistoryRecord) => r.handId.startsWith(currentSessionId));
      if (sessionRecords.length > 0) {
        currentSession = calculateSessionStats(
          sessionRecords,
          currentSessionId,
          this.getCurrentSessionStartTime()
        );
      }
    }
    
    // Calculate all-time stats
    const totalSessions = sessions.length;
    const totalHands = sessions.reduce((sum, s) => sum + s.totalHands, 0);
    const totalDecisions = sessions.reduce((sum, s) => sum + s.totalDecisions, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctDecisions, 0);
    const lifetimeAccuracy = totalDecisions > 0 ? totalCorrect / totalDecisions : 0;
    const lifetimeEVLoss = sessions.reduce((sum, s) => sum + s.totalEVLoss, 0);
    const lifetimeEVGain = sessions.reduce((sum, s) => sum + s.totalEVGain, 0);
    
    // Find best session (highest accuracy)
    const bestSession = sessions.length > 0
      ? sessions.reduce((best, current) => 
          current.accuracy > best.accuracy ? current : best
        )
      : null;
    
    // Get recent sessions (last 10)
    const recentSessions = sessions.slice(-10).reverse();
    
    // Calculate trends (last 10 sessions)
    const last10Sessions = sessions.slice(-10);
    const accuracyTrend = last10Sessions.map(s => s.accuracy);
    const evTrend = last10Sessions.map(s => s.netEV);
    const mistakesPer100Trend = last10Sessions.map(s => s.mistakesPer100Hands);
    
    return {
      currentSession,
      allTimeStats: {
        totalSessions,
        totalHands,
        totalDecisions,
        lifetimeAccuracy,
        lifetimeEVLoss,
        lifetimeEVGain,
        bestSession,
        recentSessions,
      },
      trends: {
        accuracyTrend,
        evTrend,
        mistakesPer100Trend,
      },
    };
  }
  
  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.storageKey);
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

