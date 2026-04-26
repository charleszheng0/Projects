"use client";

import { useState, useEffect } from "react";
import { Sparkles, Clock, Home, Trees, Users, X, BookmarkPlus, Check } from "lucide-react";
import QuestCard from "@/components/QuestCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Quest, QuestTrack } from "@/types";
import { TRACK_META } from "@/types";
import clsx from "clsx";

const TIME_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "2 hrs", value: 120 },
  { label: "Half day", value: 240 },
];

const CONTEXT_OPTIONS = [
  { label: "At home", icon: Home, value: "home" },
  { label: "In the city", icon: Users, value: "city" },
  { label: "Outdoors", icon: Trees, value: "outdoors" },
];

type TrackFilter = QuestTrack | "all";

function RecommendModal({
  quest,
  onNext,
  onClose,
  onWant,
  onDone,
}: {
  quest: Quest | null;
  onNext: () => void;
  onClose: () => void;
  onWant: () => void;
  onDone: () => void;
}) {
  if (!quest) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-3">🗺️</p>
          <h2 className="text-xl font-bold text-stone-900 mb-2">No matches found</h2>
          <p className="text-stone-500 text-sm mb-5">Try updating your preferences in your profile, or check back as more quests get approved.</p>
          <button onClick={onClose} className="w-full bg-stone-900 text-white rounded-2xl py-3 font-semibold">Close</button>
        </div>
      </div>
    );
  }

  const meta = TRACK_META[quest.track];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-w-[430px] mx-auto max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full", meta.bg)}>
            <span>{meta.emoji}</span>
            <span className={clsx("text-sm font-semibold", meta.color)}>{meta.label}</span>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-stone-400" />
          </button>
        </div>

        <div className="px-6 pb-2">
          <h2 className="text-2xl font-bold text-stone-900 leading-snug mb-2">{quest.title}</h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-4">{quest.description}</p>

          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-stone-400">
              <Clock size={14} />
              <span className="text-sm">{quest.time_minutes < 60 ? `${quest.time_minutes}m` : `${quest.time_minutes / 60}h`}</span>
            </div>
            <span className="text-stone-300">·</span>
            <span className="text-sm text-stone-400 capitalize">{quest.location_type}</span>
            <span className="text-stone-300">·</span>
            <span className="text-sm text-stone-400">Energy {quest.energy_level}/3</span>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-24">
          <button
            onClick={onWant}
            className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-700 rounded-2xl py-4 font-semibold"
          >
            <BookmarkPlus size={18} />
            Save it
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-stone-900 text-white rounded-2xl py-4 font-semibold"
          >
            Next quest
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackFilter>("all");
  const [recommendedQuest, setRecommendedQuest] = useState<Quest | null | undefined>(undefined);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    async function fetchQuests() {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!error && data) setQuests(data as Quest[]);
      setLoading(false);
    }
    fetchQuests();
  }, []);

  const filtered = quests.filter((q) => {
    if (selectedTime && q.time_minutes > selectedTime) return false;
    if (selectedContext && q.location_type !== selectedContext && q.location_type !== "anywhere") return false;
    if (selectedTrack !== "all" && q.track !== selectedTrack) return false;
    return true;
  });

  async function handleRecommend() {
    setRecommending(true);
    const res = await fetch("/api/quests/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user?.id ?? null }),
    });
    const data = await res.json();
    setRecommendedQuest(data.quest ?? null);
    setRecommending(false);
  }

  async function handleNextRecommend() {
    const res = await fetch("/api/quests/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user?.id ?? null }),
    });
    const data = await res.json();
    setRecommendedQuest(data.quest ?? null);
  }

  async function markWant() {
    if (!user || !recommendedQuest) { setRecommendedQuest(undefined); return; }
    await supabase.from("user_quests").upsert(
      { user_id: user.id, quest_id: recommendedQuest.id, status: "want" },
      { onConflict: "user_id,quest_id" }
    );
    setRecommendedQuest(undefined);
  }

  return (
    <div className="px-4 pt-12 pb-4">
      {recommendedQuest !== undefined && (
        <RecommendModal
          quest={recommendedQuest}
          onNext={handleNextRecommend}
          onClose={() => setRecommendedQuest(undefined)}
          onWant={markWant}
          onDone={() => setRecommendedQuest(undefined)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">queued</p>
        <h1 className="text-2xl font-bold text-stone-900 leading-tight">
          What&apos;s your sidequest<br />
          <span className="text-green-600">today?</span>
        </h1>
      </div>

      {/* Give me a quest CTA */}
      <button
        onClick={handleRecommend}
        disabled={recommending}
        className="w-full bg-stone-900 text-white rounded-3xl py-4 px-6 flex items-center justify-between mb-6 active:scale-[0.98] transition-transform shadow-md disabled:opacity-70"
      >
        <div>
          <p className="font-bold text-base">{recommending ? "Finding your quest..." : "Give me a quest"}</p>
          <p className="text-stone-400 text-xs mt-0.5">Personalized for you</p>
        </div>
        <div className="bg-green-500 rounded-2xl p-2.5">
          <Sparkles size={20} className="text-white" />
        </div>
      </button>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={13} className="text-stone-400" />
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Time available</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedTime(selectedTime === opt.value ? null : opt.value)}
                className={clsx(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                  selectedTime === opt.value
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CONTEXT_OPTIONS.map(({ label, icon: Icon, value }) => (
              <button
                key={value}
                onClick={() => setSelectedContext(selectedContext === value ? null : value)}
                className={clsx(
                  "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                  selectedContext === value
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-600 border-stone-200"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedTrack("all")}
              className={clsx(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                selectedTrack === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"
              )}
            >
              All tracks
            </button>
            {(Object.entries(TRACK_META) as [QuestTrack, typeof TRACK_META[QuestTrack]][]).map(([track, meta]) => (
              <button
                key={track}
                onClick={() => setSelectedTrack(selectedTrack === track ? "all" : track)}
                className={clsx(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                  selectedTrack === track ? "bg-stone-900 text-white border-stone-900" : `bg-white border-stone-200 ${meta.color}`
                )}
              >
                {meta.emoji} {meta.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quest feed */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-1">
          {loading ? "Loading..." : `${filtered.length} quest${filtered.length !== 1 ? "s" : ""}`}
        </h2>
        {loading ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-4xl mb-3">⏳</p>
            <p className="font-medium">Loading quests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="font-medium">No quests match those filters</p>
            <p className="text-sm mt-1">Try adjusting your time or context</p>
          </div>
        ) : (
          filtered.map((quest) => <QuestCard key={quest.id} quest={quest} />)
        )}
      </div>
    </div>
  );
}
