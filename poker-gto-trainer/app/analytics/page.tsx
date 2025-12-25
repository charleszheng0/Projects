"use client";

import { SessionDashboard } from "@/components/session-dashboard";
import { Navigation } from "@/components/navigation";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Performance Analytics</h1>
          <p className="text-gray-400">Track your progress and identify areas for improvement</p>
        </div>
        <Navigation />
        <SessionDashboard />
      </div>
    </div>
  );
}

