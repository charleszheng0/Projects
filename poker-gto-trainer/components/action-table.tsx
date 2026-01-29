"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";
import { getRealisticFrequencies, ActionFrequency } from "@/lib/gto-frequencies";
import { calculateEV } from "@/lib/ev-calculator";
import { calculateLeakWeightedEV } from "@/lib/leak-weighting";
import { getWhyBetContent } from "@/lib/why-bet";
import { getAvailableActions, validateAction } from "@/lib/action-validation";
import { ContinueButton } from "./continue-button";
import { formatBB } from "@/lib/utils";

const EV_DELTA_THRESHOLD = 0.15;

function formatEV(value: number, showDecimals: boolean): string {
  const sign = value >= 0 ? "+" : "";
  if (showDecimals) {
    return `${sign}${value.toFixed(2)}`;
  }
  return `${sign}${Math.round(value)}`;
}

function getActionDisplay(
  action: string,
  betSize: number | undefined,
  pot: number,
  currentBet: number
): string {
  if (action === "fold") return "Fold";
  if (action === "check") return "Check";
  if (action === "call") return currentBet > 0 ? `Call ${formatBB(currentBet)} BB` : "Call";
  if (action === "bet" || action === "raise") {
    if (betSize && pot > 0) {
      const pct = Math.round((betSize / pot) * 100);
      return `${action === "bet" ? "Bet" : "Raise"} ${pct}%`;
    }
    return action === "bet" ? "Bet" : "Raise";
  }
  return action;
}

function buildFallbackActions(
  available: string[],
  pot: number,
  currentBet: number,
  playerStackBB: number | null
): ActionFrequency[] {
  const options: ActionFrequency[] = [];
  if (available.includes("fold")) {
    options.push({ action: "fold", frequency: 0, label: "Fold" });
  }
  if (available.includes("call")) {
    options.push({ action: "call", frequency: 0, label: "Call" });
  }
  if (available.includes("check")) {
    options.push({ action: "check", frequency: 0, label: "Check" });
  }

  const betSizes = pot > 0
    ? [0.33, 0.66, 1].map(mult => Math.round(pot * mult * 10) / 10)
    : [currentBet * 2].filter(size => size > 0);

  if (available.includes("bet")) {
    betSizes.forEach(size => {
      if (size > 0 && (!playerStackBB || size <= playerStackBB)) {
        options.push({ action: "bet", betSize: size, frequency: 0, label: `Bet ${formatBB(size)} BB` });
      }
    });
  }

  if (available.includes("raise")) {
    const raiseSizes = currentBet > 0
      ? [2.5, 3, 4].map(mult => Math.round(currentBet * mult * 10) / 10)
      : betSizes;
    raiseSizes.forEach(size => {
      if (size > currentBet && (!playerStackBB || size <= playerStackBB)) {
        options.push({ action: "raise", betSize: size, frequency: 0, label: `Raise ${formatBB(size)} BB` });
      }
    });
  }

  return options;
}

export function ActionTable() {
  const {
    playerHand,
    communityCards,
    gameStage,
    actionToFace,
    isPlayerTurn,
    currentBet,
    pot,
    bigBlind,
    playerStackBB,
    playerPosition,
    numPlayers,
    selectAction,
    confirmBetSize,
    optimalActions,
    playerBetsBB,
    playerSeat,
    opponentArchetype,
    strategyMode,
    showEVDecimals,
    lastAction,
    lastRaiseIncrement,
  } = useGameStore();

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const { rows, gtoBest, exploitBest, exploitGain } = useMemo(() => {
    if (!playerHand) {
      return { rows: [], gtoBest: null, exploitBest: null, exploitGain: 0 };
    }

    const playerCurrentBet = playerBetsBB?.[playerSeat] || 0;
    const available = getAvailableActions(
      gameStage,
      actionToFace,
      currentBet,
      playerCurrentBet,
      gameStage === "preflop"
    );

    const baseFrequencies = optimalActions.length > 0
      ? getRealisticFrequencies(
          playerHand,
          playerPosition,
          gameStage,
          pot,
          currentBet,
          actionToFace,
          optimalActions as Action[],
          numPlayers,
          playerStackBB
        )
      : [];

    const filtered = baseFrequencies.filter(freq => available.includes(freq.action));
    const actionOptions = filtered.length > 0
      ? filtered
      : buildFallbackActions(available, pot, currentBet, playerStackBB);

    if (actionOptions.length === 0) {
      return { rows: [], gtoBest: null, exploitBest: null, exploitGain: 0 };
    }

    const rowsWithEV = actionOptions.map((option) => {
      const gtoEV = calculateEV(
        playerHand,
        communityCards,
        gameStage,
        pot,
        currentBet,
        option.action,
        option.betSize,
        numPlayers
      ).ev;

      const exploitEV = calculateLeakWeightedEV(
        playerHand,
        communityCards,
        gameStage,
        pot,
        currentBet,
        option.action,
        option.betSize,
        numPlayers,
        opponentArchetype
      );

      const evDelta = exploitEV - gtoEV;
      return { ...option, gtoEV, exploitEV, evDelta };
    });

    const gtoBest = rowsWithEV.reduce((best, row) => (row.gtoEV > best.gtoEV ? row : best), rowsWithEV[0]);
    const exploitBest = rowsWithEV.reduce((best, row) => (row.exploitEV > best.exploitEV ? row : best), rowsWithEV[0]);
    const exploitGain = exploitBest ? exploitBest.exploitEV - gtoBest.gtoEV : 0;

    return { rows: rowsWithEV, gtoBest, exploitBest, exploitGain };
  }, [
    playerHand,
    communityCards,
    gameStage,
    actionToFace,
    currentBet,
    pot,
    playerPosition,
    numPlayers,
    playerStackBB,
    optimalActions,
    playerBetsBB,
    playerSeat,
    opponentArchetype,
  ]);

  if (!playerHand || rows.length === 0) {
    return null;
  }

  const showAnalysis = lastAction !== null;

  const handleActionClick = (row: ActionFrequency) => {
    if (!isPlayerTurn) return;

    const state = useGameStore.getState();
    const playerCurrentBet = state.playerBetsBB?.[state.playerSeat] || 0;
    const validation = validateAction(
      row.action as Action | BettingAction,
      gameStage,
      actionToFace,
      currentBet,
      playerCurrentBet,
      playerStackBB || 100,
      bigBlind,
      row.betSize,
      lastRaiseIncrement
    );

    if (!validation.isValid) return;

    if (row.action === "fold" || row.action === "check" || row.action === "call") {
      selectAction(row.action);
      return;
    }

    if (row.betSize && row.betSize > 0) {
      useGameStore.setState({
        pendingAction: row.action as Action,
        showBetSizingModal: false,
      });
      confirmBetSize(row.betSize);
    } else {
      selectAction(row.action);
    }
  };

  return (
    <div className="w-full">
      {showAnalysis && (
        <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-wide">GTO</span>
          {gtoBest && (
            <span className="text-gray-200">
              {getActionDisplay(gtoBest.action, gtoBest.betSize, pot, currentBet)} - {formatEV(gtoBest.gtoEV, showEVDecimals)} BB
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-wide">Exploit</span>
          {exploitBest && (
            <span className="text-gray-200">
              {getActionDisplay(exploitBest.action, exploitBest.betSize, pot, currentBet)} - {formatEV(exploitBest.exploitEV, showEVDecimals)} BB
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded border text-[11px] ${
              exploitGain >= EV_DELTA_THRESHOLD
                ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
                : "border-gray-700 text-gray-400 bg-gray-900/40"
            }`}
          >
            Delta {formatEV(exploitGain, showEVDecimals)} BB
          </span>
        </div>
      </div>
      )}

      {showAnalysis && strategyMode === "exploit" && exploitGain < EV_DELTA_THRESHOLD && (
        <div className="mb-3 text-xs text-gray-400">GTO is sufficient here.</div>
      )}

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.2fr] gap-0 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-800 bg-[#121212]">
          <div>Action</div>
          <div>Frequency</div>
          <div>EV</div>
          <div className="text-right">Info</div>
        </div>
        <div>
          {rows.map((row) => {
            const rowId = `${row.action}-${row.betSize || "none"}`;
            const isExploit = strategyMode === "exploit";
            const displayEV = isExploit ? row.exploitEV : row.gtoEV;
            const frequency = row.frequency || 0;
            const why = getWhyBetContent(
              playerHand,
              communityCards,
              gameStage,
              row.action,
              row.betSize,
              pot,
              opponentArchetype,
              isExploit
            );
            return (
              <div
                key={rowId}
                className={`grid grid-cols-[1.6fr_0.8fr_0.8fr_0.2fr] gap-0 px-4 py-3 border-b border-gray-800 last:border-b-0 transition-colors ${
                  isPlayerTurn ? "hover:bg-gray-900/40 cursor-pointer" : "opacity-60 cursor-not-allowed"
                }`}
                onClick={() => handleActionClick(row)}
                title={isPlayerTurn ? "" : "Not your turn"}
              >
                <div className="text-sm text-gray-100">
                  {getActionDisplay(row.action, row.betSize, pot, currentBet)}
                </div>
                <div className="text-sm text-gray-300">
                  {showAnalysis ? `${frequency.toFixed(1)}%` : "--"}
                </div>
                <div className="text-sm text-gray-200">
                  {showAnalysis ? `${formatEV(displayEV, showEVDecimals)} BB` : "--"}
                  {showAnalysis && isExploit && (
                    <span
                      className={`ml-2 text-xs ${
                        row.evDelta >= EV_DELTA_THRESHOLD ? "text-emerald-300" : "text-gray-500"
                      }`}
                    >
                      ({row.evDelta >= 0 ? "+" : ""}{formatEV(row.evDelta, showEVDecimals)} BB)
                    </span>
                  )}
                </div>
                <div className="relative flex justify-end">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-200"
                    onMouseEnter={() => setActiveTooltip(rowId)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTooltip(activeTooltip === rowId ? null : rowId);
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                  {activeTooltip === rowId && (
                    <div className="absolute right-6 top-0 z-20 w-64 rounded-md border border-gray-700 bg-[#111111] p-3 text-xs text-gray-200 shadow-lg">
                      <div className="text-sm font-semibold text-gray-100 mb-2">{why.title}</div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[11px] uppercase text-gray-400 mb-1">Targets</div>
                          {why.targets.map((item) => (
                            <div key={item}>- {item}</div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-gray-400 mb-1">Folds Out</div>
                          {why.foldsOut.map((item) => (
                            <div key={item}>- {item}</div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-gray-400 mb-1">Continues</div>
                          {why.continues.map((item) => (
                            <div key={item}>- {item}</div>
                          ))}
                        </div>
                        {why.exploitNote.length > 0 && (
                          <div>
                            <div className="text-[11px] uppercase text-gray-400 mb-1">Exploit Note</div>
                            {why.exploitNote.map((item) => (
                              <div key={item}>- {item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4">
        <ContinueButton />
      </div>
    </div>
  );
}
