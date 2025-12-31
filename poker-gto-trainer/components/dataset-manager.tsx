"use client";

import { useState, useEffect } from "react";
import { getDataset, HandHistoryRecord } from "@/lib/hand-history";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { BulkDataImporter } from "./bulk-data-importer";

export function DatasetManager() {
  const [dataset] = useState(() => getDataset());
  const [records, setRecords] = useState<HandHistoryRecord[]>([]);
  const [stats, setStats] = useState(dataset.getStatistics());
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv">("json");
  const [exportData, setExportData] = useState<string>("");

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    const allRecords = dataset.getAllRecords();
    setRecords(allRecords);
    setStats(dataset.getStatistics());
  };

  const handleExport = () => {
    if (selectedFormat === "json") {
      setExportData(dataset.exportToJSON());
    } else {
      setExportData(dataset.exportToCSV());
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], {
      type: selectedFormat === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poker-dataset-${Date.now()}.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = dataset.importFromJSON(content, true); // Merge with existing
        if (success) {
          loadRecords();
          alert("Dataset imported successfully!");
        } else {
          alert("Error importing dataset. Check console for details.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all records? This cannot be undone.")) {
      dataset.clear();
      loadRecords();
    }
  };

  const formatHand = (hand: HandHistoryRecord["playerHand"]) => {
    return `${hand.card1.rank}${hand.card1.suit[0]} ${hand.card2.rank}${hand.card2.suit[0]}`;
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Dataset Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Total Records</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Correct</div>
            <div className="text-2xl font-bold text-green-400">{stats.correct}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Incorrect</div>
            <div className="text-2xl font-bold text-red-400">{stats.incorrect}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Accuracy</div>
            <div className="text-2xl font-bold text-yellow-400">
              {(stats.accuracy * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-2">By Stage</h3>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(stats.byStage).map(([stage, count]) => (
              <Badge key={stage} variant="secondary" className="bg-gray-700 text-white">
                {stage}: {count}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-white mb-2">By Position</h3>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(stats.byPosition).map(([position, count]) => (
              <Badge key={position} variant="secondary" className="bg-gray-700 text-white">
                {position}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Bulk Import */}
      <BulkDataImporter />

      {/* Export/Import */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Export/Import Data</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Export Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={selectedFormat === "json"}
                  onChange={(e) => setSelectedFormat(e.target.value as "json" | "csv")}
                  className="mr-2"
                />
                <span className="text-gray-300">JSON</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={selectedFormat === "csv"}
                  onChange={(e) => setSelectedFormat(e.target.value as "json" | "csv")}
                  className="mr-2"
                />
                <span className="text-gray-300">CSV (for ML tools)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Generate Export
            </Button>
            {exportData && (
              <>
                <Button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Download File
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // Check if clipboard API is available
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(exportData);
                        alert("Copied to clipboard!");
                      } else {
                        // Fallback: use a temporary textarea element
                        const textarea = document.createElement("textarea");
                        textarea.value = exportData;
                        textarea.style.position = "fixed";
                        textarea.style.left = "-999999px";
                        document.body.appendChild(textarea);
                        textarea.select();
                        try {
                          document.execCommand("copy");
                          alert("Copied to clipboard!");
                        } catch (err) {
                          alert("Failed to copy. Please select and copy manually.");
                        }
                        document.body.removeChild(textarea);
                      }
                    } catch (err) {
                      console.error("Failed to copy to clipboard:", err);
                      alert("Failed to copy. Please select and copy manually.");
                    }
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  Copy to Clipboard
                </Button>
              </>
            )}
          </div>

          {exportData && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preview ({selectedFormat.toUpperCase()})
              </label>
              <textarea
                value={exportData}
                readOnly
                className="w-full h-40 p-3 bg-gray-900 text-gray-100 border border-gray-600 rounded-md font-mono text-xs overflow-auto"
              />
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Import JSON Data
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <Button
              onClick={handleClear}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All Records
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Records */}
      <Card className="p-6 bg-gray-800/50 border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">
          Recent Records ({records.length})
        </h2>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {records.slice(-20).reverse().map((record) => (
            <div
              key={record.id}
              className="p-3 bg-gray-900/50 rounded border border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2 items-center">
                  <Badge
                    variant={record.isCorrect ? "default" : "destructive"}
                    className={record.isCorrect ? "bg-green-600" : "bg-red-600"}
                  >
                    {record.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-700 text-white">
                    {record.gameStage}
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-700 text-white">
                    {record.playerPosition}
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(record.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div className="text-sm text-gray-300">
                <div>
                  <span className="font-semibold">Hand:</span> {formatHand(record.playerHand)}
                </div>
                <div>
                  <span className="font-semibold">Action:</span> {record.playerAction}
                  {record.betSizeBB && ` (${record.betSizeBB} BB)`}
                </div>
                <div>
                  <span className="font-semibold">Optimal:</span> {record.optimalActions.join(", ")}
                </div>
                {record.communityCards.length > 0 && (
                  <div>
                    <span className="font-semibold">Board:</span>{" "}
                    {record.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(" ")}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {records.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No records yet. Start playing to collect data!
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

