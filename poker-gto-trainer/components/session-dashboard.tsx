"use client";

import { useState, useEffect } from "react";
import { getSessionManager, PerformanceMetrics } from "@/lib/session-tracking";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function SessionDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [sessionManager] = useState(() => getSessionManager());

  useEffect(() => {
    loadMetrics();
    // Refresh every 5 seconds
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    const newMetrics = sessionManager.calculatePerformanceMetrics();
    setMetrics(newMetrics);
  };

  if (!metrics) {
    return (
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <div className="text-center text-gray-400">Loading metrics...</div>
      </Card>
    );
  }

  const { currentSession, allTimeStats, trends } = metrics;

  return (
    <div className="space-y-6">
      {/* Current Session */}
      {currentSession && (
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Current Session</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Hands Played</div>
              <div className="text-2xl font-bold text-white">{currentSession.totalHands}</div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Accuracy</div>
              <div className={`text-2xl font-bold ${
                currentSession.accuracy >= 0.7 ? "text-green-400" :
                currentSession.accuracy >= 0.5 ? "text-yellow-400" : "text-red-400"
              }`}>
                {(currentSession.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Mistakes/100</div>
              <div className="text-2xl font-bold text-red-400">
                {currentSession.mistakesPer100Hands.toFixed(1)}
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Net EV</div>
              <div className={`text-2xl font-bold ${
                currentSession.netEV >= 0 ? "text-green-400" : "text-red-400"
              }`}>
                {currentSession.netEV >= 0 ? "+" : ""}{currentSession.netEV.toFixed(2)} BB
              </div>
            </div>
          </div>

          {/* By Stage Breakdown */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Performance by Stage</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(currentSession.byStage).map(([stage, stats]) => (
                <div key={stage} className="bg-gray-900/50 p-3 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1 capitalize">{stage}</div>
                  <div className="text-white font-semibold">{stats.total} decisions</div>
                  <div className={`text-sm ${
                    stats.total > 0 && stats.correct / stats.total >= 0.7 ? "text-green-400" :
                    stats.total > 0 && stats.correct / stats.total >= 0.5 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(0) : 0}% correct
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* All-Time Statistics */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">All-Time Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Sessions</div>
            <div className="text-2xl font-bold text-white">{allTimeStats.totalSessions}</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Hands</div>
            <div className="text-2xl font-bold text-white">{allTimeStats.totalHands}</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Lifetime Accuracy</div>
            <div className={`text-2xl font-bold ${
              allTimeStats.lifetimeAccuracy >= 0.7 ? "text-green-400" :
              allTimeStats.lifetimeAccuracy >= 0.5 ? "text-yellow-400" : "text-red-400"
            }`}>
              {(allTimeStats.lifetimeAccuracy * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Lifetime Net EV</div>
            <div className={`text-2xl font-bold ${
              (allTimeStats.lifetimeEVGain - allTimeStats.lifetimeEVLoss) >= 0 ? "text-green-400" : "text-red-400"
            }`}>
              {((allTimeStats.lifetimeEVGain - allTimeStats.lifetimeEVLoss) >= 0 ? "+" : "")}
              {(allTimeStats.lifetimeEVGain - allTimeStats.lifetimeEVLoss).toFixed(2)} BB
            </div>
          </div>
        </div>

        {/* Best Session */}
        {allTimeStats.bestSession && (
          <div className="mt-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Best Session</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Accuracy:</span>
                <span className="text-green-400 font-semibold ml-2">
                  {(allTimeStats.bestSession.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Hands:</span>
                <span className="text-white font-semibold ml-2">
                  {allTimeStats.bestSession.totalHands}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Net EV:</span>
                <span className="text-green-400 font-semibold ml-2">
                  {allTimeStats.bestSession.netEV >= 0 ? "+" : ""}
                  {allTimeStats.bestSession.netEV.toFixed(2)} BB
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Trends */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Recent Trends</h2>
        <div className="space-y-4">
          {/* Accuracy Trend */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">Accuracy Trend (Last 10 Sessions)</span>
              <span className="text-gray-400 text-sm">
                Avg: {trends.accuracyTrend.length > 0 
                  ? (trends.accuracyTrend.reduce((a, b) => a + b, 0) / trends.accuracyTrend.length * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {trends.accuracyTrend.map((acc, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-600 rounded-t transition-all hover:bg-blue-500"
                  style={{ height: `${acc * 100}%` }}
                  title={`Session ${i + 1}: ${(acc * 100).toFixed(1)}%`}
                />
              ))}
            </div>
          </div>

          {/* EV Trend */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">EV Trend (Last 10 Sessions)</span>
              <span className="text-gray-400 text-sm">
                Avg: {trends.evTrend.length > 0
                  ? (trends.evTrend.reduce((a, b) => a + b, 0) / trends.evTrend.length).toFixed(2)
                  : 0} BB
              </span>
            </div>
            <div className="flex items-center gap-1 h-20 relative">
              <div className="absolute left-0 right-0 h-px bg-gray-600" style={{ top: "50%" }}></div>
              {trends.evTrend.map((ev, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    ev >= 0 ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"
                  }`}
                  style={{
                    height: `${Math.abs(ev) * 2}%`,
                    marginTop: ev >= 0 ? "auto" : "50%",
                    marginBottom: ev >= 0 ? "0" : "auto",
                  }}
                  title={`Session ${i + 1}: ${ev >= 0 ? "+" : ""}${ev.toFixed(2)} BB`}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Sessions */}
      {allTimeStats.recentSessions.length > 0 && (
        <Card className="p-6 bg-gray-800/50 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Sessions</h2>
          <div className="space-y-2">
            {allTimeStats.recentSessions.slice(0, 5).map((session, i) => (
              <div
                key={session.sessionId}
                className="p-3 bg-gray-900/50 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-gray-700 text-white">
                    Session {allTimeStats.recentSessions.length - i}
                  </Badge>
                  <span className="text-gray-300 text-sm">
                    {session.totalHands} hands • {session.totalDecisions} decisions
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${
                    session.accuracy >= 0.7 ? "text-green-400" :
                    session.accuracy >= 0.5 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {(session.accuracy * 100).toFixed(1)}%
                  </span>
                  <span className={`font-semibold ${
                    session.netEV >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {session.netEV >= 0 ? "+" : ""}{session.netEV.toFixed(2)} BB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

