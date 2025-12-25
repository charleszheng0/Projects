"use client";

import { GameStateSimulator } from "@/components/game-state-simulator";
import { Navigation } from "@/components/navigation";

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Game State Simulator</h1>
          <p className="text-gray-400">Simulate different actions to see their outcomes</p>
        </div>
        <Navigation />
        <GameStateSimulator />
      </div>
    </div>
  );
}

