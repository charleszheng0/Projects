"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { Play, TrendingUp, Target, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Top Bar with Navigation */}
      <div className="bg-[#0f0f0f] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-white">Poker GTO Trainer</h1>
              <Navigation />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-8 md:px-16">
        <div className="flex flex-col items-center gap-8 text-center max-w-4xl w-full">
          {/* Hero Section */}
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight text-white">
              Poker GTO Trainer
            </h1>
            <p className="max-w-2xl text-lg md:text-xl leading-8 text-gray-300">
              Master Game Theory Optimal poker strategy with realistic gameplay. 
              Practice preflop and postflop decisions against solver-driven opponents.
            </p>
            <div className="flex gap-4 mt-2">
              <Link href="/game">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold shadow-lg shadow-green-600/50 transition-all hover:scale-105">
                  <Play className="mr-2 h-5 w-5" />
                  Start Training
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-green-600/50 transition-colors">
              <Target className="h-8 w-8 text-green-500 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">GTO Strategy</h3>
              <p className="text-sm text-gray-400">
                Learn optimal play with solver-driven frequencies and EV calculations
              </p>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-green-600/50 transition-colors">
              <TrendingUp className="h-8 w-8 text-green-500 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Realistic Gameplay</h3>
              <p className="text-sm text-gray-400">
                Practice against AI opponents that follow equilibrium strategies
              </p>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-green-600/50 transition-colors">
              <BarChart3 className="h-8 w-8 text-green-500 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">Instant Feedback</h3>
              <p className="text-sm text-gray-400">
                Get detailed analysis on every decision with EV loss and mistake classification
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
