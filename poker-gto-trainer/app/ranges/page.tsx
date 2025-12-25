"use client";

import { RangeVisualizer } from "@/components/range-visualizer";
import { Navigation } from "@/components/navigation";

export default function RangesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">GTO Range Visualizer</h1>
          <p className="text-gray-400">Explore optimal hand ranges by position and stack depth</p>
        </div>
        <Navigation />
        <RangeVisualizer />
      </div>
    </div>
  );
}

