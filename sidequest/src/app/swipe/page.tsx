"use client";

import { useState, useEffect, useReducer } from "react";
import { X, Check, BookmarkPlus, Clock, MapPin, Zap, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { TRACK_META, ENERGY_LABELS } from "@/types";
import type { Quest } from "@/types";
import clsx from "clsx";

type Action =
  | { type: "LOAD"; quests: Quest[] }
  | { type: "NEXT" };

function reducer(state: Quest[], action: Action): Quest[] {
  if (action.type === "LOAD") return action.quests;
  if (action.type === "NEXT") return state.slice(1);
  return state;
}

interface RatingModalProps {
  quest: Quest;
  onSubmit: (rating: number, note: string) => void;
  onClose: () => void;
}

function RatingModal({ quest, onSubmit, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-w-[430px] mx-auto p-6">
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-5" />
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">Quest logged!</p>
        <h2 className="text-xl font-bold text-stone-900 mb-1">{quest.title}</h2>
        <p className="text-stone-400 text-sm mb-6">How was it?</p>

        <div className="flex justify-center gap-3 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(s)}
              className="text-4xl transition-transform active:scale-95"
            >
              <Star
                size={36}
                className={clsx(
                  "transition-colors",
                  s <= (hovered || rating) ? "fill-yellow-400 text-yellow-400" : "text-stone-200"
                )}
              />
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          placeholder="Add a note... (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-green-400 resize-none mb-4"
        />

        <button
          disabled={rating === 0}
          onClick={() => onSubmit(rating, note)}
          className="w-full bg-stone-900 text-white rounded-3xl py-4 font-semibold disabled:opacity-40 transition-all active:scale-[0.98] mb-3"
        >
          Save & continue
        </button>
        <button onClick={onClose} className="w-full text-stone-400 text-sm py-2">
          Skip rating
        </button>
      </div>
    </div>
  );
}

export default function SwipePage() {
  const { user } = useAuth();
  const [queue, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);
  const [animClass, setAnimClass] = useState("");
  const [counts, setCounts] = useState({ done: 0, want: 0, skip: 0 });
  const [ratingQuest, setRatingQuest] = useState<Quest | null>(null);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    async function loadQueue() {
      const { data: interacted } = await supabase
        .from("user_quests")
        .select("quest_id")
        .eq("user_id", user!.id);

      const interactedIds = new Set(interacted?.map((r: { quest_id: string }) => r.quest_id) ?? []);

      const { data: allQuests } = await supabase
        .from("quests")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      const unseen = (allQuests ?? []).filter((q: Quest) => !interactedIds.has(q.id));
      dispatch({ type: "LOAD", quests: unseen });
      setLoading(false);
    }
    loadQueue();
  }, [user]);

  function showAnim(anim: string, cb: () => void) {
    setAnimClass(anim);
    setTimeout(() => {
      setAnimClass("");
      dispatch({ type: "NEXT" });
      cb();
    }, 320);
  }

  async function handleSkip() {
    if (!user || !queue[0]) return;
    const quest = queue[0];
    showAnim("swipe-left", () => setCounts((c) => ({ ...c, skip: c.skip + 1 })));
    await supabase.from("user_quests").upsert(
      { user_id: user.id, quest_id: quest.id, status: "skipped" },
      { onConflict: "user_id,quest_id" }
    );
  }

  async function handleWant() {
    if (!user || !queue[0]) return;
    const quest = queue[0];
    showAnim("swipe-right", () => setCounts((c) => ({ ...c, want: c.want + 1 })));
    await supabase.from("user_quests").upsert(
      { user_id: user.id, quest_id: quest.id, status: "want" },
      { onConflict: "user_id,quest_id" }
    );
  }

  function handleDone() {
    if (!queue[0]) return;
    setRatingQuest(queue[0]);
  }

  async function submitRating(rating: number, note: string) {
    if (!user || !ratingQuest) return;
    const quest = ratingQuest;
    setRatingQuest(null);
    showAnim("swipe-right", () => setCounts((c) => ({ ...c, done: c.done + 1 })));

    const res = await fetch("/api/quests/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, quest_id: quest.id, rating, note }),
    });
    const data = await res.json();
    if (data.xp_earned) {
      setXpToast(data.xp_earned);
      setTimeout(() => setXpToast(null), 2500);
    }
  }

  async function skipRating() {
    if (!user || !ratingQuest) return;
    const quest = ratingQuest;
    setRatingQuest(null);
    showAnim("swipe-right", () => setCounts((c) => ({ ...c, done: c.done + 1 })));
    await supabase.from("user_quests").upsert(
      { user_id: user.id, quest_id: quest.id, status: "done", completed_at: new Date().toISOString() },
      { onConflict: "user_id,quest_id" }
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-400 text-sm">Loading quests...</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-6xl mb-4">🗺️</p>
        <h2 className="text-xl font-bold text-stone-900 mb-2">You&apos;ve seen everything!</h2>
        <p className="text-stone-500 text-sm mb-6">More quests drop as they get approved.</p>
        <div className="flex gap-3 text-sm font-medium flex-wrap justify-center">
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-2xl">✅ {counts.done} done</div>
          <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-2xl">🎯 {counts.want} want to</div>
          <div className="bg-stone-100 text-stone-600 px-4 py-2 rounded-2xl">⏭ {counts.skip} skipped</div>
        </div>
      </div>
    );
  }

  const current = queue[0];
  const meta = TRACK_META[current.track];

  return (
    <div className="flex flex-col min-h-screen px-4 pt-12 pb-4">
      {ratingQuest && (
        <RatingModal quest={ratingQuest} onSubmit={submitRating} onClose={skipRating} />
      )}

      {xpToast !== null && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg animate-bounce">
          +{xpToast} XP!
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">queued</p>
        <h1 className="text-2xl font-bold text-stone-900">Rate quests</h1>
        <p className="text-stone-400 text-sm mt-0.5">{queue.length} left to rate</p>
      </div>

      {/* Card stack */}
      <div className="relative flex justify-center mb-4">
        {queue.slice(1, 3).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-3xl border border-stone-100 shadow-card"
            style={{
              width: `calc(100% - ${(i + 1) * 16}px)`,
              height: 300,
              top: (i + 1) * 8,
              opacity: 1 - (i + 1) * 0.15,
              zIndex: 2 - i,
            }}
          />
        ))}

        <div className={clsx("relative z-10 w-full bg-white rounded-3xl shadow-card-hover border border-stone-100 p-6", animClass)}>
          <div className={clsx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4", meta.bg)}>
            <span className="text-lg">{meta.emoji}</span>
            <span className={clsx("text-sm font-semibold", meta.color)}>{meta.label}</span>
          </div>

          <h2 className="text-xl font-bold text-stone-900 mb-3 leading-snug">{current.title}</h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-5 line-clamp-3">{current.description}</p>

          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-stone-400">
              <Clock size={14} />
              <span className="text-sm">{current.time_minutes < 60 ? `${current.time_minutes}m` : `${current.time_minutes / 60}h`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <Zap size={14} />
              <span className="text-sm">{ENERGY_LABELS[current.energy_level]}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <MapPin size={14} />
              <span className="text-sm capitalize">{current.location_type}</span>
            </div>
          </div>

          {current.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {current.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-500">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-4 border-t border-stone-100">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium text-stone-600">{(current.community_rating ?? 0).toFixed(1)}</span>
            <span className="text-xs text-stone-400">({current.rating_count ?? 0} ratings)</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-5 mt-2">
        <button
          onClick={handleSkip}
          className="w-14 h-14 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center shadow-card hover:border-red-300 hover:bg-red-50 transition-all active:scale-95"
        >
          <X size={22} className="text-stone-400" />
        </button>
        <button
          onClick={handleWant}
          className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center shadow-lg hover:bg-stone-800 transition-all active:scale-95"
        >
          <BookmarkPlus size={22} className="text-white" />
        </button>
        <button
          onClick={handleDone}
          className="w-14 h-14 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center shadow-card hover:border-green-400 hover:bg-green-50 transition-all active:scale-95"
        >
          <Check size={22} className="text-stone-400" />
        </button>
      </div>
      <div className="flex justify-center gap-10 mt-2">
        <span className="text-xs text-stone-400">Skip</span>
        <span className="text-xs text-stone-400">Want to</span>
        <span className="text-xs text-stone-400">Done it</span>
      </div>
    </div>
  );
}
