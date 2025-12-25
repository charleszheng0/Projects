"use client";

import { DatasetManager } from "@/components/dataset-manager";
import { Navigation } from "@/components/navigation";

export default function DatasetPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Dataset Manager</h1>
          <p className="text-gray-400">View, export, and manage your poker training data</p>
        </div>

        <Navigation />

        {/* Dataset Manager Component */}
        <DatasetManager />
      </div>
    </div>
  );
}

