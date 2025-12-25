import { Hand, Position, Card } from "./gto";
import { GameStage, BettingAction } from "./postflop-gto";
import { Action } from "./gto";

/**
 * Machine Learning Dataset Structure for Poker Training Data
 * Each record represents a decision point in a poker hand
 */

export interface HandHistoryRecord {
  // Unique identifier
  id: string;
  timestamp: number;
  
  // Hand context
  handId: string; // Groups all actions from the same hand
  playerHand: Hand;
  playerPosition: Position;
  numPlayers: number;
  playerSeat: number;
  
  // Game state at decision point
  gameStage: GameStage;
  communityCards: Card[];
  pot: number; // Pot size in BB
  currentBet: number; // Current bet to call in BB
  playerStackBB: number;
  actionToFace: BettingAction | null; // What action player needs to respond to
  
  // Player action
  playerAction: Action | BettingAction;
  betSizeBB?: number; // If action was bet/raise, the size
  
  // GTO analysis
  optimalActions: Action[];
  isCorrect: boolean;
  feedback: string;
  
  // Opponent context
  activePlayers: number; // Number of players still in hand
  foldedPlayers: boolean[]; // Which players have folded
  
  // Outcome (filled when hand completes)
  handOutcome?: {
    won: boolean;
    finalPot: number;
    finalStage: GameStage;
    showdown: boolean; // Reached showdown
    winningHand?: string; // If reached showdown
  };
  
  // Features for ML (derived features)
  features?: {
    handStrength?: number; // 0-1 hand strength score
    positionValue?: number; // Position value (0-1, higher = better position)
    potOdds?: number; // Pot odds if facing a bet
    stackToPotRatio?: number;
    isInPosition?: boolean;
    isOutOfPosition?: boolean;
  };
}

/**
 * Dataset storage and management
 */
export class HandHistoryDataset {
  private records: HandHistoryRecord[] = [];
  private storageKey = "poker-gto-dataset";
  
  constructor() {
    this.loadFromStorage();
  }
  
  /**
   * Add a new record to the dataset
   */
  addRecord(record: Omit<HandHistoryRecord, "id" | "timestamp">): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRecord: HandHistoryRecord = {
      ...record,
      id,
      timestamp: Date.now(),
    };
    
    this.records.push(newRecord);
    this.saveToStorage();
    return id;
  }
  
  /**
   * Update a record (e.g., add outcome when hand completes)
   */
  updateRecord(id: string, updates: Partial<HandHistoryRecord>): boolean {
    const index = this.records.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.records[index] = { ...this.records[index], ...updates };
    this.saveToStorage();
    return true;
  }
  
  /**
   * Get all records
   */
  getAllRecords(): HandHistoryRecord[] {
    return [...this.records];
  }
  
  /**
   * Get records filtered by criteria
   */
  getRecords(filter?: {
    gameStage?: GameStage;
    playerPosition?: Position;
    isCorrect?: boolean;
    handId?: string;
    dateFrom?: number;
    dateTo?: number;
  }): HandHistoryRecord[] {
    let filtered = [...this.records];
    
    if (filter?.gameStage) {
      filtered = filtered.filter(r => r.gameStage === filter.gameStage);
    }
    if (filter?.playerPosition) {
      filtered = filtered.filter(r => r.playerPosition === filter.playerPosition);
    }
    if (filter?.isCorrect !== undefined) {
      filtered = filtered.filter(r => r.isCorrect === filter.isCorrect);
    }
    if (filter?.handId) {
      filtered = filtered.filter(r => r.handId === filter.handId);
    }
    if (filter?.dateFrom) {
      filtered = filtered.filter(r => r.timestamp >= filter.dateFrom!);
    }
    if (filter?.dateTo) {
      filtered = filtered.filter(r => r.timestamp <= filter.dateTo!);
    }
    
    return filtered;
  }
  
  /**
   * Get statistics about the dataset
   */
  getStatistics() {
    const total = this.records.length;
    const correct = this.records.filter(r => r.isCorrect).length;
    const incorrect = total - correct;
    
    const byStage: Record<GameStage, number> = {
      preflop: 0,
      flop: 0,
      turn: 0,
      river: 0,
    };
    
    this.records.forEach(r => {
      byStage[r.gameStage]++;
    });
    
    const byPosition: Record<Position, number> = {
      UTG: 0,
      "UTG+1": 0,
      MP: 0,
      CO: 0,
      BTN: 0,
      SB: 0,
      BB: 0,
    };
    
    this.records.forEach(r => {
      byPosition[r.playerPosition]++;
    });
    
    return {
      total,
      correct,
      incorrect,
      accuracy: total > 0 ? correct / total : 0,
      byStage,
      byPosition,
    };
  }
  
  /**
   * Export dataset to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.records, null, 2);
  }
  
  /**
   * Import dataset from JSON
   */
  importFromJSON(json: string, merge: boolean = false): boolean {
    try {
      const imported = JSON.parse(json) as HandHistoryRecord[];
      
      if (!Array.isArray(imported)) {
        throw new Error("Invalid format: expected array");
      }
      
      if (merge) {
        this.records.push(...imported);
      } else {
        this.records = imported;
      }
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error("Error importing dataset:", error);
      return false;
    }
  }
  
  /**
   * Export to CSV format (for ML tools)
   */
  exportToCSV(): string {
    if (this.records.length === 0) return "";
    
    // CSV headers
    const headers = [
      "id",
      "timestamp",
      "handId",
      "playerHand",
      "playerPosition",
      "numPlayers",
      "gameStage",
      "pot",
      "currentBet",
      "playerAction",
      "betSizeBB",
      "isCorrect",
      "optimalActions",
      "activePlayers",
    ];
    
    const rows = this.records.map(record => [
      record.id,
      record.timestamp,
      record.handId,
      `${record.playerHand.card1.rank}${record.playerHand.card1.suit[0]} ${record.playerHand.card2.rank}${record.playerHand.card2.suit[0]}`,
      record.playerPosition,
      record.numPlayers,
      record.gameStage,
      record.pot,
      record.currentBet,
      record.playerAction,
      record.betSizeBB || "",
      record.isCorrect ? "1" : "0",
      record.optimalActions.join("|"),
      record.activePlayers,
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");
    
    return csv;
  }
  
  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
    this.saveToStorage();
  }
  
  /**
   * Delete records by filter
   */
  deleteRecords(filter: {
    handId?: string;
    dateFrom?: number;
    dateTo?: number;
  }): number {
    const beforeCount = this.records.length;
    this.records = this.records.filter(record => {
      if (filter.handId && record.handId === filter.handId) return false;
      if (filter.dateFrom && record.timestamp < filter.dateFrom) return false;
      if (filter.dateTo && record.timestamp > filter.dateTo) return false;
      return true;
    });
    
    const deleted = beforeCount - this.records.length;
    this.saveToStorage();
    return deleted;
  }
  
  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.records));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }
  }
  
  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.records = JSON.parse(stored);
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      }
    }
  }
}

// Singleton instance
let datasetInstance: HandHistoryDataset | null = null;

export function getDataset(): HandHistoryDataset {
  if (!datasetInstance) {
    datasetInstance = new HandHistoryDataset();
  }
  return datasetInstance;
}

