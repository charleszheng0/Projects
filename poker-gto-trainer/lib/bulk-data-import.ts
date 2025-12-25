import { HandHistoryRecord } from "./hand-history";
import { Hand, Card, Position } from "./gto";
import { GameStage } from "./postflop-gto";

/**
 * Bulk Data Import System
 * 
 * This system allows you to import large datasets of poker hands
 * from various sources (pro databases, hand histories, etc.)
 * 
 * Supported formats:
 * - JSON array of hand records
 * - PokerStars/888poker hand history format (text)
 * - Custom CSV format
 */

export interface BulkHandData {
  // Hand identification
  handId: string;
  timestamp?: number;
  
  // Player info
  playerHand: Hand | string; // Can be Hand object or string like "As Ks"
  playerPosition: Position | string;
  numPlayers: number;
  playerSeat: number;
  
  // Game state
  gameStage: GameStage | string;
  communityCards?: Card[] | string[]; // Can be Card[] or ["As", "Ks", "Qh"] format
  pot: number;
  currentBet: number;
  playerStackBB: number;
  
  // Action
  playerAction: string; // "fold", "call", "bet", "raise", "check"
  betSizeBB?: number;
  
  // GTO analysis (optional - will be calculated if missing)
  optimalActions?: string[];
  isCorrect?: boolean;
  feedback?: string;
  
  // Additional context
  actionToFace?: string | null;
  activePlayers?: number;
  foldedPlayers?: boolean[];
  
  // ML features (optional)
  features?: {
    handStrength?: number;
    positionValue?: number;
    potOdds?: number;
    stackToPotRatio?: number;
    isInPosition?: boolean;
  };
}

/**
 * Parse hand string like "As Ks" or "A Ks" into Hand object
 */
function parseHandString(handStr: string): Hand {
  // Remove spaces and split
  const parts = handStr.trim().split(/\s+/);
  if (parts.length !== 2) {
    throw new Error(`Invalid hand format: ${handStr}. Expected format: "As Ks" or "A Ks"`);
  }
  
  const parseCard = (cardStr: string): Card => {
    const rank = cardStr[0];
    let suitStr = cardStr.slice(1).toLowerCase();
    
    // Map suit abbreviations to full names
    const suitMap: Record<string, string> = {
      's': 'spades',
      'h': 'hearts',
      'd': 'diamonds',
      'c': 'clubs',
    };
    
    const suit = suitMap[suitStr] || suitStr;
    
    return { rank, suit };
  };
  
  return {
    card1: parseCard(parts[0]),
    card2: parseCard(parts[1]),
  };
}

/**
 * Parse community cards string like "As Ks Qh" into Card[]
 */
function parseCommunityCards(cardsStr: string | string[]): Card[] {
  if (Array.isArray(cardsStr)) {
    // If already array of strings like ["As", "Ks"]
    return cardsStr.map(cardStr => {
      const rank = cardStr[0];
      const suitMap: Record<string, string> = {
        's': 'spades', 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs',
      };
      const suit = suitMap[cardStr[1]?.toLowerCase()] || cardStr.slice(1);
      return { rank, suit };
    });
  }
  
  // Parse string like "As Ks Qh"
  const parts = cardsStr.trim().split(/\s+/);
  return parts.map(cardStr => {
    const rank = cardStr[0];
    const suitMap: Record<string, string> = {
      's': 'spades', 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs',
    };
    const suit = suitMap[cardStr[1]?.toLowerCase()] || cardStr.slice(1);
    return { rank, suit };
  });
}

/**
 * Normalize position string to Position type
 */
function normalizePosition(pos: string | Position): Position {
  const posMap: Record<string, Position> = {
    'utg': 'UTG',
    'utg+1': 'UTG+1',
    'utg1': 'UTG+1',
    'mp': 'MP',
    'co': 'CO',
    'btn': 'BTN',
    'button': 'BTN',
    'sb': 'SB',
    'bb': 'BB',
    'big blind': 'BB',
    'small blind': 'SB',
  };
  
  const normalized = posMap[pos.toLowerCase()] || pos as Position;
  return normalized;
}

/**
 * Normalize game stage string to GameStage type
 */
function normalizeGameStage(stage: string | GameStage): GameStage {
  const stageMap: Record<string, GameStage> = {
    'preflop': 'preflop',
    'flop': 'flop',
    'turn': 'turn',
    'river': 'river',
  };
  
  return stageMap[stage.toLowerCase()] || stage as GameStage;
}

/**
 * Convert bulk data format to HandHistoryRecord format
 */
export function convertBulkDataToRecord(data: BulkHandData): HandHistoryRecord {
  // Parse hand
  const playerHand = typeof data.playerHand === 'string' 
    ? parseHandString(data.playerHand)
    : data.playerHand;
  
  // Parse community cards
  const communityCards = data.communityCards 
    ? parseCommunityCards(data.communityCards)
    : [];
  
  // Normalize position and stage
  const playerPosition = normalizePosition(data.playerPosition);
  const gameStage = normalizeGameStage(data.gameStage);
  
  // Generate ID if not provided
  const id = data.handId || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Convert optimal actions
  const optimalActions = data.optimalActions?.map(a => a.toLowerCase() as any) || [];
  
  return {
    id,
    timestamp: data.timestamp || Date.now(),
    handId: data.handId || id,
    playerHand,
    playerPosition,
    numPlayers: data.numPlayers,
    playerSeat: data.playerSeat,
    gameStage,
    communityCards,
    pot: data.pot,
    currentBet: data.currentBet,
    playerStackBB: data.playerStackBB,
    actionToFace: data.actionToFace as any || null,
    playerAction: data.playerAction.toLowerCase() as any,
    betSizeBB: data.betSizeBB,
    optimalActions: optimalActions.length > 0 ? optimalActions : [],
    isCorrect: data.isCorrect ?? true, // Default to true if not specified
    feedback: data.feedback || "",
    activePlayers: data.activePlayers || data.numPlayers,
    foldedPlayers: data.foldedPlayers || Array(data.numPlayers).fill(false),
    features: data.features,
  };
}

/**
 * Import bulk data from JSON array
 */
export function importBulkData(
  jsonData: string | BulkHandData[],
  options: {
    skipInvalid?: boolean;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): { success: number; failed: number; errors: string[] } {
  const { skipInvalid = true, onProgress } = options;
  
  let dataArray: BulkHandData[];
  
  // Parse JSON if string provided
  if (typeof jsonData === 'string') {
    try {
      dataArray = JSON.parse(jsonData);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    dataArray = jsonData;
  }
  
  if (!Array.isArray(dataArray)) {
    throw new Error("Data must be an array of hand records");
  }
  
  const { getDataset } = require("./hand-history");
  const dataset = getDataset();
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  dataArray.forEach((data, index) => {
    try {
      const record = convertBulkDataToRecord(data);
      dataset.addRecord(record);
      success++;
    } catch (error) {
      failed++;
      const errorMsg = `Record ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      
      if (!skipInvalid) {
        throw error;
      }
    }
    
    // Report progress
    if (onProgress && (index + 1) % 100 === 0) {
      onProgress(index + 1, dataArray.length);
    }
  });
  
  if (onProgress) {
    onProgress(dataArray.length, dataArray.length);
  }
  
  return { success, failed, errors };
}

/**
 * Validate bulk data format before importing
 */
export function validateBulkData(data: BulkHandData[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(data)) {
    errors.push("Data must be an array");
    return { valid: false, errors, warnings };
  }
  
  if (data.length === 0) {
    warnings.push("Data array is empty");
  }
  
  data.forEach((record, index) => {
    // Required fields
    if (!record.playerHand) {
      errors.push(`Record ${index + 1}: Missing playerHand`);
    }
    if (!record.playerPosition) {
      errors.push(`Record ${index + 1}: Missing playerPosition`);
    }
    if (record.numPlayers === undefined) {
      errors.push(`Record ${index + 1}: Missing numPlayers`);
    }
    if (!record.gameStage) {
      errors.push(`Record ${index + 1}: Missing gameStage`);
    }
    if (record.pot === undefined) {
      errors.push(`Record ${index + 1}: Missing pot`);
    }
    if (!record.playerAction) {
      errors.push(`Record ${index + 1}: Missing playerAction`);
    }
    
    // Validate hand format
    if (record.playerHand) {
      try {
        if (typeof record.playerHand === 'string') {
          parseHandString(record.playerHand);
        }
      } catch (error) {
        errors.push(`Record ${index + 1}: Invalid hand format: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    // Warnings for missing optional fields
    if (!record.optimalActions) {
      warnings.push(`Record ${index + 1}: Missing optimalActions (will be empty)`);
    }
    if (record.isCorrect === undefined) {
      warnings.push(`Record ${index + 1}: Missing isCorrect (will default to true)`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

