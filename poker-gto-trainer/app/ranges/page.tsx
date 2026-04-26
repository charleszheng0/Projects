"use client";

import { RangeVisualizer } from "@/components/range-visualizer";
import { RangeSelector } from "@/components/range-selector";

export default function RangesPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">GTO Range Suite</h1>
          <p className="text-gray-400">Adaptive range table + interactive selector</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <RangeVisualizer />
          <RangeSelector defaultOpen={true} showToggle={false} />
        </div>
      </div>
    </div>
  );
}

