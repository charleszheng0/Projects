"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";

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
      <main className="flex-1 flex items-center justify-center py-32 px-16">
        <div className="flex flex-col items-center gap-6 text-center max-w-3xl">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Poker GTO Trainer
          </h1>
          <p className="max-w-md text-lg leading-8 text-gray-400">
            Practice Game Theory Optimal preflop decisions. Get instant feedback on your poker strategy.
          </p>
          <div className="flex gap-4 mt-4">
            <Link href="/game">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg">
                Start Training
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
