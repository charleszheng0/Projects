"use client";

import { useEffect, useState } from "react";
import { getSessionManager, PerformanceMetrics } from "@/lib/session-tracking";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface TrainingStatsPanelProps {
  compact?: boolean;
}

export function TrainingStatsPanel({ compact = false }: TrainingStatsPanelProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [sessionManager] = useState(() => getSessionManager());

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    const newMetrics = sessionManager.calculatePerformanceMetrics();
    setMetrics(newMetrics);
  };

  if (!metrics) {
    return (
      <Card className="p-4 bg-gray-800/50 border-gray-700">
        <div className="text-gray-400 text-sm">Loading stats...</div>
      </Card>
    );
  }

  const { currentSession, allTimeStats } = metrics;

  if (compact) {
    return (
      <div className="space-y-3">
        {currentSession && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Hands:</span>
              <span className="text-white font-semibold">{currentSession.totalHands}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Accuracy:</span>
              <span className={`font-semibold ${
                currentSession.accuracy >= 0.7 ? "text-green-400" :
                currentSession.accuracy >= 0.5 ? "text-yellow-400" : "text-red-400"
              }`}>
                {(currentSession.accuracy * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Net EV:</span>
              <span className={`font-semibold ${
                currentSession.netEV >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {currentSession.netEV >= 0 ? "+" : ""}{currentSession.netEV.toFixed(1)} BB
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Session Stats</h2>
      {currentSession ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Hands Played:</span>
              <span className="text-white font-semibold">{currentSession.totalHands}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Decisions:</span>
              <span className="text-white font-semibold">{currentSession.totalDecisions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Correct:</span>
              <span className="text-green-400 font-semibold">{currentSession.correctDecisions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Incorrect:</span>
              <span className="text-red-400 font-semibold">{currentSession.incorrectDecisions}</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">By Stage</h3>
            {Object.entries(currentSession.byStage).map(([stage, stats]) => (
              stats.total > 0 && (
                <div key={stage} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 capitalize">{stage}:</span>
                    <span className={`font-semibold ${
                      stats.correct / stats.total >= 0.7 ? "text-green-400" :
                      stats.correct / stats.total >= 0.5 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {((stats.correct / stats.total) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        stats.correct / stats.total >= 0.7 ? "bg-green-500" :
                        stats.correct / stats.total >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )
            ))}
          </div>

          {allTimeStats.totalSessions > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">All-Time</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sessions:</span>
                  <span className="text-white">{allTimeStats.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lifetime Accuracy:</span>
                  <span className={`font-semibold ${
                    allTimeStats.lifetimeAccuracy >= 0.7 ? "text-green-400" :
                    allTimeStats.lifetimeAccuracy >= 0.5 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {(allTimeStats.lifetimeAccuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-sm">No session data yet</div>
      )}
    </div>
  );
}

