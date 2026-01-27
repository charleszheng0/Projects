import { useEffect, useState } from "react";
import { reputationSeed } from "../data/mockData";
import { storage } from "../utils/storage";

const ReputationDisplay = ({ userId }: { userId: string }) => {
  const [reputation, setReputation] = useState<any>(null);

  useEffect(() => {
    loadReputation();
  }, [userId]);

  async function loadReputation() {
    const stored = await storage.get(`reputation_${userId}`);
    if (stored?.value) {
      setReputation(JSON.parse(stored.value));
      return;
    }
    setReputation(reputationSeed);
  }

  function getScoreColor(score: number) {
    if (score >= 90) return "#10b981";
    if (score >= 75) return "#3b82f6";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  }

  function getScoreLabel(score: number) {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Improvement";
  }

  if (!reputation) return <div>Loading reputation...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">
          Accountability Scores
        </h3>
        <span className="text-xs text-slate-400">
          Updated {new Date(reputation.lastUpdated).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-4">
        {[
          {
            label: "💬 Communication",
            score: reputation.ghostingScore,
            note: `${getScoreLabel(reputation.ghostingScore)} communicator`,
          },
          {
            label: "✓ Authenticity",
            score: reputation.authenticityScore,
            note: "Profile accuracy verified by dates",
          },
          {
            label: "⚡ Responsiveness",
            score: reputation.responseScore,
            note: `Avg response time: ${reputation.metrics.avgResponseTime}`,
          },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between mb-1 text-sm">
              <span className="font-medium text-slate-600">{item.label}</span>
              <span
                className="font-bold"
                style={{ color: getScoreColor(item.score) }}
              >
                {item.score}/100
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${item.score}%`,
                  backgroundColor: getScoreColor(item.score),
                }}
              />
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              {item.note}
            </span>
          </div>
        ))}
      </div>

      {reputation.badges.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Earned Badges
          </h4>
          <div className="flex flex-wrap gap-2">
            {reputation.badges.map((badge: any) => (
              <div
                key={badge.name}
                className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                title={badge.description}
              >
                <span className="text-lg mr-2">{badge.icon}</span>
                <span className="text-xs font-medium text-slate-700">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-3 rounded-lg text-center">
          <span className="block text-xl font-bold text-slate-900">
            {reputation.metrics.conversationsCompleted}
          </span>
          <span className="text-xs text-slate-500">
            Conversations Ended Properly
          </span>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg text-center">
          <span className="block text-xl font-bold text-slate-900">
            {reputation.metrics.datesAttended}/{reputation.metrics.datesScheduled}
          </span>
          <span className="text-xs text-slate-500">Dates Attended</span>
        </div>
      </div>

      {reputation.warnings.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg text-sm text-rose-700">
          <h4 className="font-semibold mb-2">Warnings</h4>
          <ul className="list-disc list-inside space-y-1">
            {reputation.warnings.map((warning: any, idx: number) => (
              <li key={idx}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">
          Recent Anonymous Feedback ({reputation.recentFeedback.length})
        </summary>
        <div className="mt-3 space-y-2">
          {reputation.recentFeedback.map((fb: any, idx: number) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-wide">{fb.category}</span>
                <span>{new Date(fb.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-700 mt-2">{fb.comment}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default ReputationDisplay;
