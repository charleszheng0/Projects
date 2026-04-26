"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { Action } from "@/lib/gto";
import { BettingAction } from "@/lib/postflop-gto";
import { getRealisticFrequencies, ActionFrequency } from "@/lib/gto-frequencies";
import { formatBB } from "@/lib/utils";
import { validateAction, getAvailableActions } from "@/lib/action-validation";
import { getWhyBetContent } from "@/lib/why-bet";
import { analyzeBoardTexture } from "@/lib/sidebar-analysis";
import { ContinueButton } from "./continue-button";

type ActionButton = {
  id: string;
  action: Action | BettingAction;
  betSize?: number;
  label: string;
  frequency: number;
  enabled: boolean;
  isAllIn?: boolean;
};

function formatPercent(pot: number, betSize?: number): number {
  if (!betSize || pot <= 0) return 0;
  return Math.round((betSize / pot) * 100);
}

function buildSizeLabel(
  action: "bet" | "raise",
  pot: number,
  betSize: number
): string {
  const percent = formatPercent(pot, betSize);
  return `${action === "bet" ? "Bet" : "Raise"} ${percent}% (${formatBB(betSize)} BB)`;
}

export function ActionButtonsWithFrequencies() {
  const {
    playerHand,
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
    lastRaiseIncrement,
    opponentArchetype,
    strategyMode,
    communityCards,
    lastAction,
    betSizeBB,
  } = useGameStore();

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const {
    buttons,
    highestFrequencyId,
  } = useMemo(() => {
    if (!playerHand) {
      return { buttons: [] as ActionButton[], highestFrequencyId: null as string | null };
    }

    const isPreflop = gameStage === "preflop";
    const playerCurrentBet = playerBetsBB?.[playerSeat] || 0;
    const availableActions = getAvailableActions(
      gameStage,
      actionToFace,
      currentBet,
      playerCurrentBet,
      isPreflop
    );

    const canCheck = availableActions.includes("check");
    const canCall = availableActions.includes("call");
    const canFold = availableActions.includes("fold");
    const canBet = availableActions.includes("bet");
    const canRaise = availableActions.includes("raise");
    const toCall = Math.max(0, currentBet - playerCurrentBet);
    const remainingStack = Math.max(0, (playerStackBB || 0) - playerCurrentBet);
    const maxButtons = 6;
    const minButtons = 5;
    const boardTexture = analyzeBoardTexture(communityCards, playerHand, null);
    const stackToPot = pot > 0 ? remainingStack / pot : 0;

    const actionFrequencies = optimalActions.length > 0
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

    const frequencyMap = new Map<string, number>();
    actionFrequencies.forEach(freq => {
      const key = `${freq.action}-${freq.betSize ?? "none"}`;
      frequencyMap.set(key, freq.frequency || 0);
    });

    const primaryButtons: ActionButton[] = [];

    const foldValidation = validateAction(
      "fold",
      gameStage,
      actionToFace,
      currentBet,
      playerCurrentBet,
      remainingStack,
      bigBlind,
      undefined,
      lastRaiseIncrement
    );
    primaryButtons.push({
      id: "fold",
      action: "fold",
      label: "Fold",
      frequency: frequencyMap.get("fold-none") || 0,
      enabled: canFold && foldValidation.isValid,
    });

    if (toCall > 0) {
      const callValidation = validateAction(
        "call",
        gameStage,
        actionToFace,
        currentBet,
        playerCurrentBet,
        remainingStack,
        bigBlind,
        undefined,
        lastRaiseIncrement
      );
      primaryButtons.push({
        id: "call",
        action: "call",
        label: `Call (${formatBB(toCall)} BB)`,
        frequency: frequencyMap.get("call-none") || 0,
        enabled: canCall && callValidation.isValid,
      });
    } else {
      const checkValidation = validateAction(
        "check",
        gameStage,
        actionToFace,
        currentBet,
        playerCurrentBet,
        remainingStack,
        bigBlind,
        undefined,
        lastRaiseIncrement
      );
      primaryButtons.push({
        id: "check",
        action: "check",
        label: "Check",
        frequency: frequencyMap.get("check-none") || 0,
        enabled: canCheck && checkValidation.isValid,
      });
    }

    const sizeAction: "bet" | "raise" = gameStage === "preflop" ? "raise" : (toCall > 0 ? "raise" : "bet");
    const sizeActionAllowed = sizeAction === "bet" ? canBet : canRaise;
    let sizeButtons: ActionButton[] = [];

    if (sizeActionAllowed) {
      const solverSizes = actionFrequencies
        .filter(freq => freq.action === sizeAction && (freq.frequency || 0) > 0)
        .map(freq => freq.betSize)
        .filter((size): size is number => typeof size === "number" && size > 0);

      const maxSizeButtons = Math.max(0, maxButtons - primaryButtons.length);
      const desiredTotal = Math.min(maxButtons, Math.max(minButtons, primaryButtons.length));
      const desiredSizeCount = Math.max(0, desiredTotal - primaryButtons.length);

      const candidatePercents: number[] = [];
      if (boardTexture.wetness === "dry") {
        candidatePercents.push(0.75, 1.0, 1.25);
      } else if (boardTexture.wetness === "very-wet") {
        candidatePercents.push(0.25, 0.33, 0.5, 0.75);
      } else {
        candidatePercents.push(0.33, 0.5, 0.66, 0.75);
      }

      if (stackToPot > 0 && stackToPot < 1.1) {
        candidatePercents.unshift(0.75, 1.0);
      }
      if (stackToPot > 2) {
        candidatePercents.push(1.25, 1.5);
      }

      const contextualSizes = isPreflop
        ? [2, 2.5, 3, 4, 5].map(mult => Math.round(bigBlind * mult * 10) / 10)
        : candidatePercents.map(pct => Math.round(pot * pct * 10) / 10);

      const sizePool = Array.from(new Set([...solverSizes, ...contextualSizes])).filter(size => size > 0);

      const sizedButtons = sizePool.map(size => {
        const label = buildSizeLabel(sizeAction, pot, size);
        const frequency = frequencyMap.get(`${sizeAction}-${size}`) || 0;
        const validation = validateAction(
          sizeAction,
          gameStage,
          actionToFace,
          currentBet,
          playerCurrentBet,
          remainingStack,
          bigBlind,
          size,
          lastRaiseIncrement
        );

        return {
          id: `${sizeAction}-${size}`,
          action: sizeAction,
          betSize: size,
          label,
          frequency,
          enabled: validation.isValid,
        };
      }).filter(button => button.enabled);

      const solverFirst = solverSizes.length > 0
        ? sizedButtons
            .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        : sizedButtons.sort((a, b) => (a.betSize || 0) - (b.betSize || 0));

      sizeButtons = solverFirst.slice(0, Math.min(maxSizeButtons, Math.max(desiredSizeCount, 0)));
    }

    const allInSize = remainingStack + playerCurrentBet;
    if (allInSize > 0) {
      const allInId = `allin-${allInSize}`;
      if (!sizeButtons.some(button => button.betSize === allInSize)) {
        const maxSizeButtons = Math.max(0, maxButtons - primaryButtons.length);
        const allowAllIn = stackToPot <= 1.2 || sizeButtons.length < maxSizeButtons;
        if (allowAllIn) {
          if (sizeButtons.length >= maxSizeButtons) {
            sizeButtons = sizeButtons.slice(0, maxSizeButtons - 1);
          }
          const validation = validateAction(
            sizeAction,
            gameStage,
            actionToFace,
            currentBet,
            playerCurrentBet,
            remainingStack,
            bigBlind,
            allInSize,
            lastRaiseIncrement
          );
          sizeButtons.push({
            id: allInId,
            action: sizeAction,
            betSize: allInSize,
            label: `All-in (${formatBB(allInSize)} BB)`,
            frequency: 0,
            enabled: sizeActionAllowed && validation.isValid,
            isAllIn: true,
          });
        }
      }
    }

    const orderedSizeButtons = sizeButtons.sort((a, b) => {
      if (a.isAllIn && !b.isAllIn) return 1;
      if (b.isAllIn && !a.isAllIn) return -1;
      return (a.betSize || 0) - (b.betSize || 0);
    });

    let allButtons = [...primaryButtons, ...orderedSizeButtons].slice(0, maxButtons);

    if (allButtons.length < minButtons && sizeActionAllowed) {
      const remainingSlots = Math.min(maxButtons, minButtons) - allButtons.length;
      const fallbackPool = orderedSizeButtons.filter(btn => !allButtons.some(existing => existing.id === btn.id));
      allButtons = [...allButtons, ...fallbackPool.slice(0, remainingSlots)];
    }
    const highestFrequency = Math.max(0, ...allButtons.map(button => button.frequency || 0));
    const highestFrequencyId = highestFrequency > 0
      ? allButtons.find(button => button.frequency === highestFrequency)?.id || null
      : null;

    return { buttons: allButtons, highestFrequencyId };
  }, [
    playerHand,
    gameStage,
    actionToFace,
    currentBet,
    pot,
    bigBlind,
    playerStackBB,
    playerPosition,
    numPlayers,
    optimalActions,
    playerBetsBB,
    playerSeat,
    lastRaiseIncrement,
  ]);

  useEffect(() => {
    if (!lastAction) return;
    const selected = buttons.find(btn => {
      if (btn.action !== lastAction) return false;
      if (!btn.betSize || !betSizeBB) return true;
      return Math.abs(btn.betSize - betSizeBB) < 0.01;
    });
    if (selected) {
      setSelectedId(selected.id);
      setIsConfirming(true);
      const timer = setTimeout(() => setIsConfirming(false), 400);
      return () => clearTimeout(timer);
    }
  }, [lastAction, betSizeBB, buttons]);

  useEffect(() => {
    if (isPlayerTurn) {
      setSelectedId(null);
      setIsConfirming(false);
    }
  }, [isPlayerTurn]);

  const shouldRenderButtons = !!playerHand && buttons.length > 0;

  const handleActionClick = (button: ActionButton) => {
    if (!isPlayerTurn || !button.enabled) return;
    setSelectedId(button.id);

    if (button.action === "fold" || button.action === "check" || button.action === "call") {
      selectAction(button.action);
      return;
    }

    if (button.betSize && button.betSize > 0) {
      useGameStore.setState({
        pendingAction: button.action as Action,
        showBetSizingModal: false,
      });
      confirmBetSize(button.betSize);
    }
  };

  return (
    <div className="action-button-row">
      <div className="grid grid-flow-col auto-cols-fr gap-2">
        {shouldRenderButtons && buttons.map(button => {
          const isHighlight = highestFrequencyId === button.id && button.frequency > 0;
          const isSelected = selectedId === button.id;
          const isDisabled = !isPlayerTurn || !button.enabled;
          const why = getWhyBetContent(
            playerHand,
            communityCards,
            gameStage,
            button.action,
            button.betSize,
            pot,
            opponentArchetype,
            strategyMode === "exploit"
          );
          const tooltipTitle = button.betSize
            ? `Why ${button.action === "raise" ? "Raise" : button.action.charAt(0).toUpperCase() + button.action.slice(1)} ${formatPercent(pot, button.betSize)}% (${formatBB(button.betSize)} BB)`
            : why.title;

          return (
            <div key={button.id} className="relative">
              <button
                type="button"
                onClick={() => handleActionClick(button)}
                disabled={isDisabled}
                className={`w-full min-h-[84px] rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200 flex flex-col justify-between ${
                  isDisabled
                    ? "bg-gray-900/40 text-gray-500 border-gray-800 cursor-not-allowed"
                    : button.action === "fold"
                      ? "bg-[#6B6B6B] text-white border-[#6B6B6B] hover:brightness-110"
                      : button.action === "check"
                        ? "bg-[#00ADEF] text-white border-[#00ADEF] hover:brightness-110"
                        : button.isAllIn
                          ? "bg-[#B71C1C] text-white border-[#B71C1C] hover:brightness-110"
                          : "bg-[#C72C48] text-white border-[#C72C48] hover:brightness-110"
                } ${isHighlight ? "ring-2 ring-amber-400/50 border-amber-400/60" : ""} ${
                  !isDisabled && selectedId && !isSelected ? "opacity-70" : ""
                } ${
                  isSelected ? "shadow-[0_0_18px_rgba(255,255,255,0.15)] brightness-110" : ""
                } ${
                  isSelected && isConfirming && button.isAllIn
                    ? "scale-[1.03] shadow-[0_0_22px_rgba(183,28,28,0.6)]"
                    : isSelected && isConfirming && (button.action === "bet" || button.action === "raise")
                      ? "scale-[1.015] shadow-[0_0_18px_rgba(199,44,72,0.5)]"
                      : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{button.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-gray-400 hover:text-gray-200"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTooltip(activeTooltip === button.id ? null : button.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveTooltip(activeTooltip === button.id ? null : button.id);
                      }
                    }}
                    onMouseEnter={() => setActiveTooltip(button.id)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    aria-label="Why this bet"
                  >
                    <Info className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {button.frequency > 0 ? `${button.frequency.toFixed(1)}%` : ""}
                </div>
              </button>

              {activeTooltip === button.id && (
                <div className="absolute left-2 top-[90px] z-20 w-64 rounded-md border border-gray-700 bg-[#111111] p-3 text-xs text-gray-200 shadow-lg">
                  <div className="text-sm font-semibold text-gray-100 mb-2">{tooltipTitle}</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-[11px] uppercase text-gray-400 mb-1">Targets</div>
                      {why.targets.map(item => (
                        <div key={item}>- {item}</div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-gray-400 mb-1">Folds Out</div>
                      {why.foldsOut.map(item => (
                        <div key={item}>- {item}</div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-gray-400 mb-1">Continues</div>
                      {why.continues.map(item => (
                        <div key={item}>- {item}</div>
                      ))}
                    </div>
                    {why.exploitNote.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase text-gray-400 mb-1">Exploit Note</div>
                        {why.exploitNote.map(item => (
                          <div key={item}>- {item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
