"use client";

import { useGameStore } from "@/store/game-store";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { Action } from "@/lib/gto";

export function FeedbackModal() {
  const {
    showFeedbackModal,
    isCorrect,
    lastAction,
    optimalActions,
    explanation,
    postFlopExplanation,
    gameStage,
    pot,
    closeFeedbackModal,
    betSizeBB,
    betSizeAnalysis,
    postFlopBetSizeAnalysis,
  } = useGameStore();

  // Only show modal if we have an explanation for the current stage
  const isPreflop = gameStage === "preflop";
  const hasCurrentExplanation = isPreflop ? explanation : postFlopExplanation;
  
  // Always show modal if showFeedbackModal is true, even if explanation is null
  // (this prevents modal from disappearing if game stage changes)
  if (!showFeedbackModal) {
    return null;
  }
  
  // If we don't have an explanation yet, show a loading state or wait
  if (!hasCurrentExplanation) {
    return null;
  }
  
  const currentExplanation = isPreflop ? explanation : postFlopExplanation;

  const actionLabels: Record<string, string> = {
    fold: "Fold",
    call: "Call",
    bet: "Bet",
    raise: "Raise",
    check: "Check",
    "all-in": "All-In",
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      // Don't close on backdrop click - require explicit close button
    >
      <div 
        className="w-full max-w-4xl p-4 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-gray-900 border-gray-700 shadow-2xl">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {isCorrect ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </h2>
                  {lastAction && (
                    <p className="text-gray-400 text-sm mt-1">
                      You chose: <span className="font-semibold text-white">{actionLabels[lastAction]}</span>
                      {betSizeBB && ` (${betSizeBB} BB)`}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeFeedbackModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Correct Actions */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                {optimalActions.length > 1 ? "Correct Actions:" : "Correct Action:"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {optimalActions.map((action) => (
                  <Badge
                    key={action}
                    variant="default"
                    className="bg-green-600 text-white px-4 py-2 text-base"
                  >
                    {actionLabels[action]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Hand Strength Category & Street Info */}
            {currentExplanation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hand Strength Category */}
                {currentExplanation.handStrengthCategory && (
                  <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-500">
                        Hand Category
                      </Badge>
                    </div>
                    <h4 className="text-white font-semibold mb-1">
                      {currentExplanation.handStrengthDescription}
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {currentExplanation.handStrengthExplanation}
                    </p>
                  </div>
                )}
                
                {/* Street Information (for postflop) */}
                {currentExplanation.streetNumber && (
                  <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-500">
                        Current Street
                      </Badge>
                    </div>
                    <h4 className="text-white font-semibold mb-1">
                      {currentExplanation.streetDescription}
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {currentExplanation.streetExplanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {currentExplanation && (
              <>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Hand Analysis:</h3>
                  <p className="text-gray-300 text-base leading-relaxed">
                    {currentExplanation.explanation}
                  </p>
                </div>

                {/* Reasoning */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Why This Decision is Correct:</h3>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-200 text-base leading-relaxed whitespace-pre-line">
                      {currentExplanation.reasoning}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Bet Sizing Analysis - Only show if action was bet/raise AND action was correct */}
            {isCorrect && ((betSizeAnalysis && (lastAction === "raise")) || (postFlopBetSizeAnalysis && (lastAction === "bet" || lastAction === "raise"))) && betSizeBB && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Bet Sizing Analysis:</h3>
                {betSizeAnalysis ? (
                  // Preflop analysis
                  <div className={`rounded-lg p-4 border ${
                    betSizeAnalysis.isOptimal 
                      ? "bg-green-900/30 border-green-700" 
                      : "bg-yellow-900/30 border-yellow-700"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {betSizeAnalysis.isOptimal ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <p className={`font-semibold ${
                        betSizeAnalysis.isOptimal ? "text-green-300" : "text-yellow-300"
                      }`}>
                        {betSizeAnalysis.feedback}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-gray-300 text-sm mb-2">
                        <span className="font-semibold">Optimal Range:</span> {betSizeAnalysis.sizeRange.min}-{betSizeAnalysis.sizeRange.max} BB
                      </p>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {betSizeAnalysis.reasoning}
                      </p>
                    </div>
                  </div>
                ) : postFlopBetSizeAnalysis ? (
                  // Post-flop analysis
                  <div className={`rounded-lg p-4 border ${
                    postFlopBetSizeAnalysis.isOptimal 
                      ? "bg-green-900/30 border-green-700" 
                      : "bg-yellow-900/30 border-yellow-700"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {postFlopBetSizeAnalysis.isOptimal ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <p className={`font-semibold ${
                        postFlopBetSizeAnalysis.isOptimal ? "text-green-300" : "text-yellow-300"
                      }`}>
                        {postFlopBetSizeAnalysis.feedback}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-gray-300 text-sm mb-2">
                        <span className="font-semibold">Optimal Range:</span> {postFlopBetSizeAnalysis.sizeRangeBB.min}-{postFlopBetSizeAnalysis.sizeRangeBB.max} BB ({postFlopBetSizeAnalysis.sizeRangePotPercent.min}-{postFlopBetSizeAnalysis.sizeRangePotPercent.max}% pot)
                      </p>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {postFlopBetSizeAnalysis.reasoning}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFeedbackModal();
                }}
                variant="default"
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

