import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { matchSeed } from "../data/mockData";
import { storage } from "../utils/storage";

export default function Matches() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    const loadMatches = async () => {
      const stored = await storage.get("matches");
      if (stored?.value) {
        setMatches(JSON.parse(stored.value));
        return;
      }
      await storage.set("matches", JSON.stringify(matchSeed));
      setMatches(matchSeed);
    };
    loadMatches();
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          My Matches
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Active connections
        </h1>
        <p className="text-slate-600">
          Keep conversations accountable. End respectfully or continue to build
          trust.
        </p>
      </section>

      <div className="grid gap-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {match.name}
              </h2>
              <p className="text-sm text-slate-500">{match.lastMessage}</p>
              <p className="text-xs text-slate-400 mt-1">
                Status: {match.status} · Updated{" "}
                {new Date(match.lastUpdated).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to={`/profile/${match.userId}`}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                View profile
              </Link>
              <Link
                to={`/chat/${match.id}`}
                className="px-4 py-2 rounded-full bg-[#1e40af] text-white text-sm font-semibold hover:opacity-90"
              >
                Open chat
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
