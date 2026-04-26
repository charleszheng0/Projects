"use client";

import { useState, useEffect } from "react";
import { Flame, Star, LogOut, Edit2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import QuestCard from "@/components/QuestCard";
import { TRACK_META, getRank, RANK_THRESHOLDS } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Quest, UserProfile } from "@/types";
import clsx from "clsx";

const TRACKS = [
  { key: "xp_money" as const, track: "money" as const },
  { key: "xp_health" as const, track: "health" as const },
  { key: "xp_eco" as const, track: "eco" as const },
  { key: "xp_fun" as const, track: "fun" as const },
];

export default function ProfilePage() {
  const { user: authUser, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [doneQuests, setDoneQuests] = useState<Quest[]>([]);
  const [wantQuests, setWantQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", bio: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    async function load() {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser!.id)
        .single();

      if (profileData) {
        setProfile(profileData as UserProfile);
        setEditForm({ username: profileData.username ?? "", bio: profileData.bio ?? "" });
      }

      const [{ data: doneUQ }, { data: wantUQ }] = await Promise.all([
        supabase.from("user_quests").select("quest_id").eq("user_id", authUser!.id).eq("status", "done").order("completed_at", { ascending: false }),
        supabase.from("user_quests").select("quest_id").eq("user_id", authUser!.id).eq("status", "want"),
      ]);

      const doneIds = doneUQ?.map((r: { quest_id: string }) => r.quest_id) ?? [];
      const wantIds = wantUQ?.map((r: { quest_id: string }) => r.quest_id) ?? [];

      const [{ data: doneQ }, { data: wantQ }] = await Promise.all([
        doneIds.length > 0 ? supabase.from("quests").select("*").in("id", doneIds) : Promise.resolve({ data: [] }),
        wantIds.length > 0 ? supabase.from("quests").select("*").in("id", wantIds) : Promise.resolve({ data: [] }),
      ]);

      setDoneQuests((doneQ as Quest[]) ?? []);
      setWantQuests((wantQ as Quest[]) ?? []);
      setLoading(false);
    }
    load();
  }, [authUser]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  async function handleSaveEdit() {
    if (!authUser) return;
    setSaving(true);
    await supabase.from("profiles").update({ username: editForm.username, bio: editForm.bio }).eq("id", authUser.id);
    setProfile((p) => p ? { ...p, username: editForm.username, bio: editForm.bio } : p);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-400 text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-400 text-sm">Profile not found.</p>
      </div>
    );
  }

  const rank = getRank(profile.xp_total ?? 0);
  const currentThreshold = RANK_THRESHOLDS.find((r) => r.label === rank)!;
  const nextThreshold = RANK_THRESHOLDS.find((r) => r.min > currentThreshold.min);
  const xpToNext = nextThreshold ? nextThreshold.min - (profile.xp_total ?? 0) : 0;
  const progressPct = nextThreshold
    ? (((profile.xp_total ?? 0) - currentThreshold.min) / (nextThreshold.min - currentThreshold.min)) * 100
    : 100;

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] mx-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Edit profile</h2>
              <button onClick={() => setEditing(false)}>
                <X size={20} className="text-stone-400" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Username</label>
              <input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 resize-none"
              />
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="w-full bg-stone-900 text-white rounded-3xl py-4 font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest">queued</p>
        <div className="flex items-center gap-4">
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition">
            <Edit2 size={13} /> Edit
          </button>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-3xl shadow-card border border-stone-100 p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700 shrink-0">
            {(profile.username ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-stone-900">@{profile.username ?? "unnamed"}</h1>
            {profile.bio && <p className="text-stone-500 text-sm mt-0.5 leading-relaxed">{profile.bio}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-700">{rank}</span>
              </div>
              <div className="flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded-full">
                <Flame size={13} className="text-red-500" />
                <span className="text-xs font-bold text-red-600">{profile.streak_days ?? 0} day streak</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-stone-500 font-medium">{(profile.xp_total ?? 0).toLocaleString()} xp total</span>
            {nextThreshold && (
              <span className="text-xs text-stone-400">{xpToNext} xp to {nextThreshold.label}</span>
            )}
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Track XP */}
      <div className="bg-white rounded-3xl shadow-card border border-stone-100 p-5">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">Track XP</h2>
        <div className="space-y-3">
          {TRACKS.map(({ key, track }) => {
            const meta = TRACK_META[track];
            const xp = (profile[key] as number) ?? 0;
            const pct = Math.min((xp / 500) * 100, 100);
            return (
              <div key={track}>
                <div className="flex justify-between items-center mb-1">
                  <span className={clsx("text-sm font-medium", meta.color)}>{meta.emoji} {meta.label}</span>
                  <span className="text-xs text-stone-400 font-medium">{xp} xp</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full", {
                      "bg-blue-500": track === "money",
                      "bg-green-500": track === "health",
                      "bg-emerald-500": track === "eco",
                      "bg-purple-500": track === "fun",
                    })}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed quests */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          ✅ Completed ({doneQuests.length})
        </h2>
        {doneQuests.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-6">No completed quests yet. Start swiping!</p>
        ) : (
          <div className="space-y-3">
            {doneQuests.map((q) => <QuestCard key={q.id} quest={q} compact />)}
          </div>
        )}
      </div>

      {/* Want to do */}
      <div className="pb-4">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          🎯 On my list ({wantQuests.length})
        </h2>
        {wantQuests.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-6">Nothing on your list yet.</p>
        ) : (
          <div className="space-y-3">
            {wantQuests.map((q) => <QuestCard key={q.id} quest={q} compact />)}
          </div>
        )}
      </div>
    </div>
  );
}
