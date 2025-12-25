"use client";

import { useGameStore } from "@/store/game-store";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useState } from "react";

/**
 * Component to load custom opponent statistics from JSON
 * This is a utility component you can add to your settings page
 */
export function OpponentStatsLoader() {
  const { loadOpponentStats, opponentStats } = useGameStore();
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLoad = () => {
    try {
      setError(null);
      setSuccess(false);
      loadOpponentStats(jsonInput);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON format");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Load Custom Opponent Statistics</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Or Paste JSON Data
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"preflop": {"UTG": {"fold": 0.80, "call": 0.10, "raise": 0.10}}, ...}'
            className="w-full h-40 p-3 bg-gray-900 text-gray-100 border border-gray-600 rounded-md font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleLoad}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Load Statistics
        </Button>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-600 rounded-md text-red-200 text-sm">
            Error: {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-900/50 border border-green-600 rounded-md text-green-200 text-sm">
            Statistics loaded successfully!
          </div>
        )}

        <div className="text-xs text-gray-400 mt-4">
          <p>See <code className="bg-gray-900 px-1 py-0.5 rounded">lib/OPPONENT_STATS_README.md</code> for format details.</p>
          <p>Example file: <code className="bg-gray-900 px-1 py-0.5 rounded">lib/opponent-stats-example.json</code></p>
        </div>
      </div>
    </Card>
  );
}

