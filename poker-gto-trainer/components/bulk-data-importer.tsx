"use client";

import { useState } from "react";
import { importBulkData, validateBulkData, BulkHandData } from "@/lib/bulk-data-import";
import { getDataset } from "@/lib/hand-history";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function BulkDataImporter() {
  const [jsonInput, setJsonInput] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
        setJsonInput(content);
        validateData(content);
      };
      reader.onerror = () => {
        alert("Error reading file");
      };
      reader.readAsText(file);
    }
  };

  const validateData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      const validationResult = validateBulkData(parsed);
      setValidation(validationResult);
    } catch (error) {
      setValidation({
        valid: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`],
        warnings: [],
      });
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      alert("Please provide JSON data or upload a file");
      return;
    }

    setImporting(true);
    setResult(null);
    setProgress(null);

    try {
      const result = importBulkData(jsonInput, {
        skipInvalid: true,
        onProgress: (processed, total) => {
          setProgress({ processed, total });
        },
      });

      setResult(result);
      
      // Reload dataset to show new records
      const dataset = getDataset();
      const stats = dataset.getStatistics();
      
      alert(
        `Import complete!\n` +
        `Successfully imported: ${result.success} records\n` +
        `Failed: ${result.failed} records\n` +
        `Total records in dataset: ${stats.total}`
      );
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setFileContent(null);
    setResult(null);
    setValidation(null);
    setProgress(null);
  };

  const loadTemplate = () => {
    // Load template from file (you can fetch this or include it)
    const template = `[
  {
    "handId": "hand-001",
    "playerHand": "As Ks",
    "playerPosition": "BTN",
    "numPlayers": 6,
    "playerSeat": 5,
    "gameStage": "preflop",
    "communityCards": [],
    "pot": 1.5,
    "currentBet": 2,
    "playerStackBB": 100,
    "playerAction": "raise",
    "betSizeBB": 5,
    "optimalActions": ["raise", "call"],
    "isCorrect": true,
    "feedback": "Strong hand, raising is optimal"
  }
]`;
    setJsonInput(template);
    validateData(template);
  };

  return (
    <Card className="p-6 bg-gray-800/50 border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-4">Bulk Data Import</h2>
      <p className="text-gray-400 mb-6">
        Import large datasets of poker hands. Supports JSON format with flexible field formats.
        See <code className="bg-gray-900 px-1 py-0.5 rounded text-xs">data/bulk-import-template.json</code> for format examples.
      </p>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload JSON File (Recommended for large datasets)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          {fileContent && (
            <div className="mt-2 text-sm text-green-400">
              ✓ File loaded ({fileContent.length.toLocaleString()} characters)
            </div>
          )}
        </div>

        {/* JSON Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Or Paste JSON Data
            </label>
            <Button
              onClick={loadTemplate}
              variant="outline"
              size="sm"
              className="text-xs border-gray-600 text-gray-300"
            >
              Load Template
            </Button>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              if (e.target.value.trim()) {
                validateData(e.target.value);
              } else {
                setValidation(null);
              }
            }}
            placeholder='[{"handId": "hand-001", "playerHand": "As Ks", "playerPosition": "BTN", ...}]'
            className="w-full h-64 p-3 bg-gray-900 text-gray-100 border border-gray-600 rounded-md font-mono text-sm"
          />
        </div>

        {/* Validation Results */}
        {validation && (
          <div className={`p-4 rounded-md border ${
            validation.valid
              ? "bg-green-900/30 border-green-600"
              : "bg-red-900/30 border-red-600"
          }`}>
            <div className="font-semibold text-white mb-2">
              {validation.valid ? "✓ Validation Passed" : "✗ Validation Failed"}
            </div>
            {validation.errors.length > 0 && (
              <div className="mb-2">
                <div className="text-red-300 text-sm font-semibold mb-1">Errors:</div>
                <ul className="list-disc list-inside text-red-200 text-xs space-y-1">
                  {validation.errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {validation.errors.length > 10 && (
                    <li className="text-gray-400">... and {validation.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                <div className="text-yellow-300 text-sm font-semibold mb-1">Warnings:</div>
                <ul className="list-disc list-inside text-yellow-200 text-xs space-y-1">
                  {validation.warnings.slice(0, 5).map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                  {validation.warnings.length > 5 && (
                    <li className="text-gray-400">... and {validation.warnings.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {progress && importing && (
          <div className="p-4 bg-blue-900/30 border border-blue-600 rounded-md">
            <div className="text-blue-300 text-sm mb-2">
              Importing... {progress.processed} / {progress.total} records
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Import Results */}
        {result && (
          <div className={`p-4 rounded-md border ${
            result.failed === 0
              ? "bg-green-900/30 border-green-600"
              : "bg-yellow-900/30 border-yellow-600"
          }`}>
            <div className="font-semibold text-white mb-2">Import Complete</div>
            <div className="text-sm space-y-1">
              <div className="text-green-300">✓ Successfully imported: {result.success} records</div>
              {result.failed > 0 && (
                <div className="text-yellow-300">⚠ Failed: {result.failed} records</div>
              )}
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-yellow-300 cursor-pointer text-xs">
                    View errors ({result.errors.length})
                  </summary>
                  <ul className="list-disc list-inside text-yellow-200 text-xs mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!jsonInput.trim() || importing || (validation && !validation.valid)}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? "Importing..." : "Import Data"}
          </Button>
          <Button
            onClick={handleClear}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            Clear
          </Button>
        </div>

        {/* Format Help */}
        <div className="border-t border-gray-700 pt-4">
          <details className="text-sm text-gray-400">
            <summary className="cursor-pointer font-semibold text-gray-300 mb-2">
              Format Requirements
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <strong>Required fields:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li><code>playerHand</code> - String like "As Ks" or Hand object</li>
                  <li><code>playerPosition</code> - "UTG", "MP", "CO", "BTN", "SB", "BB"</li>
                  <li><code>numPlayers</code> - Number (2-9)</li>
                  <li><code>gameStage</code> - "preflop", "flop", "turn", "river"</li>
                  <li><code>pot</code> - Number (pot size in BB)</li>
                  <li><code>playerAction</code> - "fold", "call", "bet", "raise", "check"</li>
                </ul>
              </div>
              <div>
                <strong>Optional fields:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li><code>handId</code> - Unique identifier (auto-generated if missing)</li>
                  <li><code>communityCards</code> - Array like ["As", "Ks", "Qh"] or Card[]</li>
                  <li><code>optimalActions</code> - Array of optimal actions</li>
                  <li><code>isCorrect</code> - Boolean (defaults to true)</li>
                  <li><code>betSizeBB</code> - Number (if action is bet/raise)</li>
                  <li><code>features</code> - ML features object</li>
                </ul>
              </div>
              <div className="mt-2">
                <strong>Example:</strong>
                <pre className="bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
{`{
  "playerHand": "As Ks",
  "playerPosition": "BTN",
  "numPlayers": 6,
  "gameStage": "preflop",
  "pot": 1.5,
  "currentBet": 2,
  "playerAction": "raise",
  "betSizeBB": 5
}`}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}

