"use client";

import { useState } from "react";
import { Send, ChevronDown } from "lucide-react";
import { TRACK_META } from "@/types";
import type { QuestTrack } from "@/types";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";

const LOCATION_OPTIONS = ["home", "city", "outdoors", "anywhere"] as const;
const ENERGY_OPTIONS = [
  { value: 1, label: "😌 Low key" },
  { value: 2, label: "🙂 Moderate" },
  { value: 3, label: "🔥 High energy" },
] as const;

export default function CreatePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    track: "fun" as QuestTrack,
    time_minutes: 60,
    location_type: "city" as typeof LOCATION_OPTIONS[number],
    energy_level: 2 as 1 | 2 | 3,
    tags: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/quests/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, user_id: user?.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Quest submitted!</h2>
        <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
          The queued team will review your sidequest. You&apos;ll get a notification once it&apos;s live.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 bg-stone-900 text-white px-6 py-3 rounded-2xl text-sm font-semibold"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-8">
      <div className="mb-6">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">queued</p>
        <h1 className="text-2xl font-bold text-stone-900">New sidequest</h1>
        <p className="text-stone-400 text-sm mt-1">
          All submissions go through manual review before going live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Quest title *
          </label>
          <input
            type="text"
            required
            maxLength={80}
            placeholder="e.g., Crash a local ballroom dancing social"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Description *
          </label>
          <textarea
            required
            rows={4}
            placeholder="What does this quest involve? What should someone expect? Any tips?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition resize-none"
          />
        </div>

        {/* Track */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Track *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TRACK_META) as [QuestTrack, typeof TRACK_META[QuestTrack]][]).map(([track, meta]) => (
              <button
                key={track}
                type="button"
                onClick={() => setForm({ ...form, track })}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all text-left",
                  form.track === track
                    ? `${meta.bg} ${meta.color} border-transparent shadow-sm`
                    : "bg-white border-stone-200 text-stone-600"
                )}
              >
                <span className="text-lg">{meta.emoji}</span>
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time estimate */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Time estimate (minutes) *
          </label>
          <div className="relative">
            <select
              value={form.time_minutes}
              onChange={(e) => setForm({ ...form, time_minutes: Number(e.target.value) })}
              className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:border-green-400 appearance-none"
            >
              {[30, 60, 90, 120, 150, 180, 240, 300, 480].map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Location type */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Where does this take place? *
          </label>
          <div className="flex gap-2 flex-wrap">
            {LOCATION_OPTIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setForm({ ...form, location_type: loc })}
                className={clsx(
                  "px-4 py-2 rounded-full text-sm font-medium border transition-all capitalize",
                  form.location_type === loc
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200"
                )}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Energy level */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Energy level *
          </label>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, energy_level: value })}
                className={clsx(
                  "flex-1 py-2.5 rounded-2xl text-sm font-medium border transition-all",
                  form.energy_level === value
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">
            Tags (comma separated)
          </label>
          <input
            type="text"
            placeholder="e.g., social, music, free, outdoors"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition"
          />
        </div>

        {/* Submit */}
        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-2xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 text-white rounded-3xl py-4 flex items-center justify-center gap-2 font-semibold shadow-md active:scale-[0.98] transition-transform mt-2 disabled:opacity-50"
        >
          <Send size={17} />
          {loading ? "Submitting..." : "Submit for review"}
        </button>

        <p className="text-xs text-stone-400 text-center leading-relaxed">
          Quests are manually reviewed before going live. No illegal or unsafe content.
          Repeated violations will result in a ban.
        </p>
      </form>
    </div>
  );
}
